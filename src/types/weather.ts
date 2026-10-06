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
  maxPop: number;
  weather: string;
  weatherCode: string;
  description: string;
  startTime: string;
}

export interface RealtimeWindData {
  windSpeed: string;         // e.g. "4.9" (保留 1 位小數)
  windDirection: string;     // e.g. "北北東風"
  windCardinal: string;      // e.g. "北北東"
  windDegree: number;        // e.g. 22
  beaufortScale: string;     // e.g. "3"
  stationName?: string;      // e.g. "大武崙"
}

export interface RealtimeStationWeather {
  temp: string;              // e.g. "21.7"
  wind?: RealtimeWindData;
  weather?: string;          // e.g. "陰有雨", "短暫陣雨", "陰"
  rainNow?: number;          // e.g. 2.0 (mm)
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

