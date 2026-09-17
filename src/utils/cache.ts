import dayjs from 'dayjs';
import type { CachedData } from '../types/weather';

const CACHE_KEY = 'weather_cities_cache_v2';
const WINDOW_HOURS = 6;

/** 取得當前所屬的 6hr 視窗起點 (UTC+8)
 *  視窗: 00:00, 06:00, 12:00, 18:00
 */
export function getCurrentWindowStart(now = dayjs()): dayjs.Dayjs {
  const h = now.hour();
  const windowH = Math.floor(h / WINDOW_HOURS) * WINDOW_HOURS;
  return now.startOf('day').add(windowH, 'hour');
}

/** 取得當前視窗的結束時間 */
export function getCurrentWindowEnd(now = dayjs()): dayjs.Dayjs {
  return getCurrentWindowStart(now).add(WINDOW_HOURS, 'hour');
}

/** 讀取 localStorage 快取 */
export function readCache(): CachedData | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedData;
    if (!parsed || !Array.isArray(parsed.cities) || parsed.cities.length === 0) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/** 寫入 localStorage 快取 */
export function writeCache(data: CachedData): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch (err) {
    console.warn('LocalStorage quota exceeded or write error:', err);
  }
}

/** 清除快取 */
export function clearCache(): void {
  localStorage.removeItem(CACHE_KEY);
}

/**
 * 判斷快取是否仍在目前 6hr 視窗內有效
 * fetchedAt 要在 [windowStart, windowEnd) 之間才算有效
 */
export function isCacheValid(cache: CachedData, now = dayjs()): boolean {
  if (!cache || !cache.fetchedAt || !cache.cities || cache.cities.length === 0) {
    return false;
  }
  const windowStart = getCurrentWindowStart(now);
  const windowEnd = getCurrentWindowEnd(now);
  const fetchedAt = dayjs(cache.fetchedAt);
  return !fetchedAt.isBefore(windowStart) && fetchedAt.isBefore(windowEnd);
}

/** 計算距下一個 6hr 視窗開始的毫秒數 */
export function msUntilNextWindow(now = dayjs()): number {
  const nextStart = getCurrentWindowEnd(now);
  return Math.max(nextStart.diff(now), 1000);
}
