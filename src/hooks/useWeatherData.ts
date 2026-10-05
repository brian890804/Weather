import axios from 'axios';
import useSWR from 'swr';
import dayjs from 'dayjs';
import { useEffect, useRef, useCallback } from 'react';
import type { ApiResponse, ParsedCityData, WeeklyForecastDay } from '../types/weather';
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

let realtimeInFlightPromise: Promise<Record<string, string>> | null = null;

/** 拉取全台各縣市即測站點真實即時氣溫 (O-A0001-001, 僅 1 個輕量請求，支援 In-flight 去重) */
export async function fetchRealtimeObservations(apiKey: string): Promise<Record<string, string>> {
  if (realtimeInFlightPromise) {
    return realtimeInFlightPromise;
  }

  realtimeInFlightPromise = (async () => {
    try {
      const stationNames = Array.from(new Set(Object.values(CITY_STATION_MAP)));
      const url = `https://opendata.cwa.gov.tw/api/v1/rest/datastore/O-A0001-001?Authorization=${apiKey}&StationName=${encodeURIComponent(
        stationNames.join(',')
      )}`;
      const res = await axios.get(url, { timeout: 8000 });
      const stations: any[] = res.data?.records?.Station ?? [];

      const stationTempMap = new Map<string, string>();
      stations.forEach((st) => {
        const name = st.StationName;
        const airTemp = st.WeatherElement?.AirTemperature;
        if (name && airTemp !== undefined && airTemp !== null && airTemp !== '-99' && airTemp !== -99) {
          const rounded = String(Math.round(parseFloat(String(airTemp))));
          stationTempMap.set(name, rounded);
        }
      });

      const result: Record<string, string> = {};
      for (const [cityName, stName] of Object.entries(CITY_STATION_MAP)) {
        const temp = stationTempMap.get(stName);
        if (temp) {
          result[cityName] = temp;
        }
      }
      return result;
    } catch (err: any) {
      console.warn('[CWA API] 抓取即測資料 (O-A0001-001) 異常:', err?.message || err);
      return readCache()?.realtimeTemps ?? {};
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
}

async function fetchAllWeatherData(): Promise<WeatherFetchResult> {
  const apiKey = getCwaApiKey();
  const existingCache = readCache();
  const existingWeekly = existingCache?.weeklyForecasts ?? {};
  const existingRealtime = existingCache?.realtimeTemps ?? {};

  // 同步平行拉取 1 週天氣預報、全台 20 大測站即測真實溫度、逐 3 小時 22 縣市資料
  const weeklyPromise = fetchWeeklyForecast(apiKey);
  const realtimePromise = fetchRealtimeObservations(apiKey);
  const cities = await fetchAllCities();
  const weeklyForecasts = await weeklyPromise;
  const realtimeTemps = await realtimePromise;

  return {
    cities,
    weeklyForecasts: Object.keys(weeklyForecasts).length > 0 ? weeklyForecasts : existingWeekly,
    realtimeTemps: Object.keys(realtimeTemps).length > 0 ? realtimeTemps : existingRealtime,
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
      setLastFetchedAt(cache.fetchedAt);
    }

    const apiKey = getCwaApiKey();

    // 每次進入頁面：即測真實氣溫 (O-A0001-001) 只有 1 個輕量請求，背景立即打以確保為最新實測溫度
    fetchRealtimeObservations(apiKey).then((rt) => {
      if (rt && Object.keys(rt).length > 0) {
        setRealtimeTemps(rt);
        const currentCache = readCache();
        if (currentCache) {
          writeCache({ ...currentCache, realtimeTemps: rt });
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
    });
    setCities(data.cities);
    if (data.weeklyForecasts) {
      setWeeklyForecasts(data.weeklyForecasts);
    }
    if (data.realtimeTemps) {
      setRealtimeTemps(data.realtimeTemps);
    }
    setLastFetchedAt(now);
  }, [data, setCities, setWeeklyForecasts, setRealtimeTemps, setLastFetchedAt]);

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
    const rt = await fetchRealtimeObservations(apiKey);
    if (rt && Object.keys(rt).length > 0) {
      setRealtimeTemps(rt);
      const currentCache = readCache();
      if (currentCache) {
        writeCache({ ...currentCache, realtimeTemps: rt });
      }
    }
    return rt;
  }, [setRealtimeTemps]);

  const refetch = useCallback(async () => {
    const rtPromise = refetchRealtime();
    const swrPromise = mutate();
    await Promise.allSettled([rtPromise, swrPromise]);
  }, [refetchRealtime, mutate]);

  return { cities, isLoading, error, refetch, refetchRealtime };
}
