import axios from 'axios';
import useSWR from 'swr';
import dayjs from 'dayjs';
import { useEffect, useRef, useCallback } from 'react';
import type { ApiResponse, ParsedCityData, WeeklyForecastDay, RealtimeWindData } from '../types/weather';
import { CITIES } from '../utils/cities';
import { parseCityApiResponse, parseWeeklyForecastResponse } from '../utils/parser';
import {
  readCache,
  writeCache,
  isCacheValid,
  msUntilNextWindow,
  isRateLimited,
  setRateLimitCooldown,
} from '../utils/cache';
import { useWeatherStore } from '../store/weatherStore';

const DEFAULT_AUTH_KEY = 'CWA-AD03D85A-1599-454E-A5F6-DA8F0C1E2EDA';

export function getCwaApiKey(): string {
  try {
    return (
      localStorage.getItem('cwa_api_key') ||
      import.meta.env.VITE_CWA_API_KEY ||
      DEFAULT_AUTH_KEY
    );
  } catch {
    return DEFAULT_AUTH_KEY;
  }
}

let weeklyInFlightPromise: Promise<Record<string, WeeklyForecastDay[]>> | null = null;

/** 拉取全台 22 縣市未來 1 週逐 12 小時預報 (F-D0047-091, 僅 1 個輕量請求，支援 In-flight 去重) */
export async function fetchWeeklyForecast(apiKey: string): Promise<Record<string, WeeklyForecastDay[]>> {
  if (weeklyInFlightPromise) {
    return weeklyInFlightPromise;
  }

  weeklyInFlightPromise = (async () => {
    try {
      const url = `https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-D0047-091?Authorization=${apiKey}`;
      const res = await axios.get(url, { timeout: 8000 });
      return parseWeeklyForecastResponse(res.data);
    } catch (err: any) {
      console.warn('[CWA API] 抓取一週預報 (F-D0047-091) 異常:', err?.message || err);
      return readCache()?.weeklyForecasts ?? {};
    } finally {
      weeklyInFlightPromise = null;
    }
  })();

  return weeklyInFlightPromise;
}

/** 各縣市對應氣象署無人/有人標準測站名稱 (O-A0001-001) */
export const CITY_STATION_MAP: Record<string, string> = {
  '基隆市': '基隆',
  '臺北市': '臺北',
  '新北市': '新北',
  '桃園市': '桃園',
  '新竹市': '新竹',
  '新竹縣': '新竹',
  '苗栗縣': '苗栗',
  '臺中市': '臺中',
  '彰化縣': '員林',
  '南投縣': '南投',
  '雲林縣': '斗六',
  '嘉義市': '嘉義',
  '嘉義縣': '嘉義',
  '臺南市': '臺南',
  '高雄市': '高雄',
  '屏東縣': '屏東',
  '宜蘭縣': '宜蘭',
  '花蓮縣': '花蓮',
  '臺東縣': '臺東',
  '澎湖縣': '澎湖',
  '金門縣': '金門',
  '連江縣（馬祖）': '馬祖',
};

export interface RealtimeObservationsPayload {
  temps: Record<string, string>;
  winds: Record<string, RealtimeWindData>;
  realtimeWeather: Record<string, import('../types/weather').RealtimeStationWeather>;
  townshipStations: Record<string, import('../types/weather').RealtimeStationWeather[]>;
}

let realtimeInFlightPromise: Promise<RealtimeObservationsPayload> | null = null;

function degreeToWindDirection(deg: number): string {
  if (isNaN(deg) || deg < 0) return '無風';
  const dirs = [
    '北風', '北北東風', '東北風', '東北東風',
    '東風', '東南東風', '東南風', '南南東風',
    '南風', '南南西風', '西南風', '西南西風',
    '西風', '西北西風', '西北風', '北北西風'
  ];
  const idx = Math.round(deg / 22.5) % 16;
  return dirs[idx];
}

function degreeToWindCardinal(deg: number): string {
  if (isNaN(deg) || deg < 0) return '--';
  const dirs = [
    '北', '北北東', '東北', '東北東',
    '東', '東南東', '東南', '南南東',
    '南', '南南西', '西南', '西南西',
    '西', '西北西', '西北', '北北西'
  ];
  const idx = Math.round(deg / 22.5) % 16;
  return dirs[idx];
}

function windSpeedToBeaufort(speedMs: number): string {
  if (speedMs < 0.3) return '0';
  if (speedMs < 1.6) return '1';
  if (speedMs < 3.4) return '2';
  if (speedMs < 5.5) return '3';
  if (speedMs < 8.0) return '4';
  if (speedMs < 10.8) return '5';
  if (speedMs < 13.9) return '6';
  if (speedMs < 17.2) return '7';
  if (speedMs < 20.8) return '8';
  if (speedMs < 24.5) return '9';
  if (speedMs < 28.5) return '10';
  if (speedMs < 32.7) return '11';
  return '12';
}

function getStationScore(st: any, town: string): number {
  let score = 0;
  const id = String(st.StationId || '');
  const name = String(st.StationName || '');
  const cleanTown = town.replace(/區|鄉|鎮|市$/, '');

  // 1. 站名與鄉鎮名稱吻合 (如 "七堵", "暖暖", "八斗子", "大武崙")
  if (name === town || name === cleanTown) score += 80;
  else if (name.includes(cleanTown)) score += 40;

  // 2. 有人標準氣象署測站 (46xxx)
  // 注意：只有非外海孤島的有人的測站才加分，如果是外海孤島（如彭佳嶼、東吉島、蘭嶼、彭佳嶼）不可優先於本島生活圈
  const isIsolatedIsland = name.includes('彭佳嶼') || name.includes('基隆嶼') || name.includes('花瓶嶼') || name.includes('棉花嶼') || name.includes('東吉島') || name.includes('東沙') || name.includes('南沙');
  if (isIsolatedIsland) {
    score -= 300; // 絕對降權，優先生活圈測站（例如八斗子）
  } else if (id.startsWith('46')) {
    score += 50;
  }

  // 3. 一般離島外海測站降權 (但非孤島如澎湖本島除外)
  if (name.includes('嶼') && !isIsolatedIsland) score -= 30;

  // 4. 排除高速公路或特種監測站（非一般生活氣候）
  if (name.includes('國一') || name.includes('國三') || name.includes('國道')) score -= 60;
  if (name.includes('林道') || name.includes('苗圃') || name.includes('橋') || name.includes('收費站')) score -= 40;
  return score;
}

/** 拉取全台各縣市鄉鎮即測站點真實即時氣溫與風況 (O-A0001-001, 僅 1 個輕量請求，保留小數點後 1 位) */
export async function fetchRealtimeObservations(apiKey: string): Promise<RealtimeObservationsPayload> {
  if (realtimeInFlightPromise) {
    return realtimeInFlightPromise;
  }

  realtimeInFlightPromise = (async () => {
    try {
      // 呼叫全台 870+ 自動氣象站資料，耗時僅約 180ms
      const url = `https://opendata.cwa.gov.tw/api/v1/rest/datastore/O-A0001-001?Authorization=${apiKey}`;
      const res = await axios.get(url, { timeout: 8000 });
      const stations: any[] = res.data?.records?.Station ?? [];

      const townScoreMap = new Map<string, { score: number; weatherItem: import('../types/weather').RealtimeStationWeather }>();
      const townAllStationsMap = new Map<string, import('../types/weather').RealtimeStationWeather[]>();
      const stationMap = new Map<string, import('../types/weather').RealtimeStationWeather>();

      stations.forEach((st) => {
        const c = st.GeoInfo?.CountyName;
        const t = st.GeoInfo?.TownName;
        const name = st.StationName;
        const id = st.StationId || '';
        const airTemp = st.WeatherElement?.AirTemperature;
        if (airTemp === undefined || airTemp === null || airTemp === '-99' || airTemp === -99) return;
        const tempNum = parseFloat(String(airTemp));
        if (isNaN(tempNum)) return;
        // 氣溫保留小數點後 1 位（不四捨五入）
        const tempStr = tempNum.toFixed(1);

        // 解析實測風速與風向
        let windData: RealtimeWindData | undefined;
        const windSpeedRaw = st.WeatherElement?.WindSpeed;
        const windDirRaw = st.WeatherElement?.WindDirection;
        if (windSpeedRaw !== undefined && windSpeedRaw !== null && windSpeedRaw !== '-99' && windSpeedRaw !== -99) {
          const speedNum = parseFloat(String(windSpeedRaw));
          if (!isNaN(speedNum) && speedNum >= 0) {
            const dirNum = (windDirRaw !== undefined && windDirRaw !== null && windDirRaw !== '-99' && windDirRaw !== -99)
              ? parseFloat(String(windDirRaw))
              : 0;
            const validDir = !isNaN(dirNum) && dirNum >= 0 ? dirNum : 0;
            windData = {
              windSpeed: speedNum.toFixed(1), // 保留小數點後 1 位
              windDirection: degreeToWindDirection(validDir),
              windCardinal: degreeToWindCardinal(validDir),
              windDegree: Math.round(validDir),
              beaufortScale: windSpeedToBeaufort(speedNum),
              stationName: name,
            };
          }
        }

        // 解析現場天氣現象、雨量、相對濕度
        const rawWx = st.WeatherElement?.Weather;
        const wxStr = (rawWx && rawWx !== '-99' && rawWx !== 'None') ? String(rawWx).trim() : undefined;
        const rawPrecip = st.WeatherElement?.Now?.Precipitation;
        const rainNow = (rawPrecip !== undefined && rawPrecip !== null && rawPrecip !== '-99') ? parseFloat(String(rawPrecip)) : 0;
        const rawRh = st.WeatherElement?.RelativeHumidity;
        const humStr = (rawRh !== undefined && rawRh !== null && rawRh !== '-99') ? String(rawRh) : undefined;

        const stationWeatherItem: import('../types/weather').RealtimeStationWeather = {
          temp: tempStr,
          wind: windData,
          weather: wxStr,
          rainNow: isNaN(rainNow) ? 0 : rainNow,
          humidity: humStr,
          stationName: name,
          stationId: id,
        };

        if (name) {
          stationMap.set(name, stationWeatherItem);
        }

        // 以「縣市_鄉鎮市區」為最小顆粒度挑選最佳代表測站與收集候選測站
        if (c && t) {
          const key = `${c}_${t}`;
          if (!townAllStationsMap.has(key)) {
            townAllStationsMap.set(key, []);
          }
          townAllStationsMap.get(key)!.push(stationWeatherItem);

          const score = getStationScore(st, t);
          if (!townScoreMap.has(key) || (townScoreMap.get(key)!.score < score)) {
            townScoreMap.set(key, { score, weatherItem: stationWeatherItem });
          }
        }
      });

      const temps: Record<string, string> = {};
      const winds: Record<string, RealtimeWindData> = {};
      const realtimeWeather: Record<string, import('../types/weather').RealtimeStationWeather> = {};
      const townshipStations: Record<string, import('../types/weather').RealtimeStationWeather[]> = {};

      // 1. 寫入鄉鎮市區級顆粒度（如 基隆市_中正區 -> 八斗子）
      for (const [key, val] of townScoreMap.entries()) {
        temps[key] = val.weatherItem.temp;
        if (val.weatherItem.wind) {
          winds[key] = val.weatherItem.wind;
        }
        realtimeWeather[key] = val.weatherItem;
      }

      for (const [key, list] of townAllStationsMap.entries()) {
        townshipStations[key] = list;
      }

      // 2. 寫入縣市代表站作為 fallback 保底
      for (const [cityName, stName] of Object.entries(CITY_STATION_MAP)) {
        const item = stationMap.get(stName);
        if (item) {
          temps[cityName] = item.temp;
          if (item.wind) {
            winds[cityName] = item.wind;
          }
          realtimeWeather[cityName] = item;
        }
      }

      return { temps, winds, realtimeWeather, townshipStations };
    } catch (err: any) {
      console.warn('[CWA API] 抓取即測資料 (O-A0001-001) 異常:', err?.message || err);
      const cache = readCache();
      return {
        temps: cache?.realtimeTemps ?? {},
        winds: cache?.realtimeWinds ?? {},
        realtimeWeather: cache?.realtimeWeather ?? {},
        townshipStations: cache?.townshipStations ?? {},
      };
    } finally {
      realtimeInFlightPromise = null;
    }
  })();

  return realtimeInFlightPromise;
}

/** 分批拉取 22 個縣市，避免瞬間 22 併發觸發氣象署 429 限流 */
async function fetchAllCities(): Promise<ParsedCityData[]> {
  const existingCache = readCache()?.cities ?? [];
  const existingMap = new Map(existingCache.map((c) => [c.cityName, c]));
  const apiKey = getCwaApiKey();

  // 若處於 429 冷卻保護期，且本地已有快取，直接使用快取防止連續受罰
  if (isRateLimited() && existingCache.length > 0) {
    console.info('[CWA API] 處於 429 限流冷卻保護中，使用本地快取資料');
    return existingCache;
  }

  const BATCH_SIZE = 3;
  const results: ParsedCityData[] = [];
  let hasFailed = false;

  for (let i = 0; i < CITIES.length; i += BATCH_SIZE) {
    const batch = CITIES.slice(i, i + BATCH_SIZE);
    const batchPromises = batch.map(async (city) => {
      try {
        const url = `https://opendata.cwa.gov.tw/api/v1/rest/datastore/${city.id}?Authorization=${apiKey}`;
        const res = await axios.get<ApiResponse>(url, { timeout: 8000 });
        return parseCityApiResponse(res.data, city.name, city.id);
      } catch (err: any) {
        hasFailed = true;
        const status = err?.response?.status;
        if (status === 429 || String(err).includes('429')) {
          console.warn('[CWA API] 觸發氣象署 429 限流，啟動 5 分鐘冷卻保護');
          setRateLimitCooldown(5);
        }
        console.warn(`[CWA API] 抓取 ${city.name} 失敗 (${status || err.message})，回退快取`);
        // 若遭遇 429 或網路異常，優雅降級：使用該縣市本地已有的快取資料
        const cached = existingMap.get(city.name);
        if (cached) {
          return cached;
        }
        throw err;
      }
    });

    try {
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    } catch (batchErr) {
      // 若該批次有失敗且無快取保底才中斷，若有部分成功則繼續保留
      if (existingCache.length === 0) {
        throw batchErr;
      }
    }

    // 批次間微間隔 250ms，平滑流量防止 WAF 429
    if (i + BATCH_SIZE < CITIES.length) {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }

  // 若部分成功或有快取，合併出完整 22 縣市資料
  if (results.length > 0) {
    const mergedMap = new Map(existingMap);
    results.forEach((c) => mergedMap.set(c.cityName, c));
    const mergedList = CITIES.map((c) => mergedMap.get(c.name)).filter(Boolean) as ParsedCityData[];
    if (mergedList.length > 0) {
      return mergedList;
    }
  }

  if (hasFailed && existingCache.length > 0) {
    return existingCache;
  }

  return results;
}

interface WeatherFetchResult {
  cities: ParsedCityData[];
  weeklyForecasts: Record<string, WeeklyForecastDay[]>;
  realtimeTemps: Record<string, string>;
  realtimeWinds: Record<string, RealtimeWindData>;
}

async function fetchAllWeatherData(): Promise<WeatherFetchResult> {
  const apiKey = getCwaApiKey();
  const existingCache = readCache();
  const existingWeekly = existingCache?.weeklyForecasts ?? {};
  const existingRealtime = existingCache?.realtimeTemps ?? {};
  const existingWinds = existingCache?.realtimeWinds ?? {};

  // 同步平行拉取 1 週天氣預報、全台 870+ 測站即測真實溫度與風速風向、逐 3 小時 22 縣市資料
  const weeklyPromise = fetchWeeklyForecast(apiKey);
  const realtimePromise = fetchRealtimeObservations(apiKey);
  const cities = await fetchAllCities();
  const weeklyForecasts = await weeklyPromise;
  const realtimeObs = await realtimePromise;

  return {
    cities,
    weeklyForecasts: Object.keys(weeklyForecasts).length > 0 ? weeklyForecasts : existingWeekly,
    realtimeTemps: Object.keys(realtimeObs.temps).length > 0 ? realtimeObs.temps : existingRealtime,
    realtimeWinds: Object.keys(realtimeObs.winds).length > 0 ? realtimeObs.winds : existingWinds,
  };
}

/** 依據 Storage 時間戳記與 429 狀態判斷是否發送網路請求 */
function getSWRKey(): string | null {
  const cache = readCache();

  // 1. 與 storage 內的 fetchedAt 比對：若快取仍在有效期內（60 分鐘內或當前 6hr 視窗），完全不打 API！
  if (cache && isCacheValid(cache)) {
    return null;
  }

  // 2. 若當前正處於 429 限流冷卻保護中，且本地已有快取可用，不打 API
  if (isRateLimited() && cache && cache.cities.length > 0) {
    return null;
  }

  return 'ALL_CITIES_WEATHER_DATA';
}

export function useWeatherData() {
  const {
    setCities,
    setWeeklyForecasts,
    setRealtimeTemps,
    setRealtimeWinds,
    setRealtimeWeather,
    setTownshipStations,
    setIsLoading,
    setError,
    setLastFetchedAt,
    cities,
  } = useWeatherStore();

  const pollingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** 1. 初始化：優先秒讀 storage 本地快取，建立即時 UI 體驗 */
  useEffect(() => {
    const cache = readCache();
    if (cache && cache.cities && cache.cities.length > 0) {
      setCities(cache.cities);
      if (cache.weeklyForecasts) {
        setWeeklyForecasts(cache.weeklyForecasts);
      }
      if (cache.realtimeTemps) {
        setRealtimeTemps(cache.realtimeTemps);
      }
      if (cache.realtimeWinds) {
        setRealtimeWinds(cache.realtimeWinds);
      }
      if (cache.realtimeWeather) {
        setRealtimeWeather(cache.realtimeWeather);
      }
      if (cache.townshipStations) {
        setTownshipStations(cache.townshipStations);
      }
      setLastFetchedAt(cache.fetchedAt);
    }

    const apiKey = getCwaApiKey();

    // 每次進入頁面：即測真實氣溫與風況 (O-A0001-001) 只有 1 個輕量請求，背景立即打以確保為最新實測
    fetchRealtimeObservations(apiKey).then(({ temps, winds, realtimeWeather, townshipStations }) => {
      if (temps && Object.keys(temps).length > 0) {
        setRealtimeTemps(temps);
        setRealtimeWinds(winds);
        setRealtimeWeather(realtimeWeather);
        setTownshipStations(townshipStations);
        const currentCache = readCache();
        if (currentCache) {
          writeCache({
            ...currentCache,
            realtimeTemps: temps,
            realtimeWinds: winds,
            realtimeWeather,
            townshipStations,
          });
        }
      }
    });

    // 若本地已有 cities 快取，但尚未有一週預報快取，背景單獨補抓
    if (cache && cache.cities && cache.cities.length > 0) {
      if (!cache.weeklyForecasts || Object.keys(cache.weeklyForecasts).length === 0) {
        fetchWeeklyForecast(apiKey).then((wf) => {
          if (wf && Object.keys(wf).length > 0) {
            setWeeklyForecasts(wf);
            const currentCache = readCache();
            if (currentCache) {
              writeCache({ ...currentCache, weeklyForecasts: wf });
            }
          }
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** 2. SWR 控制資料載入：若 storage 有效則 key 為 null，0 網路請求 */
  const { data, error, isLoading, mutate } = useSWR(
    getSWRKey,
    fetchAllWeatherData,
    {
      revalidateOnFocus: false, // 禁止切換視窗時自動重新請求
      revalidateOnReconnect: false, // 禁止斷線重連時自動重新請求
      dedupingInterval: 60 * 1000,
    }
  );

  /** 3. 當 API 回傳新資料時更新 storage 快取與 Store */
  useEffect(() => {
    if (!data || !data.cities || data.cities.length === 0) return;
    const now = dayjs().toISOString();
    writeCache({
      fetchedAt: now,
      cities: data.cities,
      weeklyForecasts: data.weeklyForecasts,
      realtimeTemps: data.realtimeTemps,
      realtimeWinds: data.realtimeWinds,
    });
    setCities(data.cities);
    if (data.weeklyForecasts) {
      setWeeklyForecasts(data.weeklyForecasts);
    }
    if (data.realtimeTemps) {
      setRealtimeTemps(data.realtimeTemps);
    }
    if (data.realtimeWinds) {
      setRealtimeWinds(data.realtimeWinds);
    }
    setLastFetchedAt(now);
  }, [data, setCities, setWeeklyForecasts, setRealtimeTemps, setRealtimeWinds, setLastFetchedAt]);

  /** 4. 同步 loading 與 error */
  useEffect(() => {
    setIsLoading(isLoading);
  }, [isLoading, setIsLoading]);

  useEffect(() => {
    setError(error ? (error.message || String(error)) : null);
  }, [error, setError]);

  /** 5. 6hr 定時自然喚醒排程（不使用激進的切換分頁事件，防止頻繁觸發 429） */
  useEffect(() => {
    function scheduleNext() {
      const ms = msUntilNextWindow();
      pollingTimer.current = setTimeout(() => {
        const cache = readCache();
        // 喚醒時再次檢查 storage 時間，只有過期才打 API
        if (!cache || !isCacheValid(cache)) {
          mutate();
        }
        scheduleNext();
      }, ms);
    }

    scheduleNext();

    return () => {
      if (pollingTimer.current) clearTimeout(pollingTimer.current);
    };
  }, [mutate]);

  /** 6. 手動或重新整理拉取 */
  const refetchRealtime = useCallback(async () => {
    const apiKey = getCwaApiKey();
    const { temps, winds, realtimeWeather, townshipStations } = await fetchRealtimeObservations(apiKey);
    if (temps && Object.keys(temps).length > 0) {
      setRealtimeTemps(temps);
      setRealtimeWinds(winds);
      setRealtimeWeather(realtimeWeather);
      setTownshipStations(townshipStations);
      const currentCache = readCache();
      if (currentCache) {
        writeCache({
          ...currentCache,
          realtimeTemps: temps,
          realtimeWinds: winds,
          realtimeWeather,
          townshipStations,
        });
      }
    }
    return { temps, winds, realtimeWeather, townshipStations };
  }, [setRealtimeTemps, setRealtimeWinds, setRealtimeWeather, setTownshipStations]);

  const refetch = useCallback(async () => {
    const rtPromise = refetchRealtime();
    const swrPromise = mutate();
    await Promise.allSettled([rtPromise, swrPromise]);
  }, [refetchRealtime, mutate]);

  return { cities, isLoading, error, refetch, refetchRealtime };
}
