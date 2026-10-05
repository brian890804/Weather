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

export interface CachedData {
  fetchedAt: string; // ISO string
  cities: ParsedCityData[];
  weeklyForecasts?: Record<string, WeeklyForecastDay[]>;
  realtimeTemps?: Record<string, string>;
  [key: string]: any;
}

