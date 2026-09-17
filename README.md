# 🌤️ 台灣各縣市即時天氣預報系統 (Taiwan Weather Forecast)

一套現代化、高性能且視覺優雅的台灣天氣預報 Web 應用程式。整合**交通部中央氣象署 (CWA) 開放資料 API**，提供全台 22 縣市、368 鄉鎮市區未來 3 天逐 3 小時的高精準氣象資訊。

---

## 🌟 核心特色

### 1. 22 縣市與 368 鄉鎮市區全台覆蓋
* **雙層導覽體系**：第一層大標籤快速切換全台 22 個縣市；第二層膠囊選單秒切各鄉鎮市區。
* **資料基準時間完全同步**：透過 `Promise.all` 併發拉取全台資料，確保全台氣象基準時間完全一致。

### 2. 五大氣象維度專業面板
系統提供多維度天氣視圖，上方具備即時英雄數據看板，滿足不同使用場景需求：
* 📊 **總覽面板 (Overview)**：統整實測氣溫、體感溫度、降雨機率、相對濕度、平均風速、風向風級、露點溫度與舒適指數 8 大氣象指標。
* 🌡️ **溫度面板 (Temperature)**：呈現即時氣溫、最高／最低溫與人體體感溫度。
* 💨 **風況面板 (Wind)**：提供 360 度動態風向導航羅盤、蒲福風級標籤、風力等級中文與風速（m/s）。
* 🌧️ **降雨面板 (Rain)**：最高降雨機率視覺化進度條、相對濕度、露點溫度與紫外線指數（UV）。
* 😊 **舒適度面板 (Comfort)**：直覺的舒適感受表情徽章、舒適度指數、體感溫濕度綜合呈現。

### 3. 水平滑動與滑鼠拖曳卡片 (Drag-to-Scroll)
* **無縫左右拖動**：所有分頁下半部的時段卡片列均支援滑鼠按住左鍵任意左右拖曳（`grab` / `grabbing` 手勢）、手機觸控滑動及觸控板平滑捲動。
* **智慧防誤觸機制**：系統自動區分「拖曳滾動」與「單擊選取」，拖動卡片時不會誤觸選中，放開後純點擊才會切換時段。
* **聯動英雄看板**：點擊任意時段卡片即高亮選中，上方英雄看板同步更新為該時段的詳細數值。

### 4. 嚴謹的四階段定時同步與快取制度
對齊氣象署每日四次主要發布週期（`00:00`、`06:00`、`12:00`、`18:00` UTC+8）：
* **秒開體驗 (Stale-While-Revalidate)**：優先自 `localStorage` 載入快取，0 毫秒極速呈現畫面。
* **跨視窗自動重抓**：若快取建立於上一階段（如早上 08:30），而在跨時段（如 13:00）進入網站時，系統判定快取失效並自動向氣象署拉取最新資料。
* **背景定時喚醒**：使用 `msUntilNextWindow()` 計算距離下個整點的毫秒數，時間一到自動喚醒更新。
* **休眠喚醒補抓**：監聽 `visibilitychange` 與 `window.focus` 事件，電腦休眠喚醒或切回分頁時若已跨時段立即自動重抓。
* **手動強制更新**：隨時可點擊右上角「重新整理」按鈕，立即清空本地快取並向氣象署重抓全台資料。

---

## 🛠️ 技術架構

| 範疇 | 技術選型 | 說明 |
| :--- | :--- | :--- |
| **前端核心** | React 19 + TypeScript | 最新 React 架構，嚴謹的型別安全保障 |
| **建置工具** | Vite + Rolldown | 極速熱重載 (HMR) 與優化的現代打包工具 |
| **UI 元件庫** | Material UI (MUI v7) + Emotion | 現代深色玻璃擬態（Glassmorphism）設計風格 |
| **圖示庫** | Meteocons SVG (`@meteocons/svg`) | 高質感、精緻向量動態天氣圖示 |
| **狀態管理** | Zustand | 輕量且直覺的全域狀態儲存 |
| **資料請求與快取** | SWR + Axios + LocalStorage | 具備去重（Deduplication）與自動同步機制的資料快取 |
| **時間處理** | Day.js | 輕量化時間函式庫，支援台灣在地化格式 |
| **程式碼檢查** | Oxlint | 高效能 Rust 驅動的程式碼 Linting 工具 |

---

## 🚀 快速開始

### 1. 安裝環境需求
* Node.js >= 18.0.0
* pnpm >= 8.0.0 (建議)

### 2. 安裝相依套件
```bash
pnpm install
```

### 3. 啟動開發伺服器
```bash
pnpm dev
```
瀏覽器開啟 `http://localhost:5173` 即可檢視應用。

### 4. 建置生產環境版本
```bash
pnpm build
```
編譯後的靜態檔案將輸出至 `dist/` 目錄。

### 5. 程式碼品質檢查
```bash
pnpm lint
```

---

## 📁 專案目錄結構

```text
Weather/
├── public/                     # 靜態資源 (Favicon, 常用圖標)
├── src/
│   ├── assets/                 # 靜態圖檔與 Logo
│   ├── components/
│   │   ├── common/
│   │   │   └── DragScrollBox.tsx # 水平左右滑鼠拖曳/觸控容器
│   │   ├── panels/
│   │   │   ├── OverviewPanel.tsx    # 總覽儀表板
│   │   │   ├── TemperaturePanel.tsx # 溫度面板
│   │   │   ├── WindPanel.tsx        # 風況面板
│   │   │   ├── RainPanel.tsx        # 降雨面板
│   │   │   └── ComfortPanel.tsx     # 舒適度面板
│   │   ├── PeriodCard/
│   │   │   └── PeriodCard.tsx       # 逐 3 小時多維度時段卡片
│   │   └── WeatherIcon/
│   │       └── WeatherIcon.tsx      # Meteocons 動態天氣圖示渲染
│   ├── hooks/
│   │   └── useWeatherData.ts        # 天氣資料整合 Hook (SWR, 快取, 定時器)
│   ├── pages/
│   │   └── WeatherPage.tsx          # 天氣應用主頁面
│   ├── store/
│   │   └── weatherStore.ts          # Zustand 全域狀態管理
│   ├── types/
│   │   └── weather.ts               # 天氣資料結構與型別宣告
│   ├── utils/
│   │   ├── cache.ts                 # 6小時視窗快取制度與判定演算法
│   │   ├── cities.ts                # 全台 22 縣市清單與對應 API Dataset ID
│   │   ├── parser.ts                # 氣象署 CWA API 回傳資料解析器
│   │   └── weatherUtils.ts          # 天氣代碼、色階與數值轉換工具
│   ├── App.tsx                      # 應用根元件 (主題設定)
│   └── main.tsx                     # 應用程式入口
├── WEATHER_API_AND_DATA_STRUCTURE.md # 氣象 API 資料結構與頻率監察詳細規格書
├── package.json
└── vite.config.ts
```

---

## 📄 資料來源聲明
本應用之天氣預報資料取自 [交通部中央氣象署開放資料平台 (CWA OpenData)](https://opendata.cwa.gov.tw/)，符合政府資料開放授權條款。
