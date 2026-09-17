/** 根據 WeatherCode (氣象局代碼) 或天氣描述，對應 meteocons SVG 名稱 */
export function getWeatherIconName(
  weatherCode: string,
  weather: string,
  isNight = false
): string {
  const suffix = isNight ? '-night' : '-day';

  const code = weatherCode.padStart(2, '0');
  // 氣象局天氣代碼: https://opendata.cwa.gov.tw/opendatadoc/MFC/D0047.pdf
  const codeMap: Record<string, string> = {
    '01': 'clear' + suffix,          // 晴
    '02': 'mostly-clear' + suffix,   // 晴時多雲
    '03': 'partly-cloudy' + suffix,  // 多雲時晴
    '04': 'overcast' + suffix,       // 多雲
    '05': 'overcast' + suffix,       // 多雲短暫陰
    '06': 'overcast' + suffix,       // 陰
    '07': 'overcast' + suffix,       // 陰時多雲
    '08': 'overcast' + suffix + '-rain',     // 多雲短暫陣雨
    '09': 'overcast' + suffix + '-rain',     // 多雲陣雨
    '10': 'overcast-day-rain',       // 多雲短暫雨
    '11': 'overcast-day-rain',       // 多雲雨
    '12': 'overcast-day-rain',       // 陰短暫雨
    '13': 'overcast-rain',           // 陰雨
    '14': 'thunderstorms' + suffix,  // 多雲雷陣雨
    '15': 'thunderstorms' + suffix,  // 多雲短暫雷陣雨
    '16': 'thunderstorms' + suffix,  // 陰短暫雷陣雨
    '17': 'thunderstorms',           // 陰雷陣雨
    '18': 'overcast-day-snow',       // 多雲陣雪
    '19': 'overcast-day-snow',       // 多雲雪
    '20': 'overcast-snow',           // 陰雪
    '21': 'overcast-day-sleet',      // 多雲陣雨夾雪
    '22': 'overcast-sleet',          // 陰雨夾雪
    '23': 'fog' + suffix,            // 霧
    '24': 'haze' + suffix,           // 靄
    '25': 'haze',                    // 霾
    '26': 'fog' + suffix,            // 地霧
    '27': 'mostly-clear' + suffix,   // 晴有霾
    '28': 'partly-cloudy' + suffix,  // 多雲有霾
    '29': 'thunderstorms-extreme' + suffix, // 多雲局部雷陣雨
    '30': 'thunderstorms' + suffix,  // 多雲大雷雨
    '31': 'thunderstorms',           // 陰大雷雨
    '32': 'rain',                    // 豪雨
    '33': 'rain',                    // 大雨
    '34': 'snow',                    // 雪
  };

  // 先嘗試 code map
  if (codeMap[code]) {
    return codeMap[code];
  }

  // fallback: 解析文字
  const w = weather;
  if (w.includes('雷')) return isNight ? 'thunderstorms-night' : 'thunderstorms-day';
  if (w.includes('雪')) return 'snow';
  if (w.includes('雨夾雪') || w.includes('夾雪')) return 'sleet';
  if (w.includes('大雨') || w.includes('豪雨')) return 'rain';
  if (w.includes('陣雨') || w.includes('短暫雨')) return isNight ? 'overcast-night-rain' : 'overcast-day-rain';
  if (w.includes('雨')) return 'rain';
  if (w.includes('霧') || w.includes('霾') || w.includes('靄')) return isNight ? 'fog-night' : 'fog-day';
  if (w.includes('晴時多雲') || w.includes('晴間多雲')) return isNight ? 'mostly-clear-night' : 'mostly-clear-day';
  if (w.includes('多雲時晴')) return isNight ? 'partly-cloudy-night' : 'partly-cloudy-day';
  if (w.includes('陰') || w.includes('多雲')) return isNight ? 'overcast-night' : 'overcast-day';
  if (w.includes('晴')) return isNight ? 'clear-night' : 'clear-day';

  return isNight ? 'partly-cloudy-night' : 'partly-cloudy-day';
}

/** 取得 meteocons SVG URL (從 node_modules) */
export function getWeatherIconUrl(iconName: string): string {
  return new URL(
    `../../node_modules/@meteocons/svg/fill/${iconName}.svg`,
    import.meta.url
  ).href;
}

/** 判斷目前是否為白天 (06:00 ~ 18:00) */
export function isCurrentNight(startTime?: string): boolean {
  if (!startTime) {
    const h = new Date().getHours();
    return h < 6 || h >= 18;
  }
  const h = new Date(startTime).getHours();
  return h < 6 || h >= 18;
}

/** 風力等級中文 */
export function beaufortLabel(scale: string): string {
  const map: Record<string, string> = {
    '0': '無風',
    '1': '軟風',
    '2': '輕風',
    '3': '微風',
    '4': '和風',
    '5': '清風',
    '6': '強風',
    '7': '疾風',
    '8': '大風',
    '9': '烈風',
    '10': '狂風',
    '11': '暴風',
    '12': '颶風',
  };
  return map[scale] ?? `${scale}級`;
}

/** 紫外線等級顏色 */
export function uvLevelColor(level: string): string {
  const map: Record<string, string> = {
    '低量級': '#4CAF50',
    '中量級': '#FFEB3B',
    '高量級': '#FF9800',
    '過量級': '#F44336',
    '危險級': '#9C27B0',
  };
  return map[level] ?? '#90A4AE';
}

/** 降雨機率顏色 */
export function popColor(pop: string): string {
  const v = parseInt(pop);
  if (isNaN(v)) return '#607D8B';
  if (v < 20) return '#4CAF50';
  if (v < 40) return '#8BC34A';
  if (v < 60) return '#FFC107';
  if (v < 80) return '#FF9800';
  return '#F44336';
}

/** 溫度顏色 */
export function tempColor(temp: string): string {
  const v = parseInt(temp);
  if (isNaN(v)) return '#90A4AE';
  if (v <= 10) return '#42A5F5';
  if (v <= 18) return '#26C6DA';
  if (v <= 24) return '#66BB6A';
  if (v <= 30) return '#FFA726';
  return '#EF5350';
}

/** 舒適度顏色 */
export function comfortColor(desc: string): string {
  if (desc.includes('舒適')) return '#66BB6A';
  if (desc.includes('悶熱') || desc.includes('炎熱')) return '#EF5350';
  if (desc.includes('寒冷') || desc.includes('偏涼')) return '#42A5F5';
  return '#FFA726';
}

/** 蒲福風力等級顏色 */
export function bftColor(scale: string): string {
  const v = parseInt(scale);
  if (v <= 2) return '#81C784';
  if (v <= 4) return '#64B5F6';
  if (v <= 6) return '#FFA726';
  if (v <= 9) return '#EF5350';
  return '#AB47BC';
}

