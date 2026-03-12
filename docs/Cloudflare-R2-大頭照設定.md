# Cloudflare R2 大頭照設定

專案已內建 R2（S3 相容）上傳，在 Cloudflare 建立 bucket、取得金鑰並設定環境變數即可。

---

## 一、建立 R2 Bucket

1. 登入 [Cloudflare Dashboard](https://dash.cloudflare.com/) → **R2 Object Storage**。
2. 若尚未啟用 R2，依畫面啟用（有免費額度）。
3. **Create bucket**：名稱自訂（如 `yigong-avatars`），Location 選離使用者較近的區域。

---

## 二、開啟公開讀取

進入該 bucket → **Settings**。

- **選項 A**：啟用 **Public Development URL**，輸入 `allow` 確認後，會得到一組 **Public Bucket URL**（如 `https://pub-xxxxxxxx.r2.dev`），**結尾不要加 `/`**，即為 `S3_PUBLIC_URL`。
- **選項 B**：在 **Custom Domains** 新增網域（如 `img.yourdomain.com`），完成 DNS 後，對外網址前綴即為 `S3_PUBLIC_URL`（如 `https://img.yourdomain.com`，結尾不加 `/`）。

---

## 三、建立 API 金鑰（上傳用）

1. R2 總覽頁點 **Manage R2 API Tokens** → **Create API token**。
2. 權限選 **Object Read & Write**，指定上述 bucket。
3. 建立後會顯示 **Access Key ID** 與 **Secret Access Key**（Secret 只顯示一次，請當下複製保存）。
4. **Endpoint** 格式：`https://<Account ID>.r2.cloudflarestorage.com`，Account ID 在 Cloudflare 右側欄或 R2 總覽可看到。

---

## 四、環境變數

在 Zeabur 該服務 **Variables** 或本機 `.env` 新增：

| 變數 | 值 | 說明 |
|------|-----|------|
| `S3_BUCKET` | 你的 bucket 名稱 | 如 `yigong-avatars` |
| `S3_REGION` | `auto` | R2 固定填 `auto` |
| `S3_ENDPOINT` | `https://<Account ID>.r2.cloudflarestorage.com` | 替換為你的 Account ID |
| `S3_ACCESS_KEY_ID` | 上一步的 Access Key ID | |
| `S3_SECRET_ACCESS_KEY` | 上一步的 Secret Access Key | |
| `S3_PUBLIC_URL` | `https://pub-xxx.r2.dev` 或自訂網域 | 第二步的對外網址前綴，**結尾不要加 `/`** |

未設定上述變數時，上傳會寫入本機 `public/uploads/avatars/`，重啟後會消失。

---

## 五、自訂網域與 Next.js 圖片

若 `S3_PUBLIC_URL` 使用自訂網域（非 `*.r2.dev`），需在 **next.config.ts** 的 `images.remotePatterns` 加入該 hostname，例如：

```ts
{ protocol: "https", hostname: "img.yourdomain.com", pathname: "/**" }
```

---

## 常見問題

- **大頭照不顯示 / 破圖**：確認 Public access 已開啟，且 `S3_PUBLIC_URL` 與實際對外網址一致（結尾無 `/`）；自訂網域需已加入 `remotePatterns`。
- **上傳失敗**：確認 `S3_ENDPOINT` 格式正確，API Token 權限為 Object Read & Write 且套用在正確 bucket。
