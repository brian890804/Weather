import type {
  ApiResponse,
  Location,
  ParsedCityData,
  ParsedTownshipData,
  WeatherPeriod,
} from '../types/weather';

/** 取得指定 ElementName 在特定時間點的值 (支援 DataTime 或 StartTime) */
function getElementValueByTime(
  location: Location,
  elementName: string,
  startTime: string
): Record<string, string> {
  const el = location.WeatherElement.find((e) => e.ElementName === elementName);
  if (!el) return {};

  // 1. 先用 StartTime 精準比對
  let entry = el.Time.find((t) => t.StartTime === startTime);
  if (entry) return entry.ElementValue[0] ?? {};

  // 2. 用 DataTime 精準比對
  entry = el.Time.find((t) => t.DataTime === startTime);
  if (entry) return entry.ElementValue[0] ?? {};

  // 3. 若無精準比對，找最接近 startTime 的 DataTime
  entry = el.Time.find((t) => t.DataTime && t.DataTime >= startTime);
  return entry?.ElementValue[0] ?? el.Time[0]?.ElementValue[0] ?? {};
}

/** 解析單一縣市的 API 回傳，轉為 ParsedCityData */
export function parseCityApiResponse(
  api: ApiResponse,
  cityName: string,
  datasetId: string
): ParsedCityData {
  const locations = api.records.Locations[0]?.Location ?? [];

  const townships: ParsedTownshipData[] = locations.map((loc) => {
    // 使用「天氣現象」或「3小時降雨機率」作為時間軸
    const baseEl =
      loc.WeatherElement.find((e) => e.ElementName === '天氣現象') ||
      loc.WeatherElement.find((e) => e.ElementName === '3小時降雨機率') ||
      loc.WeatherElement[0];

    const times = baseEl?.Time ?? [];

    const periods: WeatherPeriod[] = times.map((t) => {
      const st = t.StartTime || t.DataTime || '';
      const et = t.EndTime || t.DataTime || '';

      const wx = getElementValueByTime(loc, '天氣現象', st);
      const temp = getElementValueByTime(loc, '溫度', st);
      const dewPt = getElementValueByTime(loc, '露點溫度', st);
      const hum = getElementValueByTime(loc, '相對濕度', st);
      const appTemp = getElementValueByTime(loc, '體感溫度', st);
      const comfort = getElementValueByTime(loc, '舒適度指數', st);
      const windSpd = getElementValueByTime(loc, '風速', st);
      const windDir = getElementValueByTime(loc, '風向', st);
      const pop = getElementValueByTime(loc, '3小時降雨機率', st);
      const desc = getElementValueByTime(loc, '天氣預報綜合描述', st);

      const temperatureVal = temp.Temperature ?? temp.ElementValue ?? '-';
      const apparentTempVal = appTemp.ApparentTemperature ?? '-';

      return {
        startTime: st,
        endTime: et,
        temperature: temperatureVal,
        maxTemperature: temperatureVal,
        minTemperature: temperatureVal,
        maxApparentTemperature: apparentTempVal,
        minApparentTemperature: apparentTempVal,
        relativeHumidity: hum.RelativeHumidity ?? '-',
        dewPoint: dewPt.DewPoint ?? '-',
        maxComfortIndex: comfort.ComfortIndex ?? '-',
        maxComfortIndexDescription: comfort.ComfortIndexDescription ?? '-',
        minComfortIndex: comfort.ComfortIndex ?? '-',
        minComfortIndexDescription: comfort.ComfortIndexDescription ?? '-',
        windDirection: windDir.WindDirection ?? '-',
        windSpeed: windSpd.WindSpeed ?? '-',
        beaufortScale: windSpd.BeaufortScale ?? '-',
        probabilityOfPrecipitation: pop.ProbabilityOfPrecipitation ?? '-',
        weather: wx.Weather ?? '-',
        weatherCode: wx.WeatherCode ?? '00',
        weatherDescription: desc.WeatherDescription ?? '-',
        uvIndex: '-',
        uvExposureLevel: '-',
      };
    });

    return {
      townshipName: loc.LocationName,
      geocode: loc.Geocode,
      latitude: loc.Latitude,
      longitude: loc.Longitude,
      periods,
    };
  });

  return {
    cityName,
    datasetId,
    townships,
  };
}
