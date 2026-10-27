import { twTime } from './time';

/** 根據 WeatherCode (氣象局代碼) 或天氣描述，對應 meteocons SVG 名稱 */
export function getWeatherIconName(
  weatherCode?: string,
  weather?: string,
  isNight = false
): string {
  const suffix = isNight ? '-night' : '-day';

  const code = (weatherCode || '00').padStart(2, '0');
  // 氣象署「預報產品天氣描述代碼表」: https://opendata.cwa.gov.tw/opendatadoc/MFC/ForecastElement.pdf
  const codeMap: Record<string, string> = {
    '01': 'clear' + suffix,                 // 晴天
    '02': 'mostly-clear' + suffix,          // 晴時多雲
    '03': 'partly-cloudy' + suffix,         // 多雲時晴
    '04': 'overcast' + suffix,              // 多雲
    '05': 'overcast' + suffix,              // 多雲時陰
    '06': 'overcast' + suffix,              // 陰時多雲
    '07': 'overcast' + suffix,              // 陰天
    '08': 'overcast' + suffix + '-rain',    // 多雲短暫雨 / 午後短暫陣雨 / 短暫雨
    '09': 'overcast' + suffix + '-rain',    // 多雲時陰短暫雨
    '10': 'overcast' + suffix + '-rain',    // 陰時多雲短暫雨
    '11': 'overcast' + suffix + '-rain',    // 雨天 / 陰短暫雨
    '12': 'overcast' + suffix + '-rain',    // 多雲時陰有雨
    '13': 'overcast' + suffix + '-rain',    // 陰時多雲有雨
    '14': 'overcast-rain',                  // 陰有雨 / 陣雨
    '15': 'thunderstorms' + suffix + '-rain', // 多雲陣雨或雷雨
    '16': 'thunderstorms' + suffix + '-rain', // 多雲時陰陣雨或雷雨
    '17': 'thunderstorms-rain',             // 陰時多雲有雷陣雨
    '18': 'thunderstorms-rain',             // 陰有陣雨或雷雨
    '19': 'partly-cloudy' + suffix + '-rain', // 晴午後多雲局部雨
    '20': 'overcast' + suffix + '-rain',    // 多雲午後局部雨
    '21': 'thunderstorms' + suffix + '-rain', // 晴午後多雲局部雷雨
    '22': 'thunderstorms' + suffix + '-rain', // 多雲午後局部雷雨
    '23': 'overcast-sleet',                 // 多雲局部陣雨或雪
    '24': 'fog' + suffix,                   // 晴有霧
    '25': 'fog' + suffix,                   // 晴時多雲有霧
    '26': 'fog' + suffix,                   // 多雲時晴有霧
    '27': 'overcast' + suffix + '-fog',     // 多雲有霧
    '28': 'overcast-fog',                   // 陰有霧
    '29': 'overcast' + suffix + '-rain',    // 多雲局部雨
    '30': 'overcast' + suffix + '-rain',    // 多雲時陰局部雨
    '31': 'overcast' + suffix + '-rain',    // 多雲有霧有局部雨
    '32': 'overcast-rain',                  // 多雲時陰有霧有局部雨
    '33': 'thunderstorms' + suffix + '-rain', // 多雲局部陣雨或雷雨
    '34': 'thunderstorms-rain',             // 多雲時陰局部陣雨或雷雨
    '35': 'thunderstorms' + suffix + '-rain', // 多雲有陣雨或雷雨有霧
    '36': 'thunderstorms-rain',             // 多雲時陰有陣雨或雷雨有霧
    '37': 'overcast-sleet',                 // 多雲局部雨或雪有霧
    '38': 'overcast' + suffix + '-drizzle', // 短暫陣雨有霧
    '39': 'overcast-rain',                  // 有雨有霧
    '41': 'thunderstorms' + suffix + '-rain', // 短暫陣雨或雷雨有霧
    '42': 'snow',                           // 下雪 / 積冰 / 暴風雪
  };

  // 先檢查天氣文字是否明確帶有「雨」或「雷」
  // 若測站或實況文字回報「陰有雨」、「短暫雨」或代碼對應雨天，優先使用動態下雨圖示
  const w = weather || '';
  if (w.includes('雷') && w.includes('雨')) return isNight ? 'thunderstorms-night-rain' : 'thunderstorms-day-rain';
  if (w.includes('雷')) return isNight ? 'thunderstorms-night' : 'thunderstorms-day';
  if (w.includes('雪')) return 'snow';
  if (w.includes('雨夾雪') || w.includes('夾雪')) return 'sleet';
  if (w.includes('大雨') || w.includes('豪雨')) return 'rain';
  // 註：「靄」是低能見度的水氣，不是降水，交由下方霧 / 霾判斷
  if (w.includes('毛毛雨') || w.includes('細雨')) return isNight ? 'overcast-night-drizzle' : 'overcast-day-drizzle';
  if (w.includes('陣雨') || w.includes('短暫雨') || w.includes('有雨')) {
    if (w.includes('晴') || w.includes('多雲時晴')) return isNight ? 'partly-cloudy-night-rain' : 'partly-cloudy-day-rain';
    return isNight ? 'overcast-night-rain' : 'overcast-day-rain';
  }
  if (w.includes('雨')) return isNight ? 'overcast-night-rain' : 'overcast-day-rain';

  // 檢查代碼對應
  if (codeMap[code]) {
    return codeMap[code];
  }

  // fallback: 純無雨天氣解析
  if (w.includes('霧') || w.includes('霾') || w.includes('靄')) return isNight ? 'fog-night' : 'fog-day';
  if (w.includes('晴時多雲') || w.includes('晴間多雲')) return isNight ? 'mostly-clear-night' : 'mostly-clear-day';
  if (w.includes('多雲時晴')) return isNight ? 'partly-cloudy-night' : 'partly-cloudy-day';
  if (w.includes('陰')) return isNight ? 'overcast-night' : 'overcast-day';
  if (w.includes('多雲')) return isNight ? 'overcast-night' : 'overcast-day';
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

/** 判斷是否為夜間 (台北時間 18:00 ~ 06:00)；未給時間則以現在判斷 */
export function isCurrentNight(startTime?: string): boolean {
  const h = twTime(startTime).hour();
  return h < 6 || h >= 18;
}

/** 風力等級中文 */
export function beaufortLabel(scale?: string): string {
  // 缺資料時不捏造風級名稱
  if (!scale || scale === '-') return '--';
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
export function uvLevelColor(level?: string): string {
  if (!level) return '#90A4AE';
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
export function popColor(pop?: string): string {
  const v = parseInt(pop || '0');
  if (isNaN(v)) return '#607D8B';
  if (v < 20) return '#4CAF50';
  if (v < 40) return '#8BC34A';
  if (v < 60) return '#FFC107';
  if (v < 80) return '#FF9800';
  return '#F44336';
}

/** 溫度顏色 */
export function tempColor(temp?: string): string {
  const v = parseInt(temp || '0');
  if (isNaN(v)) return '#90A4AE';
  if (v <= 10) return '#42A5F5';
  if (v <= 18) return '#26C6DA';
  if (v <= 24) return '#66BB6A';
  if (v <= 30) return '#FFA726';
  return '#EF5350';
}

/** 舒適度顏色 */
export function comfortColor(desc?: string): string {
  if (!desc || typeof desc !== 'string') return '#66BB6A';
  if (desc.includes('舒適')) return '#66BB6A';
  if (desc.includes('悶熱') || desc.includes('炎熱')) return '#EF5350';
  if (desc.includes('寒冷') || desc.includes('偏涼')) return '#42A5F5';
  return '#FFA726';
}

/** 蒲福風力等級顏色 */
export function bftColor(scale?: string): string {
  const v = parseInt(scale || '0');
  if (isNaN(v)) return '#81C784';
  if (v <= 2) return '#81C784';
  if (v <= 4) return '#64B5F6';
  if (v <= 6) return '#FFA726';
  if (v <= 9) return '#EF5350';
  return '#AB47BC';
}

/**
 * 依據中央氣象署引用之 R.G. Steadman (1984) 體感溫度通用公式計算即時真實體感溫度：
 * 體感溫度 = (1.04 × T) + (0.2 × e) - (0.65 × V) - 2.7
 * 其中水氣壓 e (hPa) = (RH / 100) × 6.105 × exp((17.27 × T) / (237.7 + T))
 * T: 氣溫 (°C)
 * RH: 相對濕度 (%)
 * V: 風速 (m/s)
 * 數值結果保留 1 位小數（不四捨五入成整數）
 */
export function calculateSteadmanApparentTemp(
  temperature: number,
  relativeHumidity: number,
  windSpeed: number
): string {
  const T = temperature;
  const RH = Math.max(0, Math.min(100, relativeHumidity));
  const V = Math.max(0, windSpeed);

  // 水氣壓 e (百帕 hPa)
  const e = (RH / 100) * 6.105 * Math.exp((17.27 * T) / (237.7 + T));
  // 體感溫度公式 (室外通風含風速散熱)
  const AT = (1.04 * T) + (0.2 * e) - (0.65 * V) - 2.7;

  return AT.toFixed(1);
}

/**
 * 計算室內 / 弱風遮蔽環境之體感溫度（風速 V = 0）：
 * 體感溫度 = (1.04 × T) + (0.2 × e) - 2.7
 */
export function calculateIndoorApparentTemp(
  temperature: number,
  relativeHumidity: number
): string {
  const T = temperature;
  const RH = Math.max(0, Math.min(100, relativeHumidity));

  // 水氣壓 e (百帕 hPa)
  const e = (RH / 100) * 6.105 * Math.exp((17.27 * T) / (237.7 + T));
  // 室內無風散熱公式
  const AT = (1.04 * T) + (0.2 * e) - 2.7;

  return AT.toFixed(1);
}

