export interface TimeEntry {
  DataTime?: string;
  StartTime?: string;
  EndTime?: string;
  ElementValue: Record<string, string>[];
  [key: string]: any;
}

export interface WeatherElement {
  ElementName: string;
  Time: TimeEntry[];
  [key: string]: any;
}

export interface Location {
  LocationName: string;
  Geocode: string;
  Latitude: string;
  Longitude: string;
  WeatherElement: WeatherElement[];
  [key: string]: any;
}

export interface Locations {
  DatasetDescription: string;
  LocationsName: string;
  Dataid: string;
  Location: Location[];
  [key: string]: any;
}

export interface ApiField {
  id: string;
  type: string;
}

export interface ApiResponse {
  success: string;
  result: {
    resource_id: string;
    fields: ApiField[];
  };
  records: {
    Locations: Locations[];
  };
}

/** 每個時段的解析後資料 */
export interface WeatherPeriod {
  startTime: string;
  endTime: string;
  // 溫度
  temperature: string;
  maxTemperature: string;
  minTemperature: string;
  /** 時段起點的預報體感溫度 (氣象署值) */
  apparentTemperature?: string;
  maxApparentTemperature: string;
  minApparentTemperature: string;
  // 濕度
  relativeHumidity: string;
  dewPoint: string;
  // 舒適度
  maxComfortIndex: string;
  maxComfortIndexDescription: string;
  minComfortIndex: string;
  minComfortIndexDescription: string;
  // 風
  windDirection: string;
  windSpeed: string;
  beaufortScale: string;
  // 降雨
  probabilityOfPrecipitation: string;
  // 天氣
  weather: string;
  weatherCode: string;
  weatherDescription: string;
  // 紫外線
  uvIndex: string;
  uvExposureLevel: string;
  [key: string]: any;
}

export interface ParsedTownshipData {
  townshipName: string;
  geocode: string;
  latitude: string;
  longitude: string;
  periods: WeatherPeriod[];
  [key: string]: any;
}

export interface ParsedCityData {
  cityName: string;
  datasetId: string;
  townships: ParsedTownshipData[];
  [key: string]: any;
}

export interface WeeklyForecastDay {
  dateStr: string;
  dayLabel?: string;
  minTemp: number;
  maxTemp: number;
  /** 12 小時降雨機率最大值；氣象署未提供 (第 4 天後常為 '-') 時為 null */
  maxPop: number | null;
  weather: string;
  weatherCode: string;
  description: string;
  startTime: string;
  maxApparentTemp?: number;
  minApparentTemp?: number;
  avgHumidity?: number;
  maxBeaufort?: number;
  maxWindSpeed?: number;
  windDirection?: string;
  /** 依舒適度指數由低到高排列的描述 */
  comfortRange?: { minDesc: string; maxDesc: string };
  uvIndex?: number;
  uvLevel?: string;
}

export interface RealtimeWindData {
  windSpeed: string;         // e.g. "4.9" (保留 1 位小數)
  windDirection: string;     // e.g. "北北東風"
  windCardinal: string;      // e.g. "北北東"；風向缺測或不定時為 "--"
  windDegree: number | null; // e.g. 22；風向缺測或不定時為 null
  beaufortScale: string;     // e.g. "3"
  stationName?: string;      // e.g. "大武崙"
}

export interface RealtimeStationWeather {
  temp: string;              // e.g. "21.7"
  wind?: RealtimeWindData;
  weather?: string;          // e.g. "陰有雨", "短暫陣雨", "陰"
  /** 本日 00:00 起累積雨量 (mm)，不代表「現在正在下雨」 */
  rainToday?: number;
  /** 觀測時間 (ISO) */
  obsTime?: string;
  /** 本日測站實測最高 / 最低溫 */
  dailyHigh?: string;
  dailyLow?: string;
  humidity?: string;         // e.g. "94"
  stationName: string;       // e.g. "八斗子"
  stationId: string;         // e.g. "C0B050"
}

export interface CachedData {
  fetchedAt: string; // ISO string
  cities: ParsedCityData[];
  weeklyForecasts?: Record<string, WeeklyForecastDay[]>;
  realtimeTemps?: Record<string, string>;
  realtimeWinds?: Record<string, RealtimeWindData>;
  realtimeWeather?: Record<string, RealtimeStationWeather>;
  townshipStations?: Record<string, RealtimeStationWeather[]>;
  [key: string]: any;
}

