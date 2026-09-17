# 台灣天氣預報系統 - API 呼叫制度、快取機制與資料結構完整規範文件

本文件詳細說明本專案與中央氣象署（CWA）Open API 對接的呼叫制度、週期頻率、快取判斷機制以及前後端統一資料結構。

---

## 壹、API 呼叫制度與頻率監察報告

### 1. 現行呼叫頻率與觸發制度

本專案採用 **「6 小時時間視窗制度（6-Hour Window Scheduling）」**，對齊中央氣象署每日的 4 次主要預報更新節點：

* **時間視窗起點（UTC+8）**：`00:00`、`06:00`、`12:00`、`18:00`。
* **視窗週期跨度**：每 **6 小時**（360 分鐘）為一個獨立的預報視窗。

```
┌───────────┬───────────┬───────────┬───────────┐
│ 00:00視窗 │ 06:00視窗 │ 12:00視窗 │ 18:00視窗 │
└───────────┴───────────┴───────────┴───────────┘
```

#### 自動輪詢／排程觸發機制 (`msUntilNextWindow`)
系統不會無節制地每分每秒發送 Request，而是精確計算當前時間距離下一個 6 小時整點起點的毫秒數：
$$\Delta t = \text{NextWindowStart} - \text{CurrentTime}$$
* 範例：若使用者在 14:20 打開網頁，距離下一個視窗起點（18:00）尚有 3 小時 40 分鐘。系統會透過 `setTimeout` 設定在 18:00:00 自動喚醒並發出 `mutate()` 重新拉取新預報。
* 重新拉取完成後，立即遞迴預約下一次視窗（24:00）的排程，達成真正的低耗能定時同步。

---

### 2. 快取優先檢查機制 (`Cache-First`)

為了防止使用者頻繁刷新頁面或切換元件導致 API 額度超載，系統結合了 **`localStorage` 本地儲存** 與 **SWR 資料請求快取**：

1. **檢查快取有效性 (`isCacheValid`)**：
   * 檢查本地鍵值 `weather_cities_cache_v2`。
   * 比對快取資料中的 `fetchedAt`（抓取時間戳記）是否落在當前 6 小時視窗內：
     $$\text{WindowStart} \le \text{fetchedAt} < \text{WindowEnd}$$
2. **快取有效時（命中 Cache）**：
   * `getSWRKey()` 回傳 `null`。
   * **完全跳過任何網路 Request，發送 0 個 API 請求**。
   * 直接將快取資料灌入 Zustand 全域 Store，實現「零延遲、首屏秒開」。
3. **快取無效／過期／初次造訪時**：
   * `getSWRKey()` 啟用 `'ALL_CITIES_WEATHER_DATA'`。
   * 觸發網路請求發送，獲取成功後自動寫入 `localStorage`，記錄最新的 `fetchedAt`。

---

### 3. 單次抓取規模與併發架構 (`Promise.all`)

* **呼叫來源**：交通部中央氣象署開放資料平台（CWA OpenData API）。
* **資料集代碼**：`F-D0047-001` ～ `F-D0047-085`（包含台灣 22 個縣市之鄉鎮天氣預報）。
* **併發處理**：
  每次執行網路抓取時，前端以 `Promise.all` **同時併發發出 22 個 HTTP GET 請求**：
  ```ts
  const promises = CITIES.map(async (city) => {
    const url = `https://opendata.cwa.gov.tw/api/v1/rest/datastore/${city.id}?Authorization=${AUTH_KEY}`;
    const res = await axios.get<ApiResponse>(url);
    return parseCityApiResponse(res.data, city.name, city.id);
  });
  const allCitiesData = await Promise.all(promises);
  ```
  這確保了全台 22 縣市的天氣預報資料具備完全一致的時間基準。

---

### 4. SWR 防重複與去重保護

* `revalidateOnFocus: false`：切換瀏覽器分頁或視窗切回時，不重新請求。
* `revalidateOnReconnect: false`：斷線重連時，不立即重發，避免重連震盪。
* `dedupingInterval: 60000`（60 秒）：1 分鐘內如果有多個元件同時觸發 mutate，強制去重合併為單次請求。

---

### 5. 手動強制更新機制 (`Manual Refresh`)

* 使用者點擊頂部導航列的「重新整理」按鈕時：
  1. 呼叫 `clearCache()` 移除 `localStorage` 中的快取記錄。
  2. 呼叫 SWR 的 `refetch()` (`mutate()`)。
  3. 強制併發重新向中央氣象署請求 22 個縣市資料並刷新全站狀態。

---

## 貳、API 呼叫與快取決策流程圖

```mermaid
flowchart TD
    Start([使用者造訪 / 開啟頁面]) --> ReadStorage[讀取 localStorage: weather_cities_cache_v2]
    ReadStorage --> CheckValid{isCacheValid ?<br/>fetchedAt 在當前 6hr 視窗內?}
    
    CheckValid -- 是 (快取有效) --> LoadCache[直接載入快取至 Zustand Store]
    LoadCache --> SWRNull[SWR Key = null: 跳過網路請求]
    SWRNull --> CalcNext[計算距下個視窗毫秒數 msUntilNextWindow]
    
    CheckValid -- 否 (無快取或跨時段) --> FetchAPI[Promise.all 併發發送 22 縣市 API 請求]
    FetchAPI --> Parse[解析為 ParsedCityData 統一資料模型]
    Parse --> WriteCache[寫入 localStorage 並記錄 fetchedAt]
    WriteCache --> UpdateStore[更新 Zustand Store 全域狀態]
    UpdateStore --> CalcNext
    
    CalcNext --> SetTimeout[設定 setTimeout 定時器]
    SetTimeout --> NextWindow{到達下一個整點視窗<br/>00:00, 06:00, 12:00, 18:00?}
    NextWindow -- 是 --> FetchAPI
    
    UserClick([使用者點擊手動重新整理]) --> ClearCache[clearCache: 清空 localStorage]
    ClearCache --> FetchAPI
```

---

## 參、系統資料結構規範 (Data Structure Schema)

### 1. 中央氣象署 (CWA) 原始 API 回傳結構

```ts
// 氣象署單一時段因子值
export interface TimeEntry {
  DataTime?: string;                          // 觀測/預報時間點 (ISO 字串)
  StartTime?: string;                         // 預報時段起點
  EndTime?: string;                           // 預報時段終點
  ElementValue: Record<string, string>[];     // 具體數值物件陣列，如 [{ Temperature: "28" }]
}

// 氣象署天氣因子物件
export interface WeatherElement {
  ElementName: string;                        // 因子名稱: 天氣現象 / 溫度 / 相對濕度 / 舒適度指數 / 風向 / 風速 / 3小時降雨機率 等
  Time: TimeEntry[];                          // 時段資料清單
}

// 鄉鎮行政區物件
export interface Location {
  LocationName: string;                       // 鄉鎮市區名稱，如「中正區」、「板橋區」
  Geocode: string;                            // 地理代碼
  Latitude: string;                           // 緯度
  Longitude: string;                          // 經度
  WeatherElement: WeatherElement[];           // 該鄉鎮包含的所有氣象因子
}

// 縣市資料集容器
export interface Locations {
  DatasetDescription: string;                 // 資料集描述
  LocationsName: string;                      // 縣市名稱，如「臺北市」
  Dataid: string;                             // 資料集代碼，如「D0047-061」
  Location: Location[];                       // 該縣市轄下所有鄉鎮陣列
}

// CWA 頂層 API 回應包裝
export interface ApiResponse {
  success: string;                            // "true"
  result: {
    resource_id: string;
    fields: { id: string; type: string }[];
  };
  records: {
    Locations: Locations[];
  };
}
```

---

### 2. 前端解析後的正規化資料模型 (Normalized Domain Model)

#### (1) `WeatherPeriod`（單一 3 小時預報核心結構）
將氣象署深層嵌套的 `WeatherElement` 解析展平成單一平鋪的高效物件：

```ts
export interface WeatherPeriod {
  startTime: string;                  // 時段起點 (YYYY-MM-DDTHH:mm:ss+08:00)
  endTime: string;                    // 時段終點 (YYYY-MM-DDTHH:mm:ss+08:00)
  
  // ── 溫度指標 ──
  temperature: string;                // 實測/預估平均氣溫 (°C)
  maxTemperature: string;             // 最高氣溫 (°C)
  minTemperature: string;             // 最低氣溫 (°C)
  maxApparentTemperature: string;     // 最高體感溫度 (°C)
  minApparentTemperature: string;     // 最低體感溫度 (°C)
  
  // ── 水氣與濕度 ──
  relativeHumidity: string;           // 相對濕度 (%)
  dewPoint: string;                   // 露點溫度 (°C)
  probabilityOfPrecipitation: string; // 3 小時降雨機率 (%)
  
  // ── 舒適度 ──
  maxComfortIndex: string;            // 舒適度指數數值 (如 24)
  maxComfortIndexDescription: string; // 舒適度描述 (舒適 / 偏涼 / 悶熱 / 寒冷)
  minComfortIndex: string;            // 最低舒適度指數
  minComfortIndexDescription: string; // 最低舒適度描述
  
  // ── 風況 ──
  windDirection: string;              // 風向 (如「東北風」、「偏南風」)
  windSpeed: string;                  // 平均風速 (m/s)
  beaufortScale: string;              // 蒲福風級 (0~12 級)
  
  // ── 天氣現象 ──
  weather: string;                    // 天氣名稱 (晴時多雲 / 短暫陣雨 等)
  weatherCode: string;                // 氣象局天氣代碼 (如 01, 02) -> 用於對應 SVG 動態圖示
  weatherDescription: string;         // 天氣預報綜合描述文字
  
  // ── 紫外線 ──
  uvIndex: string;                    // 紫外線指數 (0~12)
  uvExposureLevel: string;            // 紫外線等級 (低量級 / 中量級 / 高量級 / 過量級 / 危險級)
}
```

#### (2) `ParsedTownshipData`（鄉鎮層級）
```ts
export interface ParsedTownshipData {
  townshipName: string;               // 鄉鎮市區名稱 (如「新店區」)
  geocode: string;                    // 地理編碼
  latitude: string;                   // 緯度座標
  longitude: string;                  // 經度座標
  periods: WeatherPeriod[];           // 未來 3 天逐 3 小時預報陣列 (約 24 個時段)
}
```

#### (3) `ParsedCityData`（縣市層級）
```ts
export interface ParsedCityData {
  cityName: string;                   // 縣市名稱 (如「新北市」)
  datasetId: string;                  // 氣象局資料代碼 (如「F-D0047-069」)
  townships: ParsedTownshipData[];    // 轄下鄉鎮區清單
}
```

#### (4) `CachedData`（本地快取結構）
```ts
export interface CachedData {
  fetchedAt: string;                  // 資料拉取時的 ISO 8601 時間字串
  cities: ParsedCityData[];           // 全台 22 縣市完整預報資料
}
```

---

### 3. Zustand 全域狀態結構 (`weatherStore`)

負責管理全域當前選擇、分頁切換與時段對應：

```ts
export interface WeatherState {
  // 資料集
  cities: ParsedCityData[];
  setCities: (cities: ParsedCityData[]) => void;
  
  // 當前選取縣市與鄉鎮
  selectedCity: string;               // 預設 '臺北市'
  setSelectedCity: (city: string) => void;
  selectedTownship: string;           // 預設 '' (自動選取該縣市第 1 個鄉鎮)
  setSelectedTownship: (township: string) => void;
  
  // 當前瀏覽 Tab 分類
  activeTab: TabCategory;             // 'overview' | 'temperature' | 'wind' | 'rain' | 'comfort'
  setActiveTab: (tab: TabCategory) => void;
  
  // 當前點擊聚焦的時段起點時間戳
  selectedPeriodTime: string | null;  // 為 null 時自動對應系統當前時刻所屬時段
  setSelectedPeriodTime: (time: string | null) => void;
  
  // 狀態與時間戳
  lastFetchedAt: string | null;
  setLastFetchedAt: (time: string | null) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  error: string | null;
  setError: (error: string | null) => void;
}
```

---

## 肆、全系統圖形化 (圓形圖) 視覺規範總結

為消除傳統純文字條列、提升視覺美感並放大易讀性，本專案已完成以下視覺革新：

1. **溫度維度 (`TemperaturePanel`)**：
   * 移除原本單調的橫向線條條狀圖（線條圖）。
   * 改用精緻的 **SVG 圓形進度環 (`CircularGauge`)**：
     * Hero 頂部：170px 大型即時氣溫圓形儀表 + 4 個 110px 圓形統計指標（最高溫、最低溫、體感溫度、露點溫度）。
     * 逐時時段：每張時段卡片配置 3 顆圓形圖（預估氣溫環、體感溫度環、露點溫度環），色彩隨溫度動態漸變。
2. **舒適度維度 (`ComfortPanel`)**：
   * 告別純文字與小型 Chip 條列。
   * 全面導入 **圓形舒適度指數儀表 (`CircularGauge`)**：
     * Hero 頂部：170px 舒適度圓形環 + 舒適度指數環、體感溫環、相對濕度環。
     * 逐時時段：配置 3 顆圓形指標（舒適度狀態環、體感溫度環、相對濕度環）。
3. **降雨與風況維度 (`RainPanel`, `WindPanel`)**：
   * 降雨 Tab 採用降雨率圓形環、濕度圓形環與紫外線/露點圓形環。
   * 風況 Tab 結合風向動態導航羅盤與風速/蒲福風級圓形儀表，確保全系統視覺語言高度一致。
4. **字體全面放大優化**：
   * 移除全站 11px 小字，次要說明文字提升至 13px～14.5px。
   * 卡片標題提升至 16px～18px，主要數值採用 20px～38px+ 加粗顯示，不論在手機或大螢幕均清晰醒目。
