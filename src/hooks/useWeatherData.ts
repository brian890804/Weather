import axios from 'axios';
import useSWR from 'swr';
import dayjs from 'dayjs';
import { useEffect, useRef } from 'react';
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

/** 拉取全台 22 縣市未來 1 週逐 12 小時預報 (F-D0047-091, 僅 1 個輕量請求) */
export async function fetchWeeklyForecast(apiKey: string): Promise<Record<string, WeeklyForecastDay[]>> {
  try {
    const url = `https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-D0047-091?Authorization=${apiKey}`;
    const res = await axios.get(url, { timeout: 8000 });
    return parseWeeklyForecastResponse(res.data);
  } catch (err: any) {
    console.warn('[CWA API] 抓取一週預報 (F-D0047-091) 異常:', err?.message || err);
    return readCache()?.weeklyForecasts ?? {};
  }
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
}

async function fetchAllWeatherData(): Promise<WeatherFetchResult> {
  const apiKey = getCwaApiKey();
  const existingCache = readCache();
  const existingWeekly = existingCache?.weeklyForecasts ?? {};

  // 同步平行拉取 1 週天氣預報 (僅 1 個輕量請求) 與逐 3 小時 22 縣市資料
  const weeklyPromise = fetchWeeklyForecast(apiKey);
  const cities = await fetchAllCities();
  const weeklyForecasts = await weeklyPromise;

  return {
    cities,
    weeklyForecasts: Object.keys(weeklyForecasts).length > 0 ? weeklyForecasts : existingWeekly,
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
      setLastFetchedAt(cache.fetchedAt);
    }

    // 若本地尚未有一週預報快取，背景單獨補抓 1 次 F-D0047-091 (僅 1 個輕量請求)
    if (!cache?.weeklyForecasts || Object.keys(cache.weeklyForecasts).length === 0) {
      const apiKey = getCwaApiKey();
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
    writeCache({ fetchedAt: now, cities: data.cities, weeklyForecasts: data.weeklyForecasts });
    setCities(data.cities);
    if (data.weeklyForecasts) {
      setWeeklyForecasts(data.weeklyForecasts);
    }
    setLastFetchedAt(now);
  }, [data, setCities, setWeeklyForecasts, setLastFetchedAt]);

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

  return { cities, isLoading, error, refetch: mutate };
}
