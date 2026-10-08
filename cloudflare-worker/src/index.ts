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

// ── 氣象署 Steadman 體感溫度計算公式（與前端系統完全一致） ──
function calculateSteadmanApparentTemp(T: number, RH: number, V: number): number {
  const clampedRH = Math.max(0, Math.min(100, RH));
  const clampedV = Math.max(0, V);
  const e = (clampedRH / 100) * 6.105 * Math.exp((17.27 * T) / (237.7 + T));
  const at = 1.04 * T + 0.2 * e - 0.65 * clampedV - 2.7;
  return Math.round(at * 10) / 10;
}

// ── 室內 / 弱風遮蔽環境體感溫度公式 (V = 0) ──
function calculateIndoorApparentTemp(T: number, RH: number): number {
  const clampedRH = Math.max(0, Math.min(100, RH));
  const e = (clampedRH / 100) * 6.105 * Math.exp((17.27 * T) / (237.7 + T));
  const at = 1.04 * T + 0.2 * e - 2.7;
  return Math.round(at * 10) / 10;
}

// ── 穿衣指引（依室外體感溫度嚴格判定） ──
function getClothingRecommendation(outdoorAT: number): string {
  if (outdoorAT >= 30) {
    return '清涼透氣（短袖為宜，注意防曬補水）';
  } else if (outdoorAT >= 25) {
    return '短袖輕裝（短袖衣物，通風舒適）';
  } else if (outdoorAT >= 20) {
    return '薄款外套（薄外套或薄長袖）';
  } else if (outdoorAT >= 15) {
    return '保暖衣物（長袖毛衣或風衣保暖）';
  } else {
    return '厚實防寒（羽絨厚外套，注意防寒）';
  }
}

// ── 雨具指引（依降雨機率與降雨現象判定） ──
function getUmbrellaRecommendation(pop: number, wx: string): string {
  const isRaining = wx.includes('雨') || wx.includes('雷');
  if (isRaining || pop >= 40) {
    return isRaining ? '🌧 現場有雨 · 務必帶傘' : '🌧 降雨機率高 · 務必攜傘';
  } else if (pop >= 10) {
    return '☂️ 局部短暫雨 · 建議備折疊傘';
  } else {
    return '☀️ 無需攜傘';
  }
}

async function fetchWeatherSummary(
  cityName: string,
  townshipName: string,
  apiKey?: string
): Promise<{ title: string; body: string }> {
  const key = apiKey || 'CWA-AD03D85A-1599-454E-A5F6-DA8F0C1E2EDA';
  const cleanCity = (cityName || '臺北市').trim();
  const cleanTownship = (townshipName || '').trim();
  const normCity = cleanCity
    .replace(/^台北/, '臺北')
    .replace(/^台中/, '臺中')
    .replace(/^台南/, '臺南')
    .replace(/^台東/, '臺東');

  try {
    // 優先查詢氣象署各縣市鄉鎮 3 天精準預報 (F-D0047-091)
    const url = `https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-D0047-091?Authorization=${key}&LocationName=${encodeURIComponent(normCity)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`F-D0047-091 HTTP ${res.status}`);
    const data: any = await res.json();
    const loc = data.records?.Locations?.[0]?.Location?.[0];
    if (!loc) throw new Error('未取得 Location 資料');

    const elMap: Record<string, string> = {};
    for (const el of loc.WeatherElement || []) {
      const val = el.Time?.[0]?.ElementValue?.[0];
      if (val) {
        if (typeof val.Temperature === 'string') elMap['T'] = val.Temperature;
        if (typeof val.MaxTemperature === 'string') elMap['MaxT'] = val.MaxTemperature;
        if (typeof val.MinTemperature === 'string') elMap['MinT'] = val.MinTemperature;
        if (typeof val.RelativeHumidity === 'string') elMap['RH'] = val.RelativeHumidity;
        if (typeof val.WindSpeed === 'string') elMap['V'] = val.WindSpeed;
        if (typeof val.ProbabilityOfPrecipitation === 'string') elMap['PoP'] = val.ProbabilityOfPrecipitation;
        if (typeof val.Weather === 'string') elMap['Wx'] = val.Weather;
      }
    }

    const T = parseFloat(elMap['T'] || '26');
    const maxT = parseFloat(elMap['MaxT'] || String(T));
    const minT = parseFloat(elMap['MinT'] || String(T));
    const RH = parseFloat(elMap['RH'] || '65');
    const V = parseFloat(elMap['V'] || '2');
    const pop = parseInt(elMap['PoP'] || '0', 10);
    const wx = elMap['Wx'] || '多雲';

    const outdoorAT = calculateSteadmanApparentTemp(T, RH, V);
    const indoorAT = calculateIndoorApparentTemp(T, RH);
    const clothing = getClothingRecommendation(outdoorAT);
    const umbrella = getUmbrellaRecommendation(pop, wx);

    return {
      title: `🌅 ${cleanCity}${cleanTownship} 晨間氣象快報`,
      body: `🌡️ 當前氣溫 ${T}°C · 今日 ${minT}°C ~ ${maxT}°C\n🏠 室內體感 ${indoorAT}°C · 🌲 室外體感 ${outdoorAT}°C\n💧 降雨率 ${pop}% · ${wx} (${umbrella})\n👔 穿搭：${clothing}`,
    };
  } catch (err: any) {
    console.warn('[CWA F-D0047-091] fallback to F-C0032-001:', err);
    try {
      // 備援方案：36 小時預報 (F-C0032-001)
      const url2 = `https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-C0032-001?Authorization=${key}&locationName=${encodeURIComponent(normCity)}`;
      const res2 = await fetch(url2);
      const data2: any = await res2.json();
      const loc2 = data2.records?.location?.[0];
      const elements2: Record<string, string> = {};
      for (const el of loc2?.weatherElement || []) {
        elements2[el.elementName] = el.time?.[0]?.parameter?.parameterName || '';
      }
      const minT2 = elements2.MinT ? parseFloat(elements2.MinT) : 22;
      const maxT2 = elements2.MaxT ? parseFloat(elements2.MaxT) : 28;
      const pop2 = elements2.PoP ? parseInt(elements2.PoP, 10) : 0;
      const wx2 = elements2.Wx || '多雲';
      const T2 = Math.round((minT2 * 2 + maxT2) / 3);
      const outdoorAT2 = calculateSteadmanApparentTemp(T2, 65, 2);
      const indoorAT2 = calculateIndoorApparentTemp(T2, 65);
      const clothing2 = getClothingRecommendation(outdoorAT2);
      const umbrella2 = getUmbrellaRecommendation(pop2, wx2);

      return {
        title: `🌅 ${cleanCity}${cleanTownship} 晨間氣象快報`,
        body: `🌡️ 當前約 ${T2}°C · 今日 ${minT2}°C ~ ${maxT2}°C\n🏠 室內體感 ${indoorAT2}°C · 🌲 室外體感 ${outdoorAT2}°C\n💧 降雨率 ${pop2}% · ${wx2} (${umbrella2})\n👔 穿搭：${clothing2}`,
      };
    } catch {
      return {
        title: `🌅 ${cleanCity}${cleanTownship} 晨間氣象快報`,
        body: `🌡️ 今日晨間氣象已更新，出門請留意氣溫與溫差。\n💧 建議留意降雨機率並攜帶雨具。\n👔 建議採多層次洋蔥式穿搭。`,
      };
    }
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
