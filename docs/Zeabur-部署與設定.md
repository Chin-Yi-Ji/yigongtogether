# Zeabur 部署與設定

本專案部署於 [Zeabur](https://zeabur.com/)，使用同專案內 PostgreSQL，大頭照可選 Zeabur Volume 或 Cloudflare R2（建議 R2，見 [Cloudflare-R2-大頭照設定.md](./Cloudflare-R2-大頭照設定.md)）。

---

## 一、必填環境變數

在 Zeabur **服務 → Variables** 設定：

| 變數 | 說明 |
|------|------|
| `DATABASE_URL` | PostgreSQL 連線。若在 Zeabur 同專案建立 **PostgreSQL** 並連結，Zeabur 會自動注入；或手動設為 `${POSTGRES_CONNECTION_STRING}`。 |
| `AUTH_SECRET` | NextAuth 用，執行 `npx auth secret` 產生。 |
| `NEXTAUTH_URL` | 正式網址，例如 `https://你的專案.zeabur.app`；若綁自訂網域則為 `https://你的網域`。 |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Google OAuth 用戶端 ID 與 Secret。 |

---

## 二、在 Zeabur 建立 PostgreSQL

1. 登入 [Zeabur](https://zeabur.com/) → 專案內點 **Add Service** → 搜尋 **PostgreSQL** → 部署。
2. 部署完成後點進 PostgreSQL 服務 → **Connection**：
   - **Private**：給同專案內應用使用。
   - **Public**：給本機開發、pgAdmin 等使用（Host、Port、Username、Password、Database）。
3. 應用連線：在 YigongHub 服務的 **Variables** 新增 `DATABASE_URL`，值填 `${POSTGRES_CONNECTION_STRING}`（Zeabur 會帶入同專案 PostgreSQL 的內部連線字串）。

本機開發時，可將 `.env` 的 `DATABASE_URL` 設為 Zeabur 提供的 **Public Connection String**，執行 `npm run db:push`、`npm run db:seed`。若出現 SSL 錯誤，在連線字串尾加 `?sslmode=require`。

---

## 三、部署應用與首次寫入 Schema

1. 同專案內 **Add Service** → **從 GitHub 部署**，選擇本 repo。
2. 設定上述環境變數；`DATABASE_URL` 連結至同專案 PostgreSQL。
3. 首次部署後若資料庫為空，在 Zeabur Shell 或本機（連 Zeabur Public DB）執行：
   ```bash
   npm run db:push
   npm run db:seed   # 選用
   ```

---

## 四、自訂網域

1. Zeabur 專案 → 點選 YigongHub **服務** → **Domain**。
2. 新增網域（如 `www.yigonghub.com`），依畫面指示到 DNS 新增 **CNAME** 或 **A** 記錄。
3. 網域驗證通過後，Zeabur 會自動申請 HTTPS。
4. **重要**：在該服務 **Variables** 將 `NEXTAUTH_URL` 改為 `https://你的網域`；並在 **Google Cloud Console** 的 OAuth 用戶端「已授權的重新導向 URI」新增 `https://你的網域/api/auth/callback/google`。

---

## 五、大頭照儲存（二選一）

### 方案 A：Zeabur Volume（設定簡單，單實例）

1. YigongHub 服務 → **Volumes** → **Mount Volumes**。
2. Mount 目錄填寫上傳目錄路徑（依 Zeabur 工作目錄，多為 `/app/public/uploads` 或 `./public/uploads`），Volume ID 自訂。
3. 重啟後該目錄會持久化；多實例時各實例不共用，不適合水平擴展。

### 方案 B：Cloudflare R2（建議）

不受重啟與多實例影響。在 Zeabur **Variables** 設定 R2 相關變數即可，步驟見 [Cloudflare-R2-大頭照設定.md](./Cloudflare-R2-大頭照設定.md)。未設定時上傳會寫入容器本機，重啟後消失。

---

## 六、部署後檢查清單

- [ ] `DATABASE_URL`、`AUTH_SECRET`、`NEXTAUTH_URL`、Google OAuth 變數已設定
- [ ] 若使用自訂網域：`NEXTAUTH_URL` 與 Google 重新導向 URI 已改為新網域
- [ ] 大頭照：已設定 R2 或 Volume，或接受本機暫存
- [ ] 必要時已執行 `db:push`（及 `db:seed`）
