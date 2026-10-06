# 🌤️ 台灣各縣市即時天氣預報系統 (Taiwan Weather Forecast)

一套現代化、高性能且視覺優雅的台灣天氣預報 Web 應用程式。整合**交通部中央氣象署 (CWA) 開放資料 API**，提供全台 22 縣市、368 鄉鎮市區未來 3 天逐 3 小時的高精準氣象預報，以及未來 7 天綜合氣象與穿衣防護指南。

---

## 🌟 核心特色

### 1. 雙介面體驗：手機 Cyberpunk 儀表板 + 電腦端五大維度視圖
* 📱 **行動端極致體驗 (Mobile Native-Feel)**：
  * **動態大氣背景光暈與極致毛玻璃 (Ambient Aurora & Frosted Glass)**：將 Cyberpunk 霓虹漸層與高亮抽離至背景底層，依天氣動態定位雙光斑（右上主光斑 + 左下次光斑）配合呼吸流動動畫；前景所有元件（Bento 卡片、7 日清單、穿衣指南、逐 3hr 卡片）改為透光度極高的毛玻璃（`backdropFilter: blur(24px)`），滑動時隨背景光暈自然透光。
  * **原生流暢滾動貼合導覽 (Native Continuous Scroll Snap)**：
    * 支援手勢自由跟手拖動與慣性滑動，滑動結束時自動對齊貼合對應頁面。
    * 跨頁無縫銜接：從第 1 頁滑至第 2 頁時，自動將第 2 頁重置至最頂端；在第 2 頁頂部向下拉動或點擊「↑ 回到今日」可無縫回彈至第 1 頁。
    * 手勢穿透優化：橫向「逐 3 小時預報」支援 `touchAction: pan-x pan-y`，在卡片上縱向滑動可直接傳遞給外層切頁，滑動不卡手。
  * **Page 1（即時氣象焦點看板）**：依序展示天氣現象圖示（預先快取載入、零延遲不閃爍）、即時實測溫度（保留小數點 1 位）、高低溫、極簡科技感鄉鎮切換器，搭配**體感/降雨/風向/風速 4 大 HUD 圓形進度環（具備放大幅度與高對比等寬字型）**、**動態穿衣生活指南膠囊晶片（依體感與降雨機率即時建議穿著與備傘提醒）**，以及逐 3 小時趨勢卡（當前時段無縫呈現真實小數點氣溫）。
  * **動態天氣環境光效 (Ambient Effects)**：大太陽金色神聖光束微光、雨天透明流動雨絲、多雲柔霧、雷雨雷電等真實天候氛圍。
  * **Page 2（7 天趨勢與生活指南）**：未來 7 日垂直清單預報、6 大 Bento Card 核心指標網格（體感、降雨、風速、濕度、紫外線、舒適度），以及智慧生活穿衣指南（包含雨具與外出建議）。
  * **PWA 與 iOS 主畫面體驗**：支援高解析度專屬 App 圖標（`apple-touch-icon`），加入 iPhone 主畫面自動具備原生 App 級別高質感圖標。
* 💻 **電腦端多維度儀表板 (Desktop Multi-Dimension)**：
  * 📊 **總覽面板 (Overview)**：統整實測氣溫（精確至小數點 1 位並標註即測站名）、體感溫度（Steadman 公式精算）、降雨機率、相對濕度、即時平均風速、風向風級、露點溫度與舒適指數 8 大氣象指標。
  * 🌡️ **溫度面板 (Temperature)**：即時氣溫圓形儀表、最高／最低溫與人體體感溫度。
  * 💨 **風況面板 (Wind)**：頂部 Hero 呈現即測站實測風向與風速、360 度動態風向導航羅盤（接收真實角度度數滑順旋轉）、蒲福風級標籤、風力等級中文與風速（m/s）。
  * 🌧️ **降雨面板 (Rain)**：最高降雨機率視覺化進度條、相對濕度、露點溫度與紫外線指數（UV）。
  * 😊 **舒適度面板 (Comfort)**：直覺的舒適感受表情徽章、舒適度指數、體感溫濕度綜合呈現。

### 2. 全台 870+ 自動氣象站即測整合 (O-A0001-001)
* **鄉鎮市區級顆粒度實測**：首頁與重新整理即時拉取全台 870+ 自動測站資料，單一輕量請求一次獲取全台即時實況。
* **智慧民生生活代表站評分演算法 (`getStationScore`)**：自動加權挑選生活圈代表站（如安樂區大武崙站），自動扣分排除國道邊坡、收費站、林道與苗圃等易受車流瀝青高溫干擾的特種站。
* **高精確度數值保留**：實測氣溫與風速皆嚴格保留小數點後 1 位（例如 `24.8°C`、`4.9 m/s`），拒絕粗糙四捨五入。
* **中央氣象署 Steadman 體感溫度通用公式**：即時體感溫度採用 R.G. Steadman (1984) 公式，由「實測氣溫 + 相對濕度 + 實測風速」動態計算水氣壓與散熱效應，精準呈現體感真實感受。

### 3. 22 縣市與 368 鄉鎮市區全台覆蓋
* **雙層導覽體系**：大標籤快速切換全台 22 個縣市；次級選單秒切各鄉鎮市區。
* **資料基準時間完全同步**：透過分批併發機制拉取全台資料，確保全台氣象基準時間一致。

### 4. 水平滑動與滑鼠拖曳卡片 (Drag-to-Scroll)
* **無縫左右拖動**：所有分頁下半部的時段卡片列均支援滑鼠按住左鍵任意左右拖曳（`grab` / `grabbing` 手勢）、手機觸控滑動及觸控板平滑捲動。
* **智慧防誤觸機制**：系統自動區分「拖曳滾動」與「單擊選取」，拖動卡片時不會誤觸選中，放開後純點擊才會切換時段。
* **聯動看板**：點擊任意時段卡片即高亮選中，上方看板同步更新為該時段的詳細數值。

### 5. 嚴謹的快取制度與防 429 限流保護
* **分批並發控制 (Concurrency Batching)**：每批 3 個縣市併發請求，批次間微間隔 250ms，有效平滑網路流量。
* **智慧快取與強制穿透 (Force Revalidate)**：
  * 3 小時內保鮮：未手動重整時使用本地快取，減輕氣象署伺服器負擔。
  * 手動下拉/重新整理支援強制穿透快取：同時強制拉取最新逐 3hr 預報與即測實測數據，徹底解決手動重整卻卡在舊預報時段的問題。
* **智慧時段跟隨與歷史校正機制 (PC & Mobile 同步)**：
  * 瀏覽當前時段時，系統每 30 秒自動偵測，時間跨越 3 小時區間時自動無縫推進至最新時段。
  * 使用者若主動選取「未來時段」，系統永久鎖定其選擇，絕不強行跳轉打斷瀏覽。
  * 使用者若點選「過去時段」，閒置 45 秒後自動智慧校正切回當前時段，避免使用者離開後誤讀歷史資訊。
  * 電腦端與手機端同步提供高質感半透明玻璃擬態「↩ 回到現在」一鍵快速歸位按鈕。
* **Page 2 全日氣象指標精準化**：
  * 廢除以單一 3 小時時段充當全天資料的錯誤邏輯，改為全日科學聚合：全日體感區間（`最低 ~ 最高°C`）、全日最大降雨機率（Max POP）、最盛行風向與最大風力級數、全日平均相對濕度、當日最高紫外線指數與綜合舒適度演算法。
* **429 限流自動冷卻機制**：若遭遇 API 限流，系統自動啟動 5 分鐘冷卻保護，優先使用本地快取降級保底。
* **儲存空間極限壓縮 (Data Compression)**：陣列化壓縮演算法，將原本 5MB+ 的大量 JSON 壓縮至 1.4MB 以內，杜絕 LocalStorage Quota Exceeded。
* **自訂 API Key 支援**：支援在 UI 上輸入個人的 CWA API Key，解決共用金鑰限流問題。

### 6. 自動化版本遞增體系 (Git Hooks Auto Version Bump)
* **Commit 自動 Patch 遞增**：配置專屬 Git Hook (`.githooks/pre-commit` 與 `scripts/bump-version.js`)，每次執行 `git commit` 時自動將 `package.json` 的版本號最後一位 +1（`X.0.X`）。
* **智慧手動保留**：若開發者在 commit 前手動調整了版本號（如升級大版本 `2.0.0`），Hook 自動偵測並完整保留手動設定，不強制覆蓋。
* **跨環境零設定同步**：透過 `package.json` 的 `prepare` 腳本，任何新環境執行 `pnpm install` 時自動綁定 Git Hook，團隊協同無縫支援。

---

## 🛠️ 技術架構

| 範疇 | 技術選型 | 說明 |
| :--- | :--- | :--- |
| **前端核心** | React 19 + TypeScript | 最新 React 架構，嚴謹的型別安全保障 |
| **建置工具** | Vite (Rolldown) | 極速熱重載 (HMR)、關閉生產 sourcemap、支援全網域存取 (0.0.0.0) |
| **UI 元件庫** | Material UI (MUI v7) + Emotion | 現代深色玻璃擬態（Glassmorphism）與 Cyberpunk HUD 設計風格 |
| **圖示庫** | Meteocons SVG (`@meteocons/svg`) + MUI Icons | 高質感向量動態天氣圖示與科技感指標符號 |
| **狀態管理** | Zustand | 輕量且直覺的全域狀態儲存與 LocalStorage 持久化 |
| **資料請求與快取** | SWR + Axios + LocalStorage | 具備防抖、去重、防 429 限流與平滑分批請求 |
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
瀏覽器開啟 `http://localhost:5173` 即可檢視應用（預設支援區域網路 `0.0.0.0` 存取）。

### 4. 建置生產環境版本
```bash
pnpm build
```
編譯後的靜態檔案將輸出至 `dist/` 目錄（已關閉 Sourcemap）。

### 5. 程式碼品質檢查
```bash
pnpm lint
```

---

## 📁 專案目錄結構

```text
Weather/
├── .githooks/                  # 專案級 Git Hooks (自動遞增版本號)
├── scripts/                    # 專案維護與自動化腳本 (bump-version.js)
├── public/                     # 靜態資源 (Favicon, 常用圖標)
├── src/
│   ├── assets/                 # 靜態圖檔與 Logo
│   ├── components/
│   │   ├── common/
│   │   │   └── DragScrollBox.tsx # 水平左右滑鼠拖曳/觸控容器
│   │   ├── desktop/            # 電腦版專屬面板與卡片元件
│   │   │   ├── OverviewPanel.tsx    # 總覽儀表板
│   │   │   ├── TemperaturePanel.tsx # 溫度面板
│   │   │   ├── WindPanel.tsx        # 風況面板
│   │   │   ├── RainPanel.tsx        # 降雨面板
│   │   │   ├── ComfortPanel.tsx     # 舒適度面板
│   │   │   └── PeriodCard.tsx       # 電腦版時段卡片
│   │   ├── ios/                # iOS/行動端彈窗元件
│   │   │   ├── IOSLocationModal.tsx # 地點選擇彈窗
│   │   │   ├── IOSDetailModal.tsx   # 詳細資訊彈窗
│   │   │   └── IOSScrollSnapWeather.tsx # 滾動輔助元件
│   │   ├── panels/             # 桌面端面板通用導出
│   │   ├── PeriodCard/         # 逐 3 小時多維度時段卡片
│   │   └── WeatherIcon/        # Meteocons 動態天氣圖示渲染
│   ├── mobile/                 # 📱 手機端專屬模組 (各檔案嚴格控制在 300 行以內)
│   │   ├── MobileWeather.tsx         # 手機端容器與上下分頁控制器
│   │   ├── MobilePage1.tsx           # 第一頁：即時氣象焦點看板、HUD 4 大環、逐時預報
│   │   ├── MobilePage2.tsx           # 第二頁：7 天氣象趨勢、Bento 指標網格、生活穿衣指南
│   │   ├── MobileHudMetrics.tsx      # Cyberpunk 呼吸燈 HUD 圓形指標
│   │   ├── MobileHourlyForecast.tsx  # 逐 3 小時橫向預報卡片列
│   │   ├── MobileSevenDayList.tsx    # 未來 7 天預報清單
│   │   ├── MobileClothingGuide.tsx   # 生活穿衣指標卡片
│   │   ├── MobileLocationModal.tsx   # 手機端地點切換 Modal
│   │   ├── BentoCard.tsx             # 6 大指標 Bento 卡片單元
│   │   ├── WeatherAmbientEffects.tsx # 動態天氣環境光效 (雨絲、日光束、柔霧)
│   │   ├── dayDetailsHelper.ts       # 日期細部計算與穿衣防護建議邏輯
│   │   ├── theme.ts                  # 天氣主題配色系統 (金橙晴空、水藍雨境、紫光雷雲)
│   │   ├── types.ts                  # 手機端型別定義
│   │   └── useMobileWeatherData.ts   # 手機端專屬資料轉換 Hook
│   ├── hooks/
│   │   └── useWeatherData.ts        # 全站天氣資料整合 Hook (SWR, 分批併發, 快取, 429 防護)
│   ├── pages/
│   │   └── WeatherPage.tsx          # 天氣應用主頁面 (RWD 分流切換行動版與電腦版)
│   ├── store/
│   │   └── weatherStore.ts          # Zustand 全域狀態管理 (縣市、鄉鎮、一週預報)
│   ├── types/
│   │   └── weather.ts               # 天氣資料結構與型別宣告
│   ├── utils/
│   │   ├── cache.ts                 # 6小時視窗快取、3小時保鮮、壓縮演算法與 429 冷卻機制
│   │   ├── cities.ts                # 全台 22 縣市清單與分區對應
│   │   ├── parser.ts                # 氣象署 CWA API (F-D0047-001~085 及 091 一週) 解析器
│   │   └── weatherUtils.ts          # 天氣代碼、蒲福風級、色階與日夜判斷工具
│   ├── App.tsx                      # 應用根元件 (主題設定)
│   └── main.tsx                     # 應用程式入口
├── WEATHER_API_AND_DATA_STRUCTURE.md # 氣象 API 資料結構與頻率監察詳細規格書
├── package.json
└── vite.config.ts
```

---

## 📄 資料來源聲明
本應用之天氣預報資料取自 [交通部中央氣象署開放資料平台 (CWA OpenData)](https://opendata.cwa.gov.tw/)，符合政府資料開放授權條款。
