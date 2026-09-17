export interface TimeEntry {
  StartTime: string;
  EndTime: string;
  ElementValue: Record<string, string>[];
}

export interface WeatherElement {
  ElementName: string;
  Time: TimeEntry[];
}

export interface Location {
  LocationName: string;
  Geocode: string;
  Latitude: string;
  Longitude: string;
  WeatherElement: WeatherElement[];
}

export interface Locations {
  DatasetDescription: string;
  LocationsName: string;
  Dataid: string;
  Location: Location[];
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

/** 每個 12hr 時段的解析後資料 */
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
}

export interface ParsedLocationData {
  locationName: string;
  periods: WeatherPeriod[];
}

export interface CachedData {
  fetchedAt: string; // ISO string
  data: ParsedLocationData[];
}
