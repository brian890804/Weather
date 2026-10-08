/// <reference lib="webworker" />
import { precacheAndRoute } from 'workbox-precaching';

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ revision: string | null; url: string }>;
};

// Precache resources handled by VitePWA
precacheAndRoute(self.__WB_MANIFEST || []);

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event: ExtendableEvent) => {
  event.waitUntil(self.clients.claim());
});

// 監聽 Push 推播訊息 (配合未來後端 Web Push 或測試觸發)
self.addEventListener('push', (event: PushEvent) => {
  let data: {
    title?: string;
    body?: string;
    icon?: string;
    badge?: string;
    tag?: string;
    data?: any;
  } = {};

  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data = { body: event.data.text() };
    }
  }

  const title = data.title || '天氣預報 · 晨間氣象快報';
  const options: NotificationOptions = {
    body: data.body || '今日天氣提醒',
    icon: data.icon || '/icon-192.png',
    badge: data.badge || '/icon-192.png',
    tag: data.tag || `weather-${Date.now()}`,
    silent: true,
    data: data.data || { url: '/' },
  };

  event.waitUntil(
    self.registration.showNotification(title, options).catch((err) => {
      console.error('[SW] showNotification error:', err);
    })
  );
});

// 點擊通知開啟或聚焦應用程式
self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // 若已有視窗開著，切換過去
      for (const client of windowClients) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      // 否則開啟新視窗
      if (self.clients.openWindow) {
        return self.clients.openWindow('./');
      }
    })
  );
});
