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
  stationName?: string;
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

export interface SubscriberIndexItem {
  id: string;
  time: string; // "HH:mm" (例如 "06:30")
}

// ── 簡易 IP 限流機制 (防止惡意或迴圈刷 API) ──
const ipRateLimits = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const current = ipRateLimits.get(ip);
  if (!current || now > current.resetAt) {
    ipRateLimits.set(ip, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (current.count >= limit) {
    return false;
  }
  current.count++;
  return true;
}

// ── 訂閱者索引輔助函式（使用 KV Read 讀取，完全不消耗每日僅 1000 次的 List 額度） ──
async function getSubscriberIndex(env: Env): Promise<SubscriberIndexItem[]> {
  try {
    const raw = await env.WEATHER_SUBS.get('sub_index');
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err) {
    console.warn('[KV] Failed to parse sub_index:', err);
    return [];
  }
}

async function saveSubscriberIndex(env: Env, index: SubscriberIndexItem[]): Promise<void> {
  await env.WEATHER_SUBS.put('sub_index', JSON.stringify(index));
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

const CITY_DATASET_MAP: Record<string, string> = {
  '基隆市': 'F-D0047-049',
  '臺北市': 'F-D0047-061',
  '新北市': 'F-D0047-069',
  '桃園市': 'F-D0047-005',
  '新竹市': 'F-D0047-053',
  '新竹縣': 'F-D0047-009',
  '苗栗縣': 'F-D0047-013',
  '臺中市': 'F-D0047-073',
  '彰化縣': 'F-D0047-017',
  '南投縣': 'F-D0047-021',
  '雲林縣': 'F-D0047-025',
  '嘉義市': 'F-D0047-057',
  '嘉義縣': 'F-D0047-029',
  '臺南市': 'F-D0047-077',
  '高雄市': 'F-D0047-065',
  '屏東縣': 'F-D0047-033',
  '宜蘭縣': 'F-D0047-001',
  '花蓮縣': 'F-D0047-041',
  '臺東縣': 'F-D0047-037',
  '澎湖縣': 'F-D0047-045',
  '金門縣': 'F-D0047-085',
  '連江縣（馬祖）': 'F-D0047-081',
  '連江縣': 'F-D0047-081',
};

async function fetchWeatherSummary(
  cityName: string,
  townshipName: string,
  stationName?: string,
  apiKey?: string
): Promise<{ title: string; body: string }> {
  const key = apiKey || 'CWA-AD03D85A-1599-454E-A5F6-DA8F0C1E2EDA';
  const cleanCity = (cityName || '臺北市').trim();
  const cleanTownship = (townshipName || '').trim();
  const cleanStation = (stationName || '').trim();
  const normCity = cleanCity
    .replace(/^台北/, '臺北')
    .replace(/^台中/, '臺中')
    .replace(/^台南/, '臺南')
    .replace(/^台東/, '臺東');

  // 計算台北當前日期字串 (YYYY-MM-DD)
  const d = new Date();
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d);
  const dateMap = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  const todayStr = `${dateMap.year}-${dateMap.month}-${dateMap.day}`;

  const datasetId = CITY_DATASET_MAP[normCity];

  // 1. 優先嘗試查詢該縣市鄉鎮 3 天逐 3 小時精準預報 (F-D0047-0xx)
  if (datasetId && cleanTownship) {
    try {
      const url = `https://opendata.cwa.gov.tw/api/v1/rest/datastore/${datasetId}?Authorization=${key}&LocationName=${encodeURIComponent(cleanTownship)}`;
      const res = await fetch(url);
      if (res.ok) {
        const data: any = await res.json();
        const loc = data.records?.Locations?.[0]?.Location?.[0];
        if (loc) {
          const popEl = loc.WeatherElement?.find((e: any) => e.ElementName === '3小時降雨機率');
          const tempEl = loc.WeatherElement?.find((e: any) => e.ElementName === '溫度');
          const wxEl = loc.WeatherElement?.find((e: any) => e.ElementName === '天氣現象');
          const humEl = loc.WeatherElement?.find((e: any) => e.ElementName === '相對濕度');
          const windEl = loc.WeatherElement?.find((e: any) => e.ElementName === '風速');

          // 計算今日最大降雨機率 (Max 3-hour PoP，與手機端 100% 一致)
          const todayPops = (popEl?.Time || [])
            .filter((t: any) => (t.StartTime || t.DataTime || '').startsWith(todayStr))
            .map((t: any) => parseInt(t.ElementValue?.[0]?.ProbabilityOfPrecipitation, 10))
            .filter((v: number) => !isNaN(v));
          const pop = todayPops.length > 0
            ? Math.max(...todayPops)
            : parseInt(popEl?.Time?.[0]?.ElementValue?.[0]?.ProbabilityOfPrecipitation || '0', 10);

          // 計算今日氣溫區間
          const todayTemps = (tempEl?.Time || [])
            .filter((t: any) => (t.StartTime || t.DataTime || '').startsWith(todayStr))
            .map((t: any) => parseFloat(t.ElementValue?.[0]?.Temperature))
            .filter((v: number) => !isNaN(v));
          const minT = todayTemps.length > 0 ? Math.min(...todayTemps) : 22;
          const maxT = todayTemps.length > 0 ? Math.max(...todayTemps) : 28;

          let currentT = parseFloat(tempEl?.Time?.[0]?.ElementValue?.[0]?.Temperature || '25');
          let RH = parseFloat(humEl?.Time?.[0]?.ElementValue?.[0]?.RelativeHumidity || '65');
          let V = parseFloat(windEl?.Time?.[0]?.ElementValue?.[0]?.WindSpeed || '2');
          let wx = wxEl?.Time?.[0]?.ElementValue?.[0]?.Weather || '多雲';
          let realtimeRainNow = 0;
          let isRealtimeRaining = false;

          // 2. 若有指定測站，加碼查詢全台測站即測資料 (O-A0001-001)
          if (cleanStation) {
            try {
              const stUrl = `https://opendata.cwa.gov.tw/api/v1/rest/datastore/O-A0001-001?Authorization=${key}&StationName=${encodeURIComponent(cleanStation)}`;
              const stRes = await fetch(stUrl);
              if (stRes.ok) {
                const stData: any = await stRes.json();
                const st = stData.records?.Station?.[0];
                if (st) {
                  const airTemp = parseFloat(st.WeatherElement?.AirTemperature);
                  if (!isNaN(airTemp) && airTemp > -50) {
                    currentT = Math.round(airTemp * 10) / 10;
                  }
                  const rain = parseFloat(st.WeatherElement?.Now?.Precipitation);
                  if (!isNaN(rain) && rain >= 0) {
                    realtimeRainNow = rain;
                    if (rain > 0) isRealtimeRaining = true;
                  }
                  const stHum = parseFloat(st.WeatherElement?.RelativeHumidity);
                  if (!isNaN(stHum) && stHum >= 0) RH = stHum;
                  const stWind = parseFloat(st.WeatherElement?.WindSpeed);
                  if (!isNaN(stWind) && stWind >= 0) V = stWind;
                  const stWeather = st.WeatherElement?.Weather;
                  if (stWeather && stWeather !== '-99' && stWeather !== 'None') {
                    wx = stWeather.trim();
                    if (wx.includes('雨')) isRealtimeRaining = true;
                  }
                }
              }
            } catch (stErr) {
              console.warn('[CWA O-A0001-001] Station fetch failed:', stErr);
            }
          }

          const outdoorAT = calculateSteadmanApparentTemp(currentT, RH, V);
          const indoorAT = calculateIndoorApparentTemp(currentT, RH);
          const clothing = getClothingRecommendation(outdoorAT);
          let umbrella = getUmbrellaRecommendation(pop, wx);
          if (isRealtimeRaining) {
            umbrella = realtimeRainNow > 0
              ? `🌧 現場有雨 (${realtimeRainNow}mm) · 務必帶傘`
              : '🌧 現場測站有雨 · 務必帶傘';
          }

          const stationTag = cleanStation ? ` (${cleanStation}測站)` : '';
          const currentTStr = typeof currentT === 'number' ? (Number.isInteger(currentT) ? `${currentT}` : currentT.toFixed(1)) : currentT;

          return {
            title: `🌅 ${cleanCity}${cleanTownship}${stationTag} 晨間氣象快報`,
            body: `🌡️ 當前氣溫 ${currentTStr}°C · 今日 ${minT}°C ~ ${maxT}°C\n🏠 室內體感 ${indoorAT}°C · 🌲 室外體感 ${outdoorAT}°C\n💧 降雨率 ${pop}% · ${wx} (${umbrella})\n👔 穿搭：${clothing}`,
          };
        }
      }
    } catch (err: any) {
      console.warn(`[CWA ${datasetId}] Township fetch failed, falling back to F-D0047-091:`, err);
    }
  }

  // 備援方案 A：全台逐 12 小時預報 (F-D0047-091)
  try {
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
      // 備援方案 B：36 小時預報 (F-C0032-001)
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
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const url = new URL(request.url);
    const clientIp = request.headers.get('cf-connecting-ip') || 'unknown';

    // 1. 取得 VAPID Public Key
    if (url.pathname === '/api/vapid-public-key' && request.method === 'GET') {
      return jsonResponse({ publicKey: env.VAPID_PUBLIC_KEY });
    }

    // 2. 註冊 / 更新推播訂閱 (限制每分鐘同 IP 最多 60 次，支援地點切換時自動無感同步)
    if (url.pathname === '/api/subscribe' && request.method === 'POST') {
      if (!checkRateLimit(clientIp, 60, 60000)) {
        return jsonResponse({ error: '請求過於頻繁，請稍後再試 (Too Many Requests)' }, 429);
      }

      try {
        const body: any = await request.json();
        const { subscription, time, cityName, townshipName, stationName } = body;

        if (!subscription || !subscription.endpoint || !subscription.keys) {
          return jsonResponse({ error: '無效的 PushSubscription' }, 400);
        }

        const id = hashString(subscription.endpoint);

        // 讀取既有紀錄（若已有設定時間，允許地點更新時保留原排程時間）
        let existingRecord: UserSubscriptionRecord | null = null;
        try {
          const rawExisting = await env.WEATHER_SUBS.get(`sub:${id}`);
          if (rawExisting) existingRecord = JSON.parse(rawExisting);
        } catch {}

        const userTime = time || existingRecord?.time || '06:30';
        const record: UserSubscriptionRecord = {
          id,
          subscription,
          time: userTime,
          cityName: cityName || existingRecord?.cityName || '臺北市',
          townshipName: townshipName || existingRecord?.townshipName || '中正區',
          stationName: stationName !== undefined ? stationName : (existingRecord?.stationName || ''),
          updatedAt: new Date().toISOString(),
          lastNotifiedDate: existingRecord?.lastNotifiedDate,
        };

        // 儲存使用者詳細資料
        await env.WEATHER_SUBS.put(`sub:${id}`, JSON.stringify(record));

        // 維護索引清單 sub_index (避免後續排程使用 list() 消耗每日 1000 次配額)
        const index = await getSubscriberIndex(env);
        const existingIdx = index.findIndex((item) => item.id === id);
        if (existingIdx >= 0) {
          index[existingIdx].time = userTime;
        } else {
          index.push({ id, time: userTime });
        }
        await saveSubscriberIndex(env, index);

        return jsonResponse({ ok: true, id, message: '訂閱與地點已成功更新至雲端 KV' });
      } catch (err: any) {
        return jsonResponse({ error: err?.message || '訂閱失敗' }, 500);
      }
    }

    // 3. 取消訂閱
    if (url.pathname === '/api/unsubscribe' && request.method === 'POST') {
      if (!checkRateLimit(clientIp, 10, 60000)) {
        return jsonResponse({ error: '請求過於頻繁，請稍後再試 (Too Many Requests)' }, 429);
      }

      try {
        const body: any = await request.json();
        if (body.endpoint) {
          const id = hashString(body.endpoint);
          await env.WEATHER_SUBS.delete(`sub:${id}`);

          // 從索引清單中移除
          const index = await getSubscriberIndex(env);
          const newIndex = index.filter((item) => item.id !== id);
          if (newIndex.length !== index.length) {
            await saveSubscriberIndex(env, newIndex);
          }
        }
        return jsonResponse({ ok: true, message: '已取消訂閱' });
      } catch (err: any) {
        return jsonResponse({ error: err?.message || '取消訂閱失敗' }, 500);
      }
    }

    // 4. 即時發送測試推播 (限制同 IP 每分鐘最多 5 次測試，避免過度耗用推播閘道)
    if (url.pathname === '/api/test-push' && request.method === 'POST') {
      if (!checkRateLimit(clientIp, 5, 60000)) {
        return jsonResponse({ error: '測試推播發送過於頻繁，請等待 1 分鐘後再試' }, 429);
      }

      try {
        const body: any = await request.json();
        const { subscription, payload: clientPayload, cityName, townshipName, stationName } = body;
        if (!subscription || !subscription.endpoint) {
          return jsonResponse({ error: '缺少 subscription' }, 400);
        }

        let title = clientPayload?.title;
        let bodyText = clientPayload?.body;

        if (!title || !bodyText) {
          const summary = await fetchWeatherSummary(
            cityName || '臺北市',
            townshipName || '',
            stationName || '',
            env.CWA_API_KEY
          );
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

    // 5. 查詢訂閱人數概況 (走 Read 額度，完全不消耗 List 額度)
    if (url.pathname === '/api/subscribers-count' && request.method === 'GET') {
      const index = await getSubscriberIndex(env);
      return jsonResponse({
        count: index.length,
        subscribers: index.map((u) => ({ id: u.id, time: u.time })),
      });
    }

    // 6. 手動觸發 Cron 檢查與診斷 (完全改用索引讀取，不呼叫 list())
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

      const index = await getSubscriberIndex(env);
      logs.push(`Found ${index.length} subscriptions in sub_index`);

      for (const item of index) {
        const raw = await env.WEATHER_SUBS.get(`sub:${item.id}`);
        if (!raw) {
          logs.push(`Item sub:${item.id}: not found in KV`);
          continue;
        }
        const rec = JSON.parse(raw);
        const match = rec.time === currentTimeStr;
        const already = rec.lastNotifiedDate === currentSlotKey;
        logs.push(`Item sub:${item.id}: userTime=${rec.time}, match=${match}, alreadyNotified=${already}`);
      }

      return jsonResponse({ logs });
    }

    // 7. 手動重建索引 (僅供維護時手動執行，平時不會觸發)
    if (url.pathname === '/api/sync-index' && request.method === 'POST') {
      const list = await env.WEATHER_SUBS.list({ prefix: 'sub:' });
      const newIndex: SubscriberIndexItem[] = [];
      for (const key of list.keys) {
        const raw = await env.WEATHER_SUBS.get(key.name);
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            newIndex.push({ id: parsed.id, time: parsed.time || '06:30' });
          } catch {}
        }
      }
      await saveSubscriberIndex(env, newIndex);
      return jsonResponse({ ok: true, syncedCount: newIndex.length });
    }

    return jsonResponse({ status: 'ok', worker: 'weather-push-worker' });
  },

  // ── 每一分鐘由 Cloudflare Cron Trigger 自動喚醒 ──
  // 注意：此處已徹底移除 env.WEATHER_SUBS.list()，完全改用單次 get('sub_index')，
  // 每天僅使用 1,440 次免費 Read 額度（佔 10 萬次上限的 1.4%），徹底解決每日 1000 筆上限問題！
  async scheduled(event: ScheduledEvent, env: Env, _ctx: ExecutionContext): Promise<void> {
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

    // 1. 透過 Read 讀取索引（1 次 Read，0 次 List）
    const index = await getSubscriberIndex(env);
    if (!index || index.length === 0) {
      return;
    }

    // 2. 快速比對：只篩選出「推播時間剛好符合當前這分鐘」的使用者
    const activeSubscribers = index.filter((item) => item.time === currentTimeStr);
    if (activeSubscribers.length === 0) {
      // 本分鐘無任何使用者需要推播，立即結束，不進行多餘的 KV 讀寫
      return;
    }

    console.log(`[Cron] Found ${activeSubscribers.length} subscribers scheduled for ${currentTimeStr}`);

    for (const item of activeSubscribers) {
      const recordRaw = await env.WEATHER_SUBS.get(`sub:${item.id}`);
      if (!recordRaw) continue;

      try {
        const record: UserSubscriptionRecord = JSON.parse(recordRaw);
        // 核對該時段今日尚未發送過
        if (record.lastNotifiedDate !== currentSlotKey) {
          console.log(`[Cron] Fetching real-time weather and sending push to ${record.cityName} ${record.townshipName}`);

          const summary = await fetchWeatherSummary(
            record.cityName,
            record.townshipName,
            record.stationName,
            env.CWA_API_KEY
          );

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
            console.log(`[Cron] Successfully delivered push to sub:${item.id}`);
            record.lastNotifiedDate = currentSlotKey;
            await env.WEATHER_SUBS.put(`sub:${item.id}`, JSON.stringify(record));
          } else {
            console.warn(`[Cron] Push delivery failed for sub:${item.id}:`, pushRes.error);
          }
        }
      } catch (err) {
        console.warn(`[Cron] Failed to process push for sub:${item.id}:`, err);
      }
    }
  },
};
