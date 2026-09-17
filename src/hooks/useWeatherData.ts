import axios from 'axios';
import useSWR from 'swr';
import dayjs from 'dayjs';
import { useEffect, useRef } from 'react';
import type { ApiResponse } from '../types/weather';
import { parseApiResponse } from '../utils/parser';
import { readCache, writeCache, isCacheValid, msUntilNextWindow } from '../utils/cache';
import { useWeatherStore } from '../store/weatherStore';

const API_URL =
  'https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-D0047-091?Authorization=rdec-key-123-45678-011121314';

const fetcher = (url: string) =>
  axios.get<ApiResponse>(url).then((r) => r.data);

function getSWRKey(): string | null {
  const cache = readCache();
  if (cache && isCacheValid(cache)) return null;
  return API_URL;
}

export function useWeatherData() {
  const {
    setLocations,
    setIsLoading,
    setError,
    setLastFetchedAt,
    setSelectedLocation,
    selectedLocation,
    locations,
  } = useWeatherStore();

  const pollingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** 初始化：先讀快取 */
  useEffect(() => {
    const cache = readCache();
    if (cache && isCacheValid(cache)) {
      setLocations(cache.data);
      setLastFetchedAt(cache.fetchedAt);
      // 優先恢復 localStorage 記憶的縣市，若不在清單才 fallback 第一個
      if (cache.data.length > 0) {
        const saved = selectedLocation;
        const found = cache.data.find((l) => l.locationName === saved);
        setSelectedLocation(found ? found.locationName : cache.data[0].locationName);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { data, error, isLoading, mutate } = useSWR(
    getSWRKey,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 0,
    }
  );

  /** 當 API 回資料時，解析並存快取 */
  useEffect(() => {
    if (!data) return;
    const parsed = parseApiResponse(data);
    const now = dayjs().toISOString();
    writeCache({ fetchedAt: now, data: parsed });
    setLocations(parsed);
    setLastFetchedAt(now);
    // 新資料到，若已有記憶的縣市就沿用，否則 fallback
    if (parsed.length > 0) {
      const saved = useWeatherStore.getState().selectedLocation;
      const found = parsed.find((l) => l.locationName === saved);
      setSelectedLocation(found ? found.locationName : parsed[0].locationName);
    }
  }, [data, setLocations, setLastFetchedAt, setSelectedLocation]);

  useEffect(() => { setIsLoading(isLoading); }, [isLoading, setIsLoading]);
  useEffect(() => { setError(error ? String(error) : null); }, [error, setError]);

  /** Polling */
  useEffect(() => {
    function scheduleNext() {
      const ms = msUntilNextWindow();
      pollingTimer.current = setTimeout(() => {
        mutate();
        scheduleNext();
      }, ms);
    }
    scheduleNext();
    return () => { if (pollingTimer.current) clearTimeout(pollingTimer.current); };
  }, [mutate]);

  return { locations, isLoading, error };
}
