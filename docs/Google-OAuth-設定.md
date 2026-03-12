# Google OAuth 設定步驟

本專案使用 Auth.js（NextAuth v5）+ Google Provider，照下面步驟即可接好「用 Google 帳號登入」。

---

## 一、在 Google Cloud 建立 OAuth 憑證

### 1. 開啟 Google Cloud Console

- 前往：<https://console.cloud.google.com/>
- 用你的 Google 帳號登入。

### 2. 建立或選擇專案

- 左上角專案下拉選單 → **「新增專案」**（或選現有專案）。
- 專案名稱可填：`YigongHub` 或任意名稱 → **建立**。

### 3. 設定 OAuth 同意畫面

- 左側選單：**「API 和服務」** → **「OAuth 同意畫面」**。
- 使用者類型選 **「外部」**（若要給任何人登入）→ **建立**。
- 填寫：
  - **應用程式名稱**：例如 `YigongHub`
  - **使用者支援電子郵件**：選你的信箱
  - **開發人員聯絡資訊**：你的信箱
- 按 **「儲存並繼續」**，**「範圍」** 可先略過再按 **「儲存並繼續」**。
- **「測試使用者」** 若只給自己用可略過；要對外開放就之後再送審。
- 回到 **「OAuth 同意畫面」** 確認狀態為「測試」或「已發布」即可。

### 4. 建立 OAuth 2.0 用戶端 ID（憑證）

- 左側選單：**「API 和服務」** → **「憑證」**。
- 上方 **「+ 建立憑證」** → **「OAuth 用戶端 ID」**。
- **應用程式類型**：選 **「網頁應用程式」**。
- **名稱**：例如 `YigongHub Web`。
- **已授權的 JavaScript 來源**（選填，建議加）：
  - 本機：`http://localhost:3000`
  - 正式：`https://你的網域`
- **已授權的重新導向 URI**（必填）：
  - 本機：`http://localhost:3000/api/auth/callback/google`
  - 正式：`https://你的網域/api/auth/callback/google`
- 按 **「建立」**。
- 畫面上會顯示 **用戶端 ID** 和 **用戶端密鑰**，先複製或稍後到「憑證」頁面再看。

---

## 二、在專案裡設定 Google 憑證（二擇一）

### 方式 A：使用 `yigongtogether_secret.json`（推薦）

若你從 Google Cloud 下載的是 **JSON 金鑰檔**（例如 `yigongtogether_secret.json`），直接放在**專案根目錄**即可，程式會自動讀取其中的 `web.client_id` 與 `web.client_secret`。

- 檔案需為 Google 下載的格式，內含 `"web": { "client_id": "...", "client_secret": "..." }`。
- 此檔案已加入 `.gitignore`，不會被提交到 Git。

### 方式 B：使用 `.env`

在專案根目錄的 **`.env`** 裡加入：

```env
# Google OAuth（從 Google Cloud 憑證頁複製）
AUTH_GOOGLE_ID="你的用戶端ID"
AUTH_GOOGLE_SECRET="你的用戶端密鑰"

# Auth.js 必填
AUTH_SECRET="隨機字串"
NEXTAUTH_URL="http://localhost:3000"
```

**優先順序**：若同時有設定 `.env` 的 `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`，會優先使用 .env，否則才讀取 `yigongtogether_secret.json`。

說明：

| 變數 | 從哪裡來 |
|------|----------|
| `AUTH_GOOGLE_ID` | Google Cloud 憑證頁的 **用戶端 ID**（Client ID） |
| `AUTH_GOOGLE_SECRET` | 同頁的 **用戶端密鑰**（Client secret） |
| `AUTH_SECRET` | 任意隨機字串，可用指令產生（見下方） |
| `NEXTAUTH_URL` | 本機用 `http://localhost:3000`；部署後改為你的網站網址（例如 `https://xxx.zeabur.app`） |

### 產生 AUTH_SECRET（建議）

在終端機執行：

```bash
npx auth secret
```

把輸出的那一串貼到 `.env` 的 `AUTH_SECRET="..."` 裡。

---

## 三、本機測試

1. 儲存 `.env`。
2. 執行：`npm run dev`。
3. 瀏覽器打開：<http://localhost:3000>。
4. 點 **「登入」**，應會跳轉到 Google 登入頁，選帳號後再跳回你的網站。

若出現錯誤，請檢查：

- **重新導向 URI 完全一致**：`http://localhost:3000/api/auth/callback/google`（含 `http`、port、路徑）。
- `.env` 的 `AUTH_GOOGLE_ID`、`AUTH_GOOGLE_SECRET` 沒有多餘空格或引號錯誤。
- 重啟一次 `npm run dev` 再試。

---

## 四、部署到 Zeabur（或正式環境）時

1. 在 Google Cloud 同一個 OAuth 用戶端裡，**再新增一筆**「已授權的重新導向 URI」：
   - `https://你的正式網域/api/auth/callback/google`
2. 在 Zeabur 的服務環境變數裡設定：
   - `AUTH_GOOGLE_ID`、`AUTH_GOOGLE_SECRET`（可與本機相同）
   - `AUTH_SECRET`（建議用新的隨機字串）
   - `NEXTAUTH_URL=https://你的正式網域`

設定好後，本機與正式環境都可以用 Google 登入。
