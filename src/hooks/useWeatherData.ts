import axios from 'axios';
import useSWR from 'swr';
import dayjs from 'dayjs';
import { useEffect, useRef } from 'react';
import type { ApiResponse, ParsedCityData } from '../types/weather';
import { CITIES } from '../utils/cities';
import { parseCityApiResponse } from '../utils/parser';
import { readCache, writeCache, isCacheValid, msUntilNextWindow } from '../utils/cache';
import { useWeatherStore } from '../store/weatherStore';

const DEFAULT_AUTH_KEY = 'rdec-key-123-45678-011121314';

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

/** 分批拉取 22 個縣市，避免瞬間 22 併發觸發氣象署 429 限流 */
async function fetchAllCities(): Promise<ParsedCityData[]> {
  const existingCache = readCache()?.cities ?? [];
  const existingMap = new Map(existingCache.map((c) => [c.cityName, c]));
  const apiKey = getCwaApiKey();

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
        console.warn(`[CWA API] 抓取 ${city.name} 失敗 (${err?.response?.status || err.message})，回退快取`);
        // 若遭遇 429 或網路異常，優雅降級：使用該縣市本地已有的快取資料
        const cached = existingMap.get(city.name);
        if (cached) {
          return cached;
        }
        throw err;
      }
    });

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);

    // 批次間微間隔 200ms，平滑流量防止 WAF 429
    if (i + BATCH_SIZE < CITIES.length) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  // 若部分失敗但所有縣市都有快取保底，正常回傳完整資料；若完全沒快取又失敗才報錯
  if (results.length === CITIES.length) {
    return results;
  }
  if (hasFailed && existingCache.length > 0) {
    return existingCache;
  }
  return results;
}

function getSWRKey(): string | null {
  const cache = readCache();
  if (cache && isCacheValid(cache)) {
    return null; // 快取有效，跳過網路請求
  }
  return 'ALL_CITIES_WEATHER_DATA';
}

export function useWeatherData() {
  const {
    setCities,
    setIsLoading,
    setError,
    setLastFetchedAt,
    cities,
  } = useWeatherStore();

  const pollingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** 1. 初始化：先載入快取（秒開體驗，若已過期則在背景靜默更新） */
  useEffect(() => {
    const cache = readCache();
    if (cache && cache.cities && cache.cities.length > 0) {
      setCities(cache.cities);
      setLastFetchedAt(cache.fetchedAt);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** 2. SWR 控制資料載入 */
  const { data, error, isLoading, mutate } = useSWR(
    getSWRKey,
    fetchAllCities,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60 * 1000,
    }
  );

  /** 3. 當 API 回傳新資料時更新快取與 Store */
  useEffect(() => {
    if (!data || data.length === 0) return;
    const now = dayjs().toISOString();
    writeCache({ fetchedAt: now, cities: data });
    setCities(data);
    setLastFetchedAt(now);
  }, [data, setCities, setLastFetchedAt]);

  /** 4. 同步 loading 與 error */
  useEffect(() => {
    setIsLoading(isLoading);
  }, [isLoading, setIsLoading]);

  useEffect(() => {
    setError(error ? (error.message || String(error)) : null);
  }, [error, setError]);

  /** 5. 6hr 定時排程與喚醒檢驗：定時喚醒 + 休眠/切換分頁時主動檢查跨視窗狀態 */
  useEffect(() => {
    function checkAndRefetch() {
      const cache = readCache();
      if (!cache || !isCacheValid(cache)) {
        mutate();
      }
    }

    function scheduleNext() {
      const ms = msUntilNextWindow();
      pollingTimer.current = setTimeout(() => {
        mutate();
        scheduleNext();
      }, ms);
    }

    scheduleNext();

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        checkAndRefetch();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);

    return () => {
      if (pollingTimer.current) clearTimeout(pollingTimer.current);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
    };
  }, [mutate]);

  return { cities, isLoading, error, refetch: mutate };
}
