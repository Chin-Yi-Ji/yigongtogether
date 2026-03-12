# YigongHub（YigongTogether）

**個人數位名片社群平台** — 透過工作經歷、hashtag、興趣與關注議題，連結義工夥伴、找到志同道合的人。

---

## 專案狀況

| 項目 | 說明 |
|------|------|
| **部署** | [Zeabur](https://zeabur.com/) |
| **資料庫** | Zeabur 內建 **PostgreSQL**（Prisma ORM） |
| **大頭照** | [Cloudflare R2](https://www.cloudflare.com/products/r2/)（S3 相容） |
| **登入** | **Google OAuth**（Auth.js / NextAuth v5） |

---

## 功能總覽

### 一般使用者

| 頁面／功能 | 說明 |
|------------|------|
| **首頁** `/` | 未登入：平台介紹與登入按鈕；已登入自動導向探索。 |
| **登入** `/signin` | Google OAuth 登入，登入後可選擇建立個人檔案或進入探索。 |
| **關於** `/about` | 平台介紹（須登入，Header 僅登入後顯示連結）。 |
| **探索** `/explore` | 須登入。關鍵字搜尋、熱門標籤、最新更新 Profile、與你相似的人、連結「查看全部夥伴」。搜尋時可輸入多個關鍵字（空格或逗號分隔），有結果時可「結束搜尋，回到探索」。 |
| **全部夥伴** `/explore/all` | 須登入。列出所有已建檔夥伴，依屆數由小到大、再依名稱排序。 |
| **個人頁** `/u/:handle` | 顯示該使用者的顯示名稱、一句話、自我介紹、標籤、聯絡方式、學經歷等；依隱私設定顯示 location／經歷。 |
| **個人檔案** `/settings` | 須登入。編輯基本資料（含一句話、自我介紹、屆數 1–999）、聯絡方式（含個人網站）、給自己的關鍵字（興趣／專長等）、學歷與工作經歷、隱私設定、大頭照上傳、申請刪除帳號。 |
| **建立個人檔案** `/onboarding` | 新使用者首次登入後填寫 handle（建立後不可改）、顯示名稱、一句話、自我介紹、屆數、標籤等，完成後建立 Profile。 |

### 搜尋範圍（探索頁）

搜尋會比對以下內容，任一符合即會出現在結果中：

- **個人連結**（handle）、**顯示名稱**、**一句話**（tagline）、**自我介紹**（oneLiner）
- **未來想做的事**、**正在學的**、**正在做的**（futureLooking、nowLearning、nowBuilding）
- **所有標籤**：包含「一開始填的標籤」（onboarding 興趣等）與「給自己的關鍵字」（設定頁新增的興趣、專長等），皆可被搜尋。

### 管理員

| 功能 | 說明 |
|------|------|
| **管理後台** `/admin` | 僅管理員可見 Header 連結。須登入且角色為 admin。 |
| **數據與統計** | 總帳號數、已建個人檔案數、待確認刪除數。 |
| **帳號列表** | 所有使用者與其 Profile（handle、顯示名稱、標籤、是否已申請刪除）。可指派管理員、確認刪除後永久刪除帳號。 |
| **標籤管理** | 所有標籤的 label、類型、使用人數、是否隱藏。可修改類型（興趣／專長／主題／hashtag）與隱藏狀態；隱藏後不顯示於探索頁熱門標籤。 |

### 其他

- **深淺色模式**：Header 主題切換，localStorage 持久化。
- **Rate limiting**：登入、建立/更新 Profile、上傳大頭照、刪除帳號申請等 API 有請求頻率限制（見 `src/lib/rate-limit.ts`、`src/middleware.ts`）。

---

## 技術堆疊

| 類別 | 技術 |
|------|------|
| 框架 | Next.js 16 (App Router) + TypeScript |
| UI | Tailwind CSS + shadcn/ui + Lucide Icons |
| 驗證 | Auth.js (NextAuth v5) + Google OAuth |
| 資料庫 | PostgreSQL + Prisma |
| 儲存 | Cloudflare R2（大頭照，S3 相容） |
| 部署 | Zeabur |

---

## 本地開發

```bash
npm install
cp .env.example .env   # 填入變數
npm run db:push
npm run db:seed        # 選用
npm run dev
```

**必要環境變數**：`DATABASE_URL`、`AUTH_SECRET`、`AUTH_GOOGLE_ID`、`AUTH_GOOGLE_SECRET`、`NEXTAUTH_URL`。  
大頭照上傳需 R2 變數（見 `docs/Cloudflare-R2-大頭照設定.md`）。  
`ADMIN_EMAIL` 可設首位管理員信箱（與 Google 帳號信箱一致）。

---

## 部署與設定文件

| 文件 | 說明 |
|------|------|
| [docs/Zeabur-部署與設定.md](docs/Zeabur-部署與設定.md) | Zeabur 環境變數、PostgreSQL、自訂網域、大頭照 Volume／R2 選項 |
| [docs/Cloudflare-R2-大頭照設定.md](docs/Cloudflare-R2-大頭照設定.md) | R2 bucket、公開讀取、API 金鑰與環境變數 |
| [docs/網頁流程圖.md](docs/網頁流程圖.md) | 路由、權限與 API 架構圖 |
| [docs/Google-OAuth-設定.md](docs/Google-OAuth-設定.md) | Google OAuth 應用設定 |
| [docs/專案狀態-未完成與後續.md](docs/專案狀態-未完成與後續.md) | 已完成功能與後續可補強項目 |

---

## 專案結構（精簡）

```
├── prisma/           # schema、seed
├── src/
│   ├── app/
│   │   ├── api/      # auth、profile、upload、admin、account（delete-request）
│   │   ├── about/    # 關於（須登入）
│   │   ├── admin/    # 管理後台
│   │   ├── explore/  # 探索、全部夥伴 /explore/all
│   │   ├── onboarding/
│   │   ├── settings/
│   │   ├── signin/
│   │   ├── u/[handle]/
│   │   └── ...
│   ├── components/   # site-header、theme-toggle、表單、admin 列表等
│   ├── lib/          # prisma、auth、rate-limit、validations、utils
│   └── auth.ts
├── docs/
└── README.md
```

---

## 開發者與授權

由 **Allen Chi 欸冷** × **OpenClaw** 於 2026 年建立。  
如有問題或建議，歡迎提交 Issue 或 Pull Request。  
**License**: MIT
