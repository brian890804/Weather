import dayjs from 'dayjs';
import type { CachedData, ParsedCityData, WeatherPeriod } from '../types/weather';

const CACHE_KEY = 'weather_cities_cache_v2';
const RATE_LIMIT_KEY = 'weather_cwa_rate_limit_until';
const WINDOW_HOURS = 6;

/** 最小保證有效時間 (小時)：未滿 3 小時內一律視為新鮮，絕對直接使用 Storage 暫存不發 API */
export const MIN_FRESH_HOURS = 3;
export const MIN_FRESH_MINUTES = MIN_FRESH_HOURS * 60; // 180 分鐘

/** 手動點擊重新整理按鈕的最小防刷間隔 (分鐘) */
export const MANUAL_REFRESH_MIN_INTERVAL_MINUTES = 10;

/** 取得當前所屬的 6hr 視窗起點 (UTC+8: 00:00, 06:00, 12:00, 18:00) */
export function getCurrentWindowStart(now = dayjs()): dayjs.Dayjs {
  const h = now.hour();
  const windowH = Math.floor(h / WINDOW_HOURS) * WINDOW_HOURS;
  return now.startOf('day').add(windowH, 'hour');
}

/** 取得當前視窗的結束時間 */
export function getCurrentWindowEnd(now = dayjs()): dayjs.Dayjs {
  return getCurrentWindowStart(now).add(WINDOW_HOURS, 'hour');
}

/** 記錄氣象署 429 限流冷卻截止時間 (預設冷卻 minutes 分鐘) */
export function setRateLimitCooldown(minutes = 5): void {
  try {
    const until = dayjs().add(minutes, 'minute').toISOString();
    localStorage.setItem(RATE_LIMIT_KEY, until);
  } catch {
    /* ignore */
  }
}

/** 清除 429 限流標記 */
export function clearRateLimitCooldown(): void {
  try {
    localStorage.removeItem(RATE_LIMIT_KEY);
  } catch {
    /* ignore */
  }
}

/** 檢查是否仍處於 429 限流冷卻保護中 */
export function isRateLimited(now = dayjs()): boolean {
  try {
    const raw = localStorage.getItem(RATE_LIMIT_KEY);
    if (!raw) return false;
    const until = dayjs(raw);
    if (!until.isValid()) return false;
    if (now.isBefore(until)) {
      return true;
    }
    // 已過冷卻期，清除標記
    localStorage.removeItem(RATE_LIMIT_KEY);
    return false;
  } catch {
    return false;
  }
}

/** 取得距上次更新經過的分鐘數 */
export function getMinutesSinceFetched(fetchedAt: string | null | undefined, now = dayjs()): number {
  if (!fetchedAt) return Infinity;
  const t = dayjs(fetchedAt);
  if (!t.isValid()) return Infinity;
  return Math.max(0, now.diff(t, 'minute'));
}

/** 期間屬性順序對應 (用於精簡壓縮至 LocalStorage，將 5MB 壓至 1.4MB) */
const PERIOD_PROP_KEYS: (keyof WeatherPeriod)[] = [
  'startTime',
  'endTime',
  'temperature',
  'maxTemperature',
  'minTemperature',
  'maxApparentTemperature',
  'minApparentTemperature',
  'relativeHumidity',
  'dewPoint',
  'maxComfortIndex',
  'maxComfortIndexDescription',
  'minComfortIndex',
  'minComfortIndexDescription',
  'windDirection',
  'windSpeed',
  'beaufortScale',
  'probabilityOfPrecipitation',
  'weather',
  'weatherCode',
  'weatherDescription',
  'uvIndex',
  'uvExposureLevel',
];

function packPeriod(p: WeatherPeriod): (string | undefined)[] {
  return PERIOD_PROP_KEYS.map((k) => p[k] ?? '-');
}

function unpackPeriod(arr: string[]): WeatherPeriod {
  const p: any = {};
  PERIOD_PROP_KEYS.forEach((k, idx) => {
    p[k] = arr[idx] ?? '-';
  });
  return p as WeatherPeriod;
}

function packData(data: CachedData) {
  return {
    _v: 2,
    fetchedAt: data.fetchedAt,
    cities: data.cities.map((c) => ({
      c: c.cityName,
      id: c.datasetId,
      t: c.townships.map((town) => ({
        n: town.townshipName,
        g: town.geocode,
        lat: town.latitude,
        lng: town.longitude,
        p: town.periods.map(packPeriod),
      })),
    })),
    wf: data.weeklyForecasts,
    rt: data.realtimeTemps,
  };
}

function unpackData(packed: any): CachedData | null {
  if (!packed || !packed.cities || !Array.isArray(packed.cities)) return null;

  // 相容舊版未壓縮結構
  if (packed.cities.length > 0 && packed.cities[0].cityName && packed.cities[0].townships) {
    return packed as CachedData;
  }

  // 解壓縮精簡結構
  const cities: ParsedCityData[] = packed.cities.map((c: any) => ({
    cityName: c.c,
    datasetId: c.id,
    townships: (c.t || []).map((town: any) => ({
      townshipName: town.n,
      geocode: town.g,
      latitude: town.lat,
      longitude: town.lng,
      periods: (town.p || []).map((arr: string[]) => unpackPeriod(arr)),
    })),
  }));

  return {
    fetchedAt: packed.fetchedAt,
    cities,
    weeklyForecasts: packed.wf || packed.weeklyForecasts || undefined,
    realtimeTemps: packed.rt || packed.realtimeTemps || undefined,
  };
}

/** 讀取 localStorage 快取 */
export function readCache(): CachedData | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const unpacked = unpackData(parsed);
    if (!unpacked || !Array.isArray(unpacked.cities) || unpacked.cities.length === 0) {
      return null;
    }
    return unpacked;
  } catch {
    return null;
  }
}

/** 寫入 localStorage 快取 (自動精簡壓縮，防止超過 5MB Quota) */
export function writeCache(data: CachedData): void {
  try {
    const packed = packData(data);
    localStorage.setItem(CACHE_KEY, JSON.stringify(packed));
  } catch (err) {
    console.warn('[Cache] LocalStorage 寫入異常:', err);
  }
}

/** 清除快取 */
export function clearCache(): void {
  localStorage.removeItem(CACHE_KEY);
}

/**
 * 判斷快取是否有效（一進來優先對比 Storage 內的時間）：
 * 1. 若無有效 fetchedAt 或無資料 => 無效，需打 API
 * 2. 3 小時新鮮期條件 (MIN_FRESH_MINUTES = 180 分鐘)：
 *    只要距上次更新未滿 3 小時，無論如何一律視為有效，直接使用暫存，發送 0 個 API！
 * 3. 6 小時氣象署視窗條件 (00:00, 06:00, 12:00, 18:00)：
 *    若上次抓取時間落在當前 6hr 視窗 [windowStart, windowEnd) 內，亦視為有效，直接使用暫存！
 * 4. 只有當「既超過 3 小時，又已跨入下一個 6hr 視窗」時，才判定過期並觸發 API！
 */
export function isCacheValid(cache: CachedData | null, now = dayjs()): boolean {
  if (!cache || !cache.fetchedAt || !cache.cities || cache.cities.length === 0) {
    return false;
  }

  const fetchedAt = dayjs(cache.fetchedAt);
  if (!fetchedAt.isValid()) return false;

  // 1. Storage 時間對比：3 小時內絕對不打 API，直接使用暫存
  const diffMinutes = now.diff(fetchedAt, 'minute');
  if (diffMinutes < MIN_FRESH_MINUTES) {
    return true;
  }

  // 2. 6hr 視窗邊界對比：在同一個 6hr 視窗區間內也視為有效，直接使用暫存
  const windowStart = getCurrentWindowStart(now);
  const windowEnd = getCurrentWindowEnd(now);
  if (!fetchedAt.isBefore(windowStart) && fetchedAt.isBefore(windowEnd)) {
    return true;
  }

  return false;
}

/** 計算距下一個 6hr 視窗開始的毫秒數 */
export function msUntilNextWindow(now = dayjs()): number {
  const nextStart = getCurrentWindowEnd(now);
  return Math.max(nextStart.diff(now), 1000);
}
