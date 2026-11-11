import type { Dayjs } from 'dayjs';
import { twTime } from './time';
import type { CachedData, ParsedCityData, WeatherPeriod } from '../types/weather';

// v3：時段最高/最低改為真實逐時區間、一週預報加入紫外線與不再推估降雨機率，升版以捨棄舊格式快取
const CACHE_KEY = 'weather_cities_cache_v3';
const LEGACY_CACHE_KEYS = ['weather_cities_cache_v2'];
const RATE_LIMIT_KEY = 'weather_cwa_rate_limit_until';
const WINDOW_HOURS = 6;

/** 最小保證有效時間 (小時)：未滿 3 小時內一律視為新鮮，絕對直接使用 Storage 暫存不發 API */
export const MIN_FRESH_HOURS = 3;
export const MIN_FRESH_MINUTES = MIN_FRESH_HOURS * 60; // 180 分鐘

/** 手動點擊重新整理按鈕的最小防刷間隔 (分鐘) */
export const MANUAL_REFRESH_MIN_INTERVAL_MINUTES = 10;

/** 取得當前所屬的 6hr 視窗起點 (UTC+8: 00:00, 06:00, 12:00, 18:00) */
export function getCurrentWindowStart(now = twTime()): Dayjs {
  const h = now.hour();
  const windowH = Math.floor(h / WINDOW_HOURS) * WINDOW_HOURS;
  return now.startOf('day').add(windowH, 'hour');
}

/** 取得當前視窗的結束時間 */
export function getCurrentWindowEnd(now = twTime()): Dayjs {
  return getCurrentWindowStart(now).add(WINDOW_HOURS, 'hour');
}

/** 記錄氣象署 429 限流冷卻截止時間 (預設冷卻 minutes 分鐘) */
export function setRateLimitCooldown(minutes = 5): void {
  try {
    const until = twTime().add(minutes, 'minute').toISOString();
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
export function isRateLimited(now = twTime()): boolean {
  try {
    const raw = localStorage.getItem(RATE_LIMIT_KEY);
    if (!raw) return false;
    const until = twTime(raw);
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
export function getMinutesSinceFetched(fetchedAt: string | null | undefined, now = twTime()): number {
  if (!fetchedAt) return Infinity;
  const t = twTime(fetchedAt);
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
  // 新欄位一律附加在最後，維持既有陣列索引相容
  'apparentTemperature',
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
    rw: data.realtimeWinds,
    rx: data.realtimeWeather,
    ts: data.townshipStations,
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
    realtimeWinds: packed.rw || packed.realtimeWinds || undefined,
    realtimeWeather: packed.rx || packed.realtimeWeather || undefined,
    townshipStations: packed.ts || packed.townshipStations || undefined,
  };
}

// ── 持久化層：IndexedDB（無 localStorage 約 5MB 上限，22 縣市資料約 5MB 會寫入失敗）──
// 記憶體保留一份鏡像，readCache / writeCache 維持同步介面；App 啟動前先以 initCache() 從 IndexedDB 載入。
const IDB_NAME = 'weather-cache';
const IDB_STORE = 'kv';

let memCache: CachedData | null = null;
let dbPromise: Promise<IDBDatabase | null> | null = null;

function openDb(): Promise<IDBDatabase | null> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    try {
      if (typeof indexedDB === 'undefined') return resolve(null);
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return dbPromise;
}

function idbGet(db: IDBDatabase, key: string): Promise<unknown> {
  return new Promise((resolve) => {
    try {
      const req = db.transaction(IDB_STORE, 'readonly').objectStore(IDB_STORE).get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(undefined);
    } catch {
      resolve(undefined);
    }
  });
}

function idbPut(db: IDBDatabase, key: string, value: unknown): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    } catch (err) {
      reject(err);
    }
  });
}

function toValidCache(packed: unknown): CachedData | null {
  const unpacked = unpackData(packed);
  if (!unpacked || !Array.isArray(unpacked.cities) || unpacked.cities.length === 0) return null;
  return unpacked;
}

/** App 啟動時呼叫一次：從 IndexedDB 載入快取到記憶體；首次升級時自動搬移 localStorage 舊快取 */
export async function initCache(): Promise<void> {
  try {
    LEGACY_CACHE_KEYS.forEach((k) => localStorage.removeItem(k));
  } catch {
    /* ignore */
  }
  const db = await openDb();
  if (db) {
    memCache = toValidCache(await idbGet(db, CACHE_KEY));
  }
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) {
      if (!memCache) memCache = toValidCache(JSON.parse(raw));
      if (db) {
        if (memCache) await idbPut(db, CACHE_KEY, packData(memCache));
        localStorage.removeItem(CACHE_KEY);
      }
    }
  } catch {
    /* ignore */
  }
}

/** 讀取快取（記憶體鏡像） */
export function readCache(): CachedData | null {
  return memCache;
}

let persistTimer: ReturnType<typeof setTimeout> | null = null;

/** 寫入快取：立即更新記憶體，並於背景寫入 IndexedDB（無 IndexedDB 時退回 localStorage） */
export function writeCache(data: CachedData): void {
  memCache = data;
  if (persistTimer) clearTimeout(persistTimer);
  // 短時間內多次寫入（如即測 + 預報同時回來）只落盤最後一次
  persistTimer = setTimeout(async () => {
    persistTimer = null;
    const snapshot = memCache;
    if (!snapshot) return;
    const packed = packData(snapshot);
    const db = await openDb();
    try {
      if (db) {
        await idbPut(db, CACHE_KEY, packed);
        return;
      }
      localStorage.setItem(CACHE_KEY, JSON.stringify(packed));
    } catch (err) {
      console.warn('[Cache] 快取寫入異常:', err);
    }
  }, 300);
}

/** 清除快取 */
export function clearCache(): void {
  memCache = null;
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {
    /* ignore */
  }
  openDb().then((db) => {
    if (!db) return;
    try {
      db.transaction(IDB_STORE, 'readwrite').objectStore(IDB_STORE).delete(CACHE_KEY);
    } catch {
      /* ignore */
    }
  });
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
export function isCacheValid(cache: CachedData | null, now = twTime()): boolean {
  if (!cache || !cache.fetchedAt || !cache.cities || cache.cities.length === 0) {
    return false;
  }

  const fetchedAt = twTime(cache.fetchedAt);
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
export function msUntilNextWindow(now = twTime()): number {
  const nextStart = getCurrentWindowEnd(now);
  return Math.max(nextStart.diff(now), 1000);
}
