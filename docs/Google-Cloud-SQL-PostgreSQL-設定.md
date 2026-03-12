# 使用 Google Cloud SQL 建立 PostgreSQL

本專案使用 Prisma + PostgreSQL。以下步驟協助你在 Google Cloud 建立 Cloud SQL for PostgreSQL，並讓 YigongHub 連線使用。

---

## 一、前置準備

1. **Google Cloud 帳號**：前往 [Google Cloud Console](https://console.cloud.google.com/)
2. **啟用計費**：Cloud SQL 需啟用專案計費（有免費額度）
3. **安裝 gcloud CLI**（選用）：[安裝說明](https://cloud.google.com/sdk/docs/install)

---

## 二、建立 Cloud SQL PostgreSQL 執行個體

### 1. 進入 Cloud SQL

1. 開啟 [Cloud SQL Instances](https://console.cloud.google.com/sql)
2. 選擇或建立一個 **Google Cloud 專案**
3. 點擊 **「建立執行個體」**（Create instance）

### 2. 選擇資料庫與版本

- **選擇資料庫**：**PostgreSQL**
- **版本**：建議選 **PostgreSQL 15** 或 16
- **執行個體 ID**：自訂名稱，例如 `yigonghub-db`

### 3. 設定密碼

- **根使用者**：預設為 `postgres`，可保留或自訂
- **密碼**：請設定一組安全密碼並**妥善保存**（之後寫入 `.env`）

### 4. 選擇區域與規格

- **區域**：選離你較近的區域（例如 `asia-east1` 台灣）
- **可用區**：可選「任意」讓 Google 自動選擇
- **機器類型**：開發/小流量可選 **共用核心**（Shared core）最小規格以節省成本

### 5. 連線方式（重要）

- **公開 IP**：勾選「啟用公開 IP」，才能從本機或 Vercel 連線
- **授權網路**：
  - 開發時：可先加入 `0.0.0.0/0`（允許任何 IP，僅建議開發用）
  - 正式環境：建議改為只允許你的伺服器 IP 或 Vercel IP

### 6. 建立

- 點擊 **「建立執行個體」**
- 等待數分鐘，狀態變為 **「可用的」**（Available）

---

## 三、建立資料庫與使用者（建議）

預設已有 `postgres` 資料庫與使用者，若要單獨給 YigongHub 使用，可再建立：

1. 在 Cloud SQL 執行個體頁面，點 **「開啟 Cloud Shell」** 或使用本機 `psql` / 任何 PostgreSQL 用戶端
2. 或使用 Console 的 **「連線」** → **「開啟 Cloud Shell」** 後執行：

```bash
# 在 Cloud Shell 連到執行個體（替換 INSTANCE_CONNECTION_NAME）
gcloud sql connect INSTANCE_CONNECTION_NAME --user=postgres
```

然後在 SQL 中：

```sql
-- 建立專用資料庫（可選）
CREATE DATABASE yigongtogether;

-- 若要建立專用使用者（可選）
CREATE USER yigonghub_user WITH PASSWORD '你的密碼';
GRANT ALL PRIVILEGES ON DATABASE yigongtogether TO yigonghub_user;
```

若只用預設 `postgres` 使用者，可略過上述，直接使用 `postgres` 資料庫或建立一個新資料庫名稱即可。

---

## 四、取得連線資訊

1. 在 [Cloud SQL Instances](https://console.cloud.google.com/sql) 點選你的執行個體
2. 在 **「總覽」** 可看到：
   - **公開 IP 位址**（例如 `34.80.xxx.xxx`）
   - **連線名稱**（例如 `專案:區域:執行個體名稱`）

連線字串格式：

```
postgresql://使用者:密碼@公開IP:5432/資料庫名稱?sslmode=require
```

範例（使用預設 postgres 與 postgres 資料庫）：

```
postgresql://postgres:你的密碼@34.80.xxx.xxx:5432/postgres?sslmode=require
```

若密碼含特殊字元，請做 [URL 編碼](https://www.w3schools.com/tags/ref_urlencode.asp)（例如 `@` → `%40`）。

---

## 五、設定專案 .env

在專案根目錄建立或編輯 `.env`：

```env
# 將下方換成你的 Cloud SQL 連線字串
DATABASE_URL="postgresql://postgres:你的密碼@你的公開IP:5432/postgres?sslmode=require"
```

其他既有變數（Auth、NextAuth 等）請保留。

---

## 六、本專案與 SSL

- 連線字串已加上 **`?sslmode=require`**，會使用 SSL 連線。
- 若出現憑證驗證錯誤，本專案已在 Prisma 連線時設定 `rejectUnauthorized: false`（僅用於 Cloud SQL 預設憑證），無需再匯入憑證檔即可連線。

---

## 七、寫入 Schema 與假資料

在專案目錄執行：

```bash
# 安裝依賴（若尚未）
npm install

# 將 Prisma schema 同步到 Cloud SQL（建立表）
npm run db:push

# 寫入假資料
npm run db:seed
```

完成後，重新整理 **http://localhost:3000/explore** 即可看到假資料。

---

## 八、安全建議

- 密碼不要提交到 Git；`.env` 應在 `.gitignore` 中。
- 正式環境請縮小 **授權網路** 範圍，不要長期使用 `0.0.0.0/0`。
- 可為 YigongHub 建立專用資料庫與專用使用者，並只授予必要權限。

---

## 常見問題

**Q: 連線逾時或連不上？**  
- 確認執行個體已啟用 **公開 IP**，且 **授權網路** 包含你目前的 IP（或暫時使用 `0.0.0.0/0` 測試）。
- 確認防火牆未封鎖 5432。

**Q: 憑證錯誤？**  
- 專案已設定 `rejectUnauthorized: false`，一般可解決。若仍報錯，可檢查 `docs` 或聯絡開發者。

**Q: Vercel 部署怎麼設？**  
- 在 Vercel 專案的 **Environment Variables** 新增 `DATABASE_URL`，值與本地 `.env` 相同（Cloud SQL 公開 IP + 授權網路包含 Vercel 出口 IP 或使用 0.0.0.0/0）。
