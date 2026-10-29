import type { Dayjs } from 'dayjs';
import { twTime } from './time';
import type { RealtimeStationWeather, WeatherPeriod } from '../types/weather';
import { calculateIndoorApparentTemp, calculateSteadmanApparentTemp } from './weatherUtils';

/** 測站觀測超過此分鐘數即視為過期，不再當成「即時實測」顯示 */
export const OBSERVATION_MAX_AGE_MINUTES = 90;

/** 時段是否涵蓋「現在」：唯一判斷基準，實測值只能套用在這個時段 */
export function isPeriodNow(period: WeatherPeriod | null | undefined, now = twTime()): boolean {
  if (!period) return false;
  return !now.isBefore(twTime(period.startTime)) && now.isBefore(twTime(period.endTime));
}

/** 測站觀測是否仍新鮮；舊快取沒有觀測時間時一律視為過期 */
export function isObservationFresh(station: RealtimeStationWeather | null | undefined, now = twTime()): boolean {
  if (!station?.obsTime) return false;
  const t = twTime(station.obsTime);
  return t.isValid() && now.diff(t, 'minute') <= OBSERVATION_MAX_AGE_MINUTES;
}

export interface ActiveStationState {
  townshipKey: string | null;
  stationsList: RealtimeStationWeather[];
  /** 新鮮的代表測站；觀測過期或無測站時為 null */
  station: RealtimeStationWeather | null;
  /** 鄉鎮內無測站，改用縣市代表站 */
  isCityFallback: boolean;
}

/** 依「使用者手動指定 → 鄉鎮代表站 → 縣市代表站」順序決定目前使用的測站 */
export function resolveActiveStation(params: {
  selectedCity: string;
  selectedTownship: string;
  townshipStations: Record<string, RealtimeStationWeather[]>;
  userSelectedStations: Record<string, string>;
  realtimeWeather: Record<string, RealtimeStationWeather>;
  now?: Dayjs;
}): ActiveStationState {
  const { selectedCity, selectedTownship, townshipStations, userSelectedStations, realtimeWeather, now } = params;
  const townshipKey = selectedTownship ? `${selectedCity}_${selectedTownship}` : null;
  const stationsList = townshipKey ? townshipStations[townshipKey] ?? [] : [];
  const manualName = townshipKey ? userSelectedStations[townshipKey] : undefined;

  let station: RealtimeStationWeather | null =
    stationsList.find((st) => st.stationName === manualName) ||
    (townshipKey ? realtimeWeather[townshipKey] : undefined) ||
    null;
  let isCityFallback = false;
  if (!station && realtimeWeather[selectedCity]) {
    station = realtimeWeather[selectedCity];
    isCityFallback = true;
  }

  if (!isObservationFresh(station, now)) {
    return { townshipKey, stationsList, station: null, isCityFallback: false };
  }
  return { townshipKey, stationsList, station, isCityFallback };
}

/** 風向文字（如「偏東北風」）轉 8 方位角度；無法判斷時回傳 null */
export function windTextToDegree(dir: string | undefined): number | null {
  if (!dir) return null;
  const d = dir.trim();
  if (d.includes('北') && d.includes('東')) return 45;
  if (d.includes('南') && d.includes('東')) return 135;
  if (d.includes('南') && d.includes('西')) return 225;
  if (d.includes('北') && d.includes('西')) return 315;
  if (d.includes('北')) return 0;
  if (d.includes('東')) return 90;
  if (d.includes('南')) return 180;
  if (d.includes('西')) return 270;
  return null;
}

/** 風向文字轉簡短方位（如「東北」）；無法判斷時回傳 "--" */
export function windTextToCardinal(dir: string | undefined): string {
  if (!dir) return '--';
  const d = dir.trim();
  if (d.includes('北') && d.includes('東')) return '東北';
  if (d.includes('南') && d.includes('東')) return '東南';
  if (d.includes('南') && d.includes('西')) return '西南';
  if (d.includes('北') && d.includes('西')) return '西北';
  if (d.includes('北')) return '北';
  if (d.includes('東')) return '東';
  if (d.includes('南')) return '南';
  if (d.includes('西')) return '西';
  return '--';
}

function toNum(v: string | undefined): number {
  return parseFloat(v ?? '');
}

export interface LiveConditions {
  /** 是否套用測站實測（僅限涵蓋現在的時段且觀測新鮮） */
  isObserved: boolean;
  stationName: string | null;
  isCityFallback: boolean;
  temperature: string;
  temperatureObserved: boolean;
  humidity: string;
  humidityObserved: boolean;
  windSpeed: string;
  windDirection: string;
  windCardinal: string;
  windDegree: number | null;
  beaufortScale: string;
  windObserved: boolean;
  weather: string;
  weatherObserved: boolean;
  /** 測站天氣現象回報有雨（真正的「現場有雨」） */
  isRainingObserved: boolean;
  /** 預報天氣現象含雨 */
  isRainForecast: boolean;
  /** 室外體感（含風速散熱）；無法計算時為 "-" */
  outdoorApparent: string;
  /** 室內 / 弱風體感（V = 0）；無法計算時為 "-" */
  indoorApparent: string;
}

/**
 * 統一計算某時段要顯示的氣溫 / 濕度 / 風 / 天氣 / 體感：
 * - 涵蓋現在且測站觀測新鮮 → 實測值（缺項逐項退回該時段預報值）
 * - 其他時段 → 完全使用預報值，體感優先採用氣象署發布值
 * 不使用任何寫死的預設值；資料不足時回傳 "-"。
 */
export function computeLiveConditions(
  period: WeatherPeriod,
  station: RealtimeStationWeather | null,
  options: { isNow: boolean; isCityFallback?: boolean }
): LiveConditions {
  const obs = options.isNow && station ? station : null;

  const temperatureObserved = Boolean(obs?.temp);
  const temperature = obs?.temp || period.temperature;
  const humidityObserved = Boolean(obs?.humidity);
  const humidity = obs?.humidity || period.relativeHumidity;

  const obsWind = obs?.wind;
  const windObserved = Boolean(obsWind);
  const windSpeed = obsWind ? obsWind.windSpeed : period.windSpeed;
  const windDirection = obsWind ? obsWind.windDirection : period.windDirection;
  const windCardinal = obsWind ? obsWind.windCardinal : windTextToCardinal(period.windDirection);
  const windDegree = obsWind ? obsWind.windDegree : windTextToDegree(period.windDirection);
  const beaufortScale = obsWind ? obsWind.beaufortScale : period.beaufortScale;

  const weatherObserved = Boolean(obs?.weather);
  const weather = obs?.weather || period.weather;
  const isRainingObserved = Boolean(obs?.weather?.includes('雨'));
  const isRainForecast = Boolean(period.weather?.includes('雨'));

  const T = toNum(temperature);
  const RH = toNum(humidity);
  const V = toNum(windSpeed);

  let outdoorApparent = '-';
  let indoorApparent = '-';
  // 室內 / 室外一律由同一組 T、RH、V 代 Steadman 公式計算，兩者才有一致的比較基準
  if (!isNaN(T) && !isNaN(RH)) {
    indoorApparent = calculateIndoorApparentTemp(T, RH);
    if (!isNaN(V)) outdoorApparent = calculateSteadmanApparentTemp(T, RH, V);
  }
  if (outdoorApparent === '-') {
    // 缺風速等輸入時才退回氣象署發布的體感溫度
    const cwaAT = period.apparentTemperature ?? period.maxApparentTemperature;
    if (!isNaN(toNum(cwaAT))) outdoorApparent = cwaAT as string;
  }

  return {
    isObserved: Boolean(obs),
    stationName: obs?.stationName ?? null,
    isCityFallback: Boolean(obs && options.isCityFallback),
    temperature,
    temperatureObserved,
    humidity,
    humidityObserved,
    windSpeed,
    windDirection,
    windCardinal,
    windDegree,
    beaufortScale,
    windObserved,
    weather,
    weatherObserved,
    isRainingObserved,
    isRainForecast,
    outdoorApparent,
    indoorApparent,
  };
}
