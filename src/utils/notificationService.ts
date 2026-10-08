import dayjs from 'dayjs';
import type { WeatherPeriod } from '../types/weather';
import { calculateIndoorApparentTemp, calculateSteadmanApparentTemp } from './weatherUtils';

export interface WeatherNotificationContent {
  title: string;
  body: string;
  temperature: string;
  apparentTempOutdoor: string;
  apparentTempIndoor: string;
  pop: string;
  clothingTip: string;
  umbrellaTip: string;
}

export function buildMorningNotificationContent(
  cityName: string,
  townshipName: string,
  todayPeriod: WeatherPeriod | null,
  realtimeTemp?: string,
  realtimeHumidity?: string,
  realtimeWindSpeed?: string,
  realtimeRainNow?: number
): WeatherNotificationContent {
  // 1. 氣溫
  const tempNum = realtimeTemp ? parseFloat(realtimeTemp) : todayPeriod ? parseFloat(todayPeriod.temperature) : 25;
  const tempStr = !isNaN(tempNum) ? `${Math.round(tempNum)}°C` : (todayPeriod?.temperature ? `${todayPeriod.temperature}°C` : '--°C');

  // 2. 體感溫度 (室外 vs 室內)
  const rhNum = parseFloat(realtimeHumidity || todayPeriod?.relativeHumidity || '65') || 65;
  const windNum = parseFloat(realtimeWindSpeed || todayPeriod?.windSpeed || '2') || 2;

  let outdoorAppTemp = 25;
  let indoorAppTemp = 25;

  if (!isNaN(tempNum)) {
    outdoorAppTemp = Math.round(Number(calculateSteadmanApparentTemp(tempNum, rhNum, windNum)));
    indoorAppTemp = Math.round(Number(calculateIndoorApparentTemp(tempNum, rhNum)));
  } else if (todayPeriod?.maxApparentTemperature) {
    outdoorAppTemp = Math.round(parseFloat(todayPeriod.maxApparentTemperature));
    indoorAppTemp = outdoorAppTemp;
  }

  // 3. 降雨機率與帶傘建議
  const popVal = todayPeriod?.probabilityOfPrecipitation && todayPeriod.probabilityOfPrecipitation !== '-'
    ? parseInt(todayPeriod.probabilityOfPrecipitation, 10)
    : 0;
  const isRainingNow = (realtimeRainNow && realtimeRainNow > 0) || (todayPeriod?.weather && (todayPeriod.weather.includes('雨') || todayPeriod.weather.includes('陣雨')));

  let umbrellaTip = '☀️ 無需攜傘';
  if (isRainingNow || popVal >= 40) {
    umbrellaTip = isRainingNow ? '🌧 現場有雨 · 務必帶傘' : '🌧 降雨機率高 · 務必帶傘';
  } else if (popVal >= 10) {
    umbrellaTip = '☂️ 局部有短暫降雨機率 · 建議備折疊傘';
  }

  // 4. 穿衣建議
  let clothTitle = '短袖輕裝';
  let clothDetail = '薄短袖，天氣宜人舒適';
  if (outdoorAppTemp >= 30) {
    clothTitle = '清涼透氣';
    clothDetail = '純棉短袖，注意防曬補水';
  } else if (outdoorAppTemp >= 25) {
    clothTitle = '短袖輕裝';
    clothDetail = '舒適短袖或通風衣物';
  } else if (outdoorAppTemp >= 20) {
    clothTitle = '薄款外套';
    clothDetail = '長袖搭配薄夾克或罩衫';
  } else if (outdoorAppTemp >= 15) {
    clothTitle = '保暖毛衣';
    clothDetail = '厚上衣與防風外套';
  } else {
    clothTitle = '防寒大衣';
    clothDetail = '羽絨保暖外套，慎防受寒';
  }

  const customTime = getNotificationTime();
  const title = `🌅 ${cityName}${townshipName} 晨間氣象 (${customTime})`;
  const body = `🌡️ 氣溫 ${tempStr} (室外體感 ${outdoorAppTemp}°C / 室內 ${indoorAppTemp}°C)\n💧 降雨機率 ${popVal}%\n👔 穿衣：${clothTitle}（${clothDetail}）\n${umbrellaTip}`;

  return {
    title,
    body,
    temperature: tempStr,
    apparentTempOutdoor: `${outdoorAppTemp}°C`,
    apparentTempIndoor: `${indoorAppTemp}°C`,
    pop: `${popVal}%`,
    clothingTip: `${clothTitle} (${clothDetail})`,
    umbrellaTip,
  };
}

const STORAGE_KEY_SUBSCRIBED = 'weather_notification_subscribed';
const STORAGE_KEY_LAST_NOTIFIED = 'weather_notification_last_date';
const STORAGE_KEY_NOTIFICATION_TIME = 'weather_notification_time';
export const DEFAULT_NOTIFICATION_TIME = '06:30';

export function getNotificationTime(): string {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_NOTIFICATION_TIME);
    if (saved && /^\d{2}:\d{2}$/.test(saved)) {
      return saved;
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_NOTIFICATION_TIME;
}

export function setNotificationTime(timeStr: string): void {
  try {
    localStorage.setItem(STORAGE_KEY_NOTIFICATION_TIME, timeStr);
  } catch {
    /* ignore */
  }
}

export function isNotificationSubscribed(): boolean {
  return localStorage.getItem(STORAGE_KEY_SUBSCRIBED) === 'true';
}

export function setNotificationSubscribed(subscribed: boolean): void {
  localStorage.setItem(STORAGE_KEY_SUBSCRIBED, subscribed ? 'true' : 'false');
}

export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator;
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isNotificationSupported()) return 'denied';
  return await Notification.requestPermission();
}

/**
 * 透過 Service Worker 發出嚴格靜音 (silent: true) 通知
 */
export async function sendSilentNotification(payload: {
  title: string;
  body: string;
  tag?: string;
  data?: any;
}): Promise<boolean> {
  if (!isNotificationSupported()) return false;
  if (Notification.permission !== 'granted') return false;

  try {
    const registration = await navigator.serviceWorker.ready;
    if (registration) {
      await registration.showNotification(payload.title, {
        body: payload.body,
        icon: './icon-192.png',
        badge: './icon-192.png',
        tag: payload.tag || 'weather-morning-alert',
        silent: true, // 核心需求：一定要是靜音
        data: payload.data || { url: './' },
      });
      return true;
    }
  } catch (err) {
    console.warn('sendSilentNotification error:', err);
  }
  return false;
}

/**
 * 前端檢查並執行自訂時間定時推播 (若分頁開著或由背景喚醒時檢測，預設 06:30)
 */
export async function checkAndTriggerMorningNotification(
  getContent: () => WeatherNotificationContent
): Promise<void> {
  if (!isNotificationSubscribed()) return;
  if (Notification.permission !== 'granted') return;

  const now = dayjs();
  const todayStr = now.format('YYYY-MM-DD');
  const lastNotified = localStorage.getItem(STORAGE_KEY_LAST_NOTIFIED);

  // 檢查是否今天已經發送過
  if (lastNotified === todayStr) return;

  // 解析自訂推播時間 (HH:mm)
  const scheduledTime = getNotificationTime();
  const [targetHourStr, targetMinuteStr] = scheduledTime.split(':');
  const targetHour = parseInt(targetHourStr, 10);
  const targetMinute = parseInt(targetMinuteStr, 10);

  const currentHour = now.hour();
  const currentMinute = now.minute();

  // 判斷時間是否在設定時間之後 (且在設定時間起算的 5 小時有效時間窗口內觸發)
  const currentTotalMins = currentHour * 60 + currentMinute;
  const targetTotalMins = targetHour * 60 + targetMinute;

  // 在排定時間至其後 5 小時之內觸發
  const isTimeReached = currentTotalMins >= targetTotalMins && currentTotalMins <= targetTotalMins + 300;

  if (isTimeReached) {
    const content = getContent();
    const success = await sendSilentNotification({
      title: content.title,
      body: content.body,
      tag: `weather-scheduled-${todayStr}`,
    });

    if (success) {
      localStorage.setItem(STORAGE_KEY_LAST_NOTIFIED, todayStr);
    }
  }
}
