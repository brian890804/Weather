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
    // 使用者重新設定時間時，清空最後通知標記，確保新設定的時間在今日能順利觸發
    localStorage.removeItem(STORAGE_KEY_LAST_NOTIFIED);
    console.log(`[NotificationService] Updated notification time to: ${timeStr}, cleared last notified flag`);
  } catch {
    /* ignore */
  }
}

export function isNotificationSubscribed(): boolean {
  return localStorage.getItem(STORAGE_KEY_SUBSCRIBED) === 'true';
}

export function setNotificationSubscribed(subscribed: boolean): void {
  localStorage.setItem(STORAGE_KEY_SUBSCRIBED, subscribed ? 'true' : 'false');
  if (subscribed) {
    // 開啟訂閱時也允許今日新設定的時段觸發
    localStorage.removeItem(STORAGE_KEY_LAST_NOTIFIED);
  }
}

export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator;
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isNotificationSupported()) return 'denied';
  try {
    return await Notification.requestPermission();
  } catch (err) {
    console.warn('[NotificationService] requestNotificationPermission error:', err);
    return 'denied';
  }
}

/**
 * 透過 Service Worker 或 window.Notification 發出嚴格靜音 (silent: true) 通知
 */
export async function sendSilentNotification(payload: {
  title: string;
  body: string;
  tag?: string;
  data?: any;
}): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    console.warn('[NotificationService] Notification API is not available');
    return false;
  }
  if (Notification.permission !== 'granted') {
    console.warn('[NotificationService] Notification permission is not granted:', Notification.permission);
    return false;
  }

  const notificationTag = payload.tag || `weather-alert-${Date.now()}`;
  const notificationOptions: NotificationOptions = {
    body: payload.body,
    icon: './icon-192.png',
    badge: './icon-192.png',
    tag: notificationTag,
    silent: true, // 核心需求：一定要是靜音 (無音效、無震動)
    data: payload.data || { url: './' },
  };

  // 1. 優先嘗試透過 ServiceWorker 顯示通知 (PWA / Mobile Safari / Android 必需)
  if ('serviceWorker' in navigator) {
    try {
      let reg: ServiceWorkerRegistration | null = null;
      try {
        reg = await Promise.race([
          navigator.serviceWorker.ready,
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 1200)),
        ]);
      } catch {
        reg = null;
      }

      if (!reg) {
        reg = (await navigator.serviceWorker.getRegistration()) || null;
      }

      if (reg && typeof reg.showNotification === 'function') {
        await reg.showNotification(payload.title, notificationOptions);
        console.log('[NotificationService] Successfully sent silent notification via ServiceWorker');
        return true;
      }
    } catch (swErr) {
      console.warn('[NotificationService] ServiceWorker showNotification failed, trying fallback:', swErr);
    }
  }

  // 2. 回退嘗試直接使用 window.Notification (桌面瀏覽器或 ServiceWorker 載入中時支援)
  try {
    new Notification(payload.title, notificationOptions);
    console.log('[NotificationService] Successfully sent silent notification via window.Notification');
    return true;
  } catch (notifErr) {
    console.error('[NotificationService] All notification methods failed:', notifErr);
  }

  return false;
}

export const VAPID_PUBLIC_KEY =
  'BGtzxYkBhfX8S3w-i-GEIpcn8iH5eg4hVJmylEGEnJUCwpSoHkKa-pibyDgnyyCM9jDl0gT_r71k1OqFWxfZs3k';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

const STORAGE_KEY_WORKER_URL = 'weather_push_worker_url';

export function getWorkerUrl(): string {
  try {
    return localStorage.getItem(STORAGE_KEY_WORKER_URL) || 'https://weather-push-worker.weather-push-worker.workers.dev';
  } catch {
    return 'https://weather-push-worker.weather-push-worker.workers.dev';
  }
}

export function setWorkerUrl(url: string): void {
  try {
    localStorage.setItem(STORAGE_KEY_WORKER_URL, url.trim().replace(/\/+$/, ''));
  } catch {
    /* ignore */
  }
}

/**
 * 向瀏覽器 PushManager 取得或註冊 Web Push 憑證 (PushSubscription)
 */
export async function getOrRegisterPushSubscription(): Promise<{ sub: PushSubscription | null; error?: string }> {
  if (!isNotificationSupported()) {
    return { sub: null, error: '此瀏覽器不支援 Notification 或 ServiceWorker' };
  }
  const perm = await requestNotificationPermission();
  if (perm !== 'granted') {
    return { sub: null, error: `通知權限狀態為: ${perm} (未被允許)` };
  }

  try {
    let reg = await navigator.serviceWorker.getRegistration();
    if (!reg) {
      const swUrl = import.meta.env.BASE_URL ? `${import.meta.env.BASE_URL.replace(/\/+$/, '')}/sw.js` : './sw.js';
      await navigator.serviceWorker.register(swUrl);
    }
    const readyReg = await navigator.serviceWorker.ready;
    if (!readyReg?.pushManager) {
      return { sub: null, error: '瀏覽器 PushManager 模組尚未就緒，請重新開啟 App' };
    }

    let sub = await readyReg.pushManager.getSubscription();
    if (!sub) {
      const convertedKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      sub = await readyReg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedKey as unknown as BufferSource,
      });
    }
    return { sub };
  } catch (err: any) {
    console.warn('[NotificationService] getOrRegisterPushSubscription error:', err);
    let msg = err?.message || String(err);
    if (msg.includes('user activation') || msg.includes('NotAllowedError')) {
      msg = 'iOS 限制必須手動點擊「確認時間」按鈕授權。若頻繁切換被鎖定，請將桌面 App 向上滑掉完全關閉後重開。';
    }
    return { sub: null, error: msg };
  }
}

/**
 * 將使用者訂閱設定同步給 Cloudflare Worker (定時推播核心)
 */
export async function syncSubscriptionToWorker(params: {
  cityName: string;
  townshipName: string;
  scheduledTime: string;
}): Promise<{ ok: boolean; message: string }> {
  const workerUrl = getWorkerUrl();
  if (!workerUrl) {
    return { ok: false, message: '尚未填寫 Cloudflare Worker 網址' };
  }

  try {
    const { sub, error } = await getOrRegisterPushSubscription();
    if (!sub) {
      return { ok: false, message: `無法取得 PushSubscription: ${error || '請確認已允許通知權限'}` };
    }

    const res = await fetch(`${workerUrl}/api/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscription: sub.toJSON(),
        time: params.scheduledTime,
        cityName: params.cityName,
        townshipName: params.townshipName,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return { ok: false, message: `伺服器回應錯誤: ${err}` };
    }

    return { ok: true, message: `已成功將每日 ${params.scheduledTime} 靜音推播同步至雲端伺服器！` };
  } catch (err: any) {
    console.warn('[NotificationService] syncSubscriptionToWorker error:', err);
    return { ok: false, message: `連線失敗: ${err?.message || err}` };
  }
}

/**
 * 透過 Cloudflare Worker 發送立即測試推播 (真實 Apple/Google 系統級 Web Push)
 */
export async function triggerWorkerTestPush(): Promise<{ ok: boolean; message: string }> {
  const workerUrl = getWorkerUrl();
  if (!workerUrl) {
    return { ok: false, message: '尚未設定 Cloudflare Worker 網址' };
  }

  try {
    const { sub, error } = await getOrRegisterPushSubscription();
    if (!sub) {
      return { ok: false, message: `未取得 PushSubscription: ${error || '請允許通知權限'}` };
    }

    const res = await fetch(`${workerUrl}/api/test-push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscription: sub.toJSON(),
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return { ok: false, message: `伺服器發送失敗: ${err}` };
    }

    return { ok: true, message: '已透過 Cloudflare Worker 成功發送真實雲端 Web Push！' };
  } catch (err: any) {
    return { ok: false, message: `連線錯誤: ${err?.message || err}` };
  }
}
