import { readFileSync } from "fs"
import path from "path"

/**
 * 取得 Google OAuth 憑證：
 * 優先使用 .env 的 AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET，
 * 若未設定則從專案根目錄的 yigongtogether_secret.json 讀取（Google 下載的 JSON 格式）。
 */
export function getGoogleCredentials(): { clientId: string; clientSecret: string } | null {
  const fromEnv =
    process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
      ? {
          clientId: process.env.AUTH_GOOGLE_ID,
          clientSecret: process.env.AUTH_GOOGLE_SECRET,
        }
      : null

  if (fromEnv) return fromEnv

  try {
    const filePath = path.join(process.cwd(), "yigongtogether_secret.json")
    const raw = readFileSync(filePath, "utf-8")
    const data = JSON.parse(raw) as {
      web?: {
        client_id?: string
        client_secret?: string
      }
    }
    const clientId = data?.web?.client_id
    const clientSecret = data?.web?.client_secret
    if (clientId && clientSecret) {
      return { clientId, clientSecret }
    }
  } catch {
    // 檔案不存在或格式錯誤時忽略
  }

  return null
}
