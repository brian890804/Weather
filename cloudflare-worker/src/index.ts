import { buildPushPayload } from '@block65/webcrypto-web-push';

export interface Env {
  WEATHER_SUBS: KVNamespace;
  VAPID_PUBLIC_KEY: string;
  VAPID_PRIVATE_KEY: string;
  VAPID_SUBJECT: string;
  CWA_API_KEY?: string;
}

export interface UserSubscriptionRecord {
  id: string;
  subscription: {
    endpoint: string;
    keys: {
      p256dh: string;
      auth: string;
    };
  };
  time: string; // "HH:mm" (例如 "06:30")
  cityName: string;
  townshipName: string;
  updatedAt: string;
  lastNotifiedDate?: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
  });
}

function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

async function sendWorkerPush(
  subscription: UserSubscriptionRecord['subscription'],
  payloadData: any,
  env: Env
): Promise<{ ok: boolean; status?: number; error?: string }> {
  try {
    const vapid = {
      subject: env.VAPID_SUBJECT || 'mailto:weather-app@example.com',
      publicKey: env.VAPID_PUBLIC_KEY,
      privateKey: env.VAPID_PRIVATE_KEY,
    };

    const pushRequest = await buildPushPayload(
      {
        data: JSON.stringify(payloadData),
        options: { ttl: 86400, urgency: 'low' },
      },
      subscription,
      vapid
    );
    // 確保設定 RFC 8030 Urgency: low Header (低優先級、背景靜音)
    try {
      pushRequest.headers.set('Urgency', 'low');
    } catch {
      /* ignore */
    }

    const res = await fetch(subscription.endpoint, pushRequest);
    if (!res.ok) {
      const errText = await res.text();
      return { ok: false, status: res.status, error: errText };
    }
    return { ok: true, status: res.status };
  } catch (err: any) {
    return { ok: false, error: err?.message || String(err) };
  }
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const url = new URL(request.url);

    // 1. 取得 VAPID Public Key
    if (url.pathname === '/api/vapid-public-key' && request.method === 'GET') {
      return jsonResponse({ publicKey: env.VAPID_PUBLIC_KEY });
    }

    // 2. 註冊 / 更新推播訂閱
    if (url.pathname === '/api/subscribe' && request.method === 'POST') {
      try {
        const body: any = await request.json();
        const { subscription, time, cityName, townshipName } = body;

        if (!subscription || !subscription.endpoint || !subscription.keys) {
          return jsonResponse({ error: '無效的 PushSubscription' }, 400);
        }

        const id = hashString(subscription.endpoint);
        const record: UserSubscriptionRecord = {
          id,
          subscription,
          time: time || '06:30',
          cityName: cityName || '臺北市',
          townshipName: townshipName || '中正區',
          updatedAt: new Date().toISOString(),
        };

        await env.WEATHER_SUBS.put(`sub:${id}`, JSON.stringify(record));
        return jsonResponse({ ok: true, id, message: '訂閱成功儲存' });
      } catch (err: any) {
        return jsonResponse({ error: err?.message || '訂閱失敗' }, 500);
      }
    }

    // 3. 取消訂閱
    if (url.pathname === '/api/unsubscribe' && request.method === 'POST') {
      try {
        const body: any = await request.json();
        if (body.endpoint) {
          const id = hashString(body.endpoint);
          await env.WEATHER_SUBS.delete(`sub:${id}`);
        }
        return jsonResponse({ ok: true, message: '已取消訂閱' });
      } catch (err: any) {
        return jsonResponse({ error: err?.message || '取消訂閱失敗' }, 500);
      }
    }

    // 4. 即時發送測試推播 (驗證真實 Apple/Google Web Push 通道)
    if (url.pathname === '/api/test-push' && request.method === 'POST') {
      try {
        const body: any = await request.json();
        const { subscription } = body;
        if (!subscription || !subscription.endpoint) {
          return jsonResponse({ error: '缺少 subscription' }, 400);
        }

        const payload = {
          title: '🌅 雲端靜音天氣推播 (測試)',
          body: '這是由 Cloudflare Worker 發送的真實系統級 Web Push！\n即便網頁完全關閉，手機也能準時收到。',
          tag: `test-push-${Date.now()}`,
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          silent: true,
        };

        const result = await sendWorkerPush(subscription, payload, env);
        if (!result.ok) {
          return jsonResponse({ error: `發送失敗: ${result.error || result.status}` }, 500);
        }

        return jsonResponse({ ok: true, message: '推播已成功送達 Apple/Google 伺服器！' });
      } catch (err: any) {
        return jsonResponse({ error: `發送失敗: ${err?.message || err}` }, 500);
      }
    }

    // 5. 手動觸發 Cron 檢查與診斷 (供排查使用)
    if (url.pathname === '/api/cron-check') {
      const logs: string[] = [];
      const d = new Date();
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Taipei',
        hour12: false,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }).formatToParts(d);
      const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
      const currentHour = map.hour === '24' ? '00' : map.hour;
      const currentTimeStr = `${currentHour}:${map.minute}`;
      const todayStr = `${map.year}-${map.month}-${map.day}`;
      const currentSlotKey = `${todayStr}_${currentTimeStr}`;

      logs.push(`Taipei Now: ${currentTimeStr} (${todayStr}), slot: ${currentSlotKey}`);

      const list = await env.WEATHER_SUBS.list({ prefix: 'sub:' });
      logs.push(`Found ${list.keys.length} subscriptions in KV`);

      for (const item of list.keys) {
        const raw = await env.WEATHER_SUBS.get(item.name);
        if (!raw) continue;
        const rec = JSON.parse(raw);
        const match = rec.time === currentTimeStr;
        const already = rec.lastNotifiedDate === currentSlotKey;
        logs.push(`Item ${item.name}: userTime=${rec.time}, match=${match}, alreadyNotified=${already}`);
      }

      return jsonResponse({ logs });
    }

    return jsonResponse({ status: 'ok', worker: 'weather-push-worker' });
  },

  // ── 每一分鐘由 Cloudflare Cron Trigger 自動喚醒 ──
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    const d = new Date();
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Taipei',
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).formatToParts(d);
    const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
    const currentHour = map.hour === '24' ? '00' : map.hour;
    const currentTimeStr = `${currentHour}:${map.minute}`;
    const todayStr = `${map.year}-${map.month}-${map.day}`;
    const currentSlotKey = `${todayStr}_${currentTimeStr}`;

    console.log(`[Cron] Running check at Taipei time ${currentTimeStr} (${todayStr})`);

    // 列出所有使用者訂閱
    const list = await env.WEATHER_SUBS.list({ prefix: 'sub:' });
    for (const item of list.keys) {
      const recordRaw = await env.WEATHER_SUBS.get(item.name);
      if (!recordRaw) continue;

      try {
        const record: UserSubscriptionRecord = JSON.parse(recordRaw);
        // 核對當前分鐘是否與使用者設定時間相符，且該時段今日尚未發送過
        if (record.time === currentTimeStr && record.lastNotifiedDate !== currentSlotKey) {
          console.log(`[Cron] Sending scheduled morning weather to ${record.cityName} ${record.townshipName}`);

          const title = `🌅 ${record.cityName}${record.townshipName} 晨間氣象 (${record.time})`;
          const body = `🌡️ 今日晨間天氣快報已更新\n💧 出門請留意降雨機率與溫差\n👔 建議採多層次洋蔥式穿搭，並留意是否備傘。`;

          const payload = {
            title,
            body,
            tag: `weather-daily-${currentSlotKey}`,
            icon: '/icon-192.png',
            badge: '/icon-192.png',
            silent: true,
          };

          const pushRes = await sendWorkerPush(record.subscription, payload, env);
          if (pushRes.ok) {
            console.log(`[Cron] Successfully delivered push to ${item.name}`);
            record.lastNotifiedDate = currentSlotKey;
            await env.WEATHER_SUBS.put(item.name, JSON.stringify(record));
          } else {
            console.warn(`[Cron] Push delivery failed for ${item.name}:`, pushRes.error);
          }
        }
      } catch (err) {
        console.warn(`[Cron] Failed to process push for ${item.name}:`, err);
      }
    }
  },
};
