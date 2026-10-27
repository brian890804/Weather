import type {
  ApiResponse,
  Location,
  ParsedCityData,
  ParsedTownshipData,
  WeatherPeriod,
  WeeklyForecastDay,
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

/** 篩出 DataTime / StartTime 落在 [startTime, endTime) 區間內的逐時資料 */
function getEntriesInRange(location: Location, elementName: string, startTime: string, endTime: string) {
  const el = location.WeatherElement.find((e) => e.ElementName === elementName);
  const st = Date.parse(startTime);
  const et = Date.parse(endTime);
  if (!el || isNaN(st) || isNaN(et)) return [];
  return el.Time.filter((t) => {
    const tt = Date.parse(t.DataTime || t.StartTime || '');
    return !isNaN(tt) && tt >= st && tt < et;
  });
}

/** 取得某因子在時段內所有逐時數值 (用於計算時段內真實的最高 / 最低) */
function getNumericValuesInRange(
  location: Location,
  elementName: string,
  valueKey: string,
  startTime: string,
  endTime: string
): number[] {
  return getEntriesInRange(location, elementName, startTime, endTime)
    .map((t) => parseFloat(t.ElementValue[0]?.[valueKey]))
    .filter((v) => !isNaN(v));
}

/** 取得時段內舒適度指數最低 / 最高的那一筆 (指數 + 描述) */
function getComfortRange(location: Location, startTime: string, endTime: string) {
  const items = getEntriesInRange(location, '舒適度指數', startTime, endTime)
    .map((t) => ({
      index: parseFloat(t.ElementValue[0]?.ComfortIndex),
      desc: t.ElementValue[0]?.ComfortIndexDescription,
    }))
    .filter((v) => !isNaN(v.index) && v.desc);
  if (items.length === 0) return null;
  const sorted = [...items].sort((a, b) => a.index - b.index);
  return { min: sorted[0], max: sorted[sorted.length - 1] };
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

      // 溫度、體感、舒適度為逐時資料：取時段內所有逐時值的真實最高 / 最低，而非複製起點的單一值
      const temps = getNumericValuesInRange(loc, '溫度', 'Temperature', st, et);
      const appTemps = getNumericValuesInRange(loc, '體感溫度', 'ApparentTemperature', st, et);
      const comfortRange = getComfortRange(loc, st, et);

      return {
        startTime: st,
        endTime: et,
        temperature: temperatureVal,
        maxTemperature: temps.length > 0 ? String(Math.max(...temps)) : temperatureVal,
        minTemperature: temps.length > 0 ? String(Math.min(...temps)) : temperatureVal,
        apparentTemperature: apparentTempVal,
        maxApparentTemperature: appTemps.length > 0 ? String(Math.max(...appTemps)) : apparentTempVal,
        minApparentTemperature: appTemps.length > 0 ? String(Math.min(...appTemps)) : apparentTempVal,
        relativeHumidity: hum.RelativeHumidity ?? '-',
        dewPoint: dewPt.DewPoint ?? '-',
        maxComfortIndex: comfortRange ? String(comfortRange.max.index) : comfort.ComfortIndex ?? '-',
        maxComfortIndexDescription: comfortRange?.max.desc ?? comfort.ComfortIndexDescription ?? '-',
        minComfortIndex: comfortRange ? String(comfortRange.min.index) : comfort.ComfortIndex ?? '-',
        minComfortIndexDescription: comfortRange?.min.desc ?? comfort.ComfortIndexDescription ?? '-',
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

interface WeeklyAccumulator {
  day: WeeklyForecastDay;
  hums: number[];
  dirCounts: Record<string, number>;
  comforts: { index: number; desc: string }[];
}

function toNum(v: string | undefined): number | null {
  const n = parseFloat(v ?? '');
  return isNaN(n) ? null : n;
}

/** 解析 F-D0047-091 全台 22 縣市未來 1 週逐 12 小時天氣預報 */
export function parseWeeklyForecastResponse(api: any): Record<string, WeeklyForecastDay[]> {
  const locations = api?.records?.Locations?.[0]?.Location ?? [];
  const weeklyMap: Record<string, WeeklyForecastDay[]> = {};

  locations.forEach((loc: any) => {
    const locName: string = loc.LocationName;
    const findEl = (name: string) => loc.WeatherElement?.find((e: any) => e.ElementName === name);
    const wxEl = findEl('天氣現象');
    if (!wxEl?.Time) return;

    // 各因子的時間序列長度不一定相同 (例如紫外線只有白天 7 筆)，一律依 StartTime 對齊，不可用陣列索引
    const valueAt = (name: string, st: string): Record<string, string> | undefined =>
      findEl(name)?.Time?.find((t: any) => t.StartTime === st)?.ElementValue?.[0];

    const dayMap: Record<string, WeeklyAccumulator> = {};

    for (const t of wxEl.Time) {
      const st: string = t.StartTime || '';
      const dateStr = st.substring(0, 10);
      if (!dateStr) continue;

      if (!dayMap[dateStr]) {
        dayMap[dateStr] = {
          day: {
            dateStr,
            minTemp: 99,
            maxTemp: -99,
            maxPop: null,
            weather: '',
            weatherCode: '01',
            description: '',
            startTime: st,
          },
          hums: [],
          dirCounts: {},
          comforts: [],
        };
      }
      const acc = dayMap[dateStr];
      const day = acc.day;

      const minT = toNum(valueAt('最低溫度', st)?.MinTemperature);
      const maxT = toNum(valueAt('最高溫度', st)?.MaxTemperature);
      const wx = t.ElementValue?.[0]?.Weather || '';
      const wxCode = t.ElementValue?.[0]?.WeatherCode || '01';
      const desc = valueAt('天氣預報綜合描述', st)?.WeatherDescription || '';

      // 12 小時降雨機率；若為 '-'，只接受綜合描述中氣象署明確寫出的「降雨機率XX%」，不自行推估
      let pop = toNum(valueAt('12小時降雨機率', st)?.ProbabilityOfPrecipitation);
      if (pop === null) {
        const match = desc.match(/降雨機率\s*(\d+)%/);
        if (match) pop = parseInt(match[1]);
      }

      if (minT !== null && minT < day.minTemp) day.minTemp = minT;
      if (maxT !== null && maxT > day.maxTemp) day.maxTemp = maxT;
      if (pop !== null && (day.maxPop === null || pop > day.maxPop)) day.maxPop = pop;

      const maxAT = toNum(valueAt('最高體感溫度', st)?.MaxApparentTemperature);
      const minAT = toNum(valueAt('最低體感溫度', st)?.MinApparentTemperature);
      if (maxAT !== null && (day.maxApparentTemp === undefined || maxAT > day.maxApparentTemp)) day.maxApparentTemp = maxAT;
      if (minAT !== null && (day.minApparentTemp === undefined || minAT < day.minApparentTemp)) day.minApparentTemp = minAT;

      const rh = toNum(valueAt('平均相對濕度', st)?.RelativeHumidity);
      if (rh !== null) acc.hums.push(rh);

      const windVal = valueAt('風速', st);
      const bft = toNum(windVal?.BeaufortScale);
      const ws = toNum(windVal?.WindSpeed);
      if (bft !== null && (day.maxBeaufort === undefined || bft > day.maxBeaufort)) day.maxBeaufort = bft;
      if (ws !== null && (day.maxWindSpeed === undefined || ws > day.maxWindSpeed)) day.maxWindSpeed = ws;
      const dir = valueAt('風向', st)?.WindDirection;
      if (dir && dir !== '-') acc.dirCounts[dir] = (acc.dirCounts[dir] || 0) + 1;

      const maxCi = valueAt('最大舒適度指數', st);
      const minCi = valueAt('最小舒適度指數', st);
      const maxCiNum = toNum(maxCi?.MaxComfortIndex);
      const minCiNum = toNum(minCi?.MinComfortIndex);
      if (maxCiNum !== null && maxCi?.MaxComfortIndexDescription) {
        acc.comforts.push({ index: maxCiNum, desc: maxCi.MaxComfortIndexDescription });
      }
      if (minCiNum !== null && minCi?.MinComfortIndexDescription) {
        acc.comforts.push({ index: minCiNum, desc: minCi.MinComfortIndexDescription });
      }

      const uv = valueAt('紫外線指數', st);
      const uvNum = toNum(uv?.UVIndex);
      if (uvNum !== null && (day.uvIndex === undefined || uvNum > day.uvIndex)) {
        day.uvIndex = uvNum;
        day.uvLevel = uv?.UVExposureLevel;
      }

      const hour = parseInt(st.substring(11, 13)) || 0;
      // 優先使用白天的天氣現象與描述 (06:00 ~ 18:00)
      if (!day.weather || (hour >= 6 && hour < 18)) {
        day.weather = wx;
        day.weatherCode = wxCode;
        day.description = desc;
      }
    }

    const days = Object.values(dayMap)
      .slice(0, 7)
      .map(({ day, hums, dirCounts, comforts }) => {
        if (hums.length > 0) day.avgHumidity = Math.round(hums.reduce((a, b) => a + b, 0) / hums.length);
        const topDir = Object.entries(dirCounts).sort((a, b) => b[1] - a[1])[0];
        if (topDir) day.windDirection = topDir[0];
        if (comforts.length > 0) {
          const sorted = [...comforts].sort((a, b) => a.index - b.index);
          day.comfortRange = { minDesc: sorted[0].desc, maxDesc: sorted[sorted.length - 1].desc };
        }
        return day;
      });
    weeklyMap[locName] = days;
    if (locName === '連江縣') {
      weeklyMap['連江縣（馬祖）'] = days;
    }
  });

  return weeklyMap;
}
