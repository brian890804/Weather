import type {
  ApiResponse,
  Location,
  ParsedLocationData,
  WeatherPeriod,
} from '../types/weather';

/** 取得指定 ElementName 在特定 startTime 的值 */
function getElementValue(
  location: Location,
  elementName: string,
  startTime: string
): Record<string, string> {
  const el = location.WeatherElement.find((e) => e.ElementName === elementName);
  if (!el) return {};
  const entry = el.Time.find((t) => t.StartTime === startTime);
  return entry?.ElementValue[0] ?? {};
}

/** 解析 API 回傳，轉成結構化 ParsedLocationData[] */
export function parseApiResponse(api: ApiResponse): ParsedLocationData[] {
  const locations = api.records.Locations[0]?.Location ?? [];

  return locations.map((loc) => {
    // 用 平均溫度 的 Time 做時間軸
    const baseEl = loc.WeatherElement.find(
      (e) => e.ElementName === '平均溫度'
    );
    const times = baseEl?.Time ?? [];

    const periods: WeatherPeriod[] = times.map((t) => {
      const st = t.StartTime;
      const temp = getElementValue(loc, '平均溫度', st);
      const maxTemp = getElementValue(loc, '最高溫度', st);
      const minTemp = getElementValue(loc, '最低溫度', st);
      const maxApparent = getElementValue(loc, '最高體感溫度', st);
      const minApparent = getElementValue(loc, '最低體感溫度', st);
      const humidity = getElementValue(loc, '平均相對濕度', st);
      const dewPt = getElementValue(loc, '平均露點溫度', st);
      const maxComfort = getElementValue(loc, '最大舒適度指數', st);
      const minComfort = getElementValue(loc, '最小舒適度指數', st);
      const windDir = getElementValue(loc, '風向', st);
      const windSpd = getElementValue(loc, '風速', st);
      const pop = getElementValue(loc, '12小時降雨機率', st);
      const wx = getElementValue(loc, '天氣現象', st);
      const uvEl = loc.WeatherElement.find((e) => e.ElementName === '紫外線指數');
      const uvEntry = uvEl?.Time.find(
        (t2) => t2.StartTime === st || t2.StartTime <= st
      );
      const uv = uvEntry?.ElementValue[0] ?? {};
      const desc = getElementValue(loc, '天氣預報綜合描述', st);

      return {
        startTime: st,
        endTime: t.EndTime,
        temperature: temp.Temperature ?? '-',
        maxTemperature: maxTemp.MaxTemperature ?? '-',
        minTemperature: minTemp.MinTemperature ?? '-',
        maxApparentTemperature: maxApparent.MaxApparentTemperature ?? '-',
        minApparentTemperature: minApparent.MinApparentTemperature ?? '-',
        relativeHumidity: humidity.RelativeHumidity ?? '-',
        dewPoint: dewPt.DewPoint ?? '-',
        maxComfortIndex: maxComfort.MaxComfortIndex ?? '-',
        maxComfortIndexDescription: maxComfort.MaxComfortIndexDescription ?? '-',
        minComfortIndex: minComfort.MinComfortIndex ?? '-',
        minComfortIndexDescription: minComfort.MinComfortIndexDescription ?? '-',
        windDirection: windDir.WindDirection ?? '-',
        windSpeed: windSpd.WindSpeed ?? '-',
        beaufortScale: windSpd.BeaufortScale ?? '-',
        probabilityOfPrecipitation: pop.ProbabilityOfPrecipitation ?? '-',
        weather: wx.Weather ?? '-',
        weatherCode: wx.WeatherCode ?? '00',
        weatherDescription: desc.WeatherDescription ?? '-',
        uvIndex: uv.UVIndex ?? '-',
        uvExposureLevel: uv.UVExposureLevel ?? '-',
      };
    });

    return { locationName: loc.LocationName, periods };
  });
}
