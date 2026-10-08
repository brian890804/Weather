# ⛅ Cloudflare Worker 晨間天氣 Web Push 推播排程服務

此 Worker 專為天氣預報 PWA 設計，利用 **Cloudflare Workers 免費額度（每天 10 萬次請求、免費 Cron 觸發器、免費 KV 資料庫）**，實現 **即便使用者完全關閉網頁、鎖定手機，每天早上也能準時喚醒手機跳出系統級靜音推播**！

---

## 🚀 3 分鐘部署指南

### 步驟 1：安裝依賴並登入 Cloudflare
在終端機中切換至此目錄：
```bash
cd cloudflare-worker
pnpm install
npx wrangler login
```
*（此時瀏覽器會彈出 Cloudflare 免費登入授權，點擊允許即可）*

---

### 步驟 2：建立免費的 KV 資料庫
執行以下指令建立推播訂閱儲存庫：
```bash
npx wrangler kv namespace create WEATHER_SUBS
```
終端機會輸出類似以下內容：
```toml
[[kv_namespaces]]
binding = "WEATHER_SUBS"
id = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```
請將產生的 `id` 複製並貼回 `cloudflare-worker/wrangler.toml` 中的 `id = "..."` 欄位。

---

### 步驟 3：部署上線
```bash
npx wrangler deploy
```
部署完成後，Wrangler 會給您一組專屬的 Worker 網址，例如：
`https://weather-push-worker.<你的帳號名>.workers.dev`

---

### 步驟 4：將網址填入天氣 Web App
回到天氣 App 的 Page 2 推播設定卡片，將您的 Worker 網址填入，點擊「同步排程」，即完成全自動雲端推播綁定！
也可以點擊「測試」，手機在完全關閉網頁的情況下就能立即收到推播！
