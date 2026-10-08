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

async function fetchWeatherSummary(
  cityName: string,
  townshipName: string,
  apiKey?: string
): Promise<{ title: string; body: string }> {
  const key = apiKey || 'CWA-AD03D85A-1599-454E-A5F6-DA8F0C1E2EDA';
  const cleanCity = (cityName || '臺北市').trim();
  const cleanTownship = (townshipName || '').trim();

  try {
    const url = `https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-C0032-001?Authorization=${key}&locationName=${encodeURIComponent(cleanCity)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`CWA API 回應代碼: ${res.status}`);
    const data: any = await res.json();
    const loc = data.records?.location?.[0];
    if (!loc) throw new Error('未找到氣象資料');

    const elements: Record<string, string> = {};
    for (const el of loc.weatherElement || []) {
      elements[el.elementName] = el.time?.[0]?.parameter?.parameterName || '';
    }

    const minT = elements.MinT ? parseInt(elements.MinT, 10) : 22;
    const maxT = elements.MaxT ? parseInt(elements.MaxT, 10) : 28;
    const pop = elements.PoP ? parseInt(elements.PoP, 10) : 0;
    const wx = elements.Wx || '多雲';
    const currentEst = Math.round((minT * 2 + maxT) / 3);

    // 帶傘建議
    const isRain = wx.includes('雨') || pop >= 30;
    const umbrellaTip = isRain
      ? (pop >= 50 ? '🌧 降雨機率高 · 務必帶傘' : '☂️ 局部短暫雨 · 建議攜折疊傘')
      : '☀️ 降雨機率低 · 無需攜傘';

    // 穿衣建議
    let clothTip = '短袖輕裝';
    if (maxT >= 30 || minT >= 26) {
      clothTip = '清涼透氣短袖，注意防曬補水';
    } else if (minT >= 22) {
      clothTip = '舒適短袖或透氣襯衫';
    } else if (minT >= 18) {
      clothTip = '薄長袖配薄外套，注意溫差';
    } else if (minT >= 15) {
      clothTip = '長袖搭配厚夾克，防風保暖';
    } else {
      clothTip = '保暖毛衣與防寒大衣，慎防受寒';
    }

    return {
      title: `🌅 ${cleanCity}${cleanTownship} 晨間氣象`,
      body: `🌡️ 當前約 ${currentEst}°C (今日 ${minT}°C ~ ${maxT}°C)\n💧 降雨率 ${pop}% · ${wx} (${umbrellaTip})\n👔 穿搭：${clothTip}`,
    };
  } catch (err: any) {
    console.warn('[CWA] fetch error:', err);
    return {
      title: `🌅 ${cleanCity}${cleanTownship} 晨間氣象快報`,
      body: `🌡️ 晨間氣象已更新，出門請留意氣溫與溫差。\n💧 建議留意降雨機率並攜帶雨具。\n👔 建議採多層次洋蔥式穿搭。`,
    };
  }
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
        options: { ttl: 86400, urgency: 'normal' },
      },
      {
        endpoint: subscription.endpoint,
        keys: subscription.keys,
        expirationTime: null,
      },
      vapid
    );

    const res = await fetch(subscription.endpoint, {
      method: pushRequest.method,
      headers: pushRequest.headers,
      body: pushRequest.body,
    });

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
        const { subscription, payload: clientPayload, cityName, townshipName } = body;
        if (!subscription || !subscription.endpoint) {
          return jsonResponse({ error: '缺少 subscription' }, 400);
        }

        let title = clientPayload?.title;
        let bodyText = clientPayload?.body;

        if (!title || !bodyText) {
          const summary = await fetchWeatherSummary(cityName || '臺北市', townshipName || '', env.CWA_API_KEY);
          title = title || summary.title;
          bodyText = bodyText || summary.body;
        }

        const payload = {
          title: title || '🌅 晨間氣象快報',
          body: bodyText || '今日氣溫與降雨機率已更新。',
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
          console.log(`[Cron] Fetching real-time weather and sending push to ${record.cityName} ${record.townshipName}`);

          const summary = await fetchWeatherSummary(record.cityName, record.townshipName, env.CWA_API_KEY);

          const payload = {
            title: `${summary.title} (${record.time})`,
            body: summary.body,
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
