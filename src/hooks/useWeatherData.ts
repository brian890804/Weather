import axios from 'axios';
import useSWR from 'swr';
import dayjs from 'dayjs';
import { useEffect, useRef } from 'react';
import type { ApiResponse, ParsedCityData } from '../types/weather';
import { CITIES } from '../utils/cities';
import { parseCityApiResponse } from '../utils/parser';
import { readCache, writeCache, isCacheValid, msUntilNextWindow } from '../utils/cache';
import { useWeatherStore } from '../store/weatherStore';

const AUTH_KEY = 'rdec-key-123-45678-011121314';

/** 併發拉取所有 22 個縣市的 API */
async function fetchAllCities(): Promise<ParsedCityData[]> {
  const promises = CITIES.map(async (city) => {
    const url = `https://opendata.cwa.gov.tw/api/v1/rest/datastore/${city.id}?Authorization=${AUTH_KEY}`;
    const res = await axios.get<ApiResponse>(url);
    return parseCityApiResponse(res.data, city.name, city.id);
  });

  return await Promise.all(promises);
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
