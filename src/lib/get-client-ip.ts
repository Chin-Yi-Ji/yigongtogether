import { headers } from "next/headers"

/**
 * 從 request 取得客戶端 IP（供 Rate limit 等使用）。
 * 先看 X-Forwarded-For（proxy/Zeabur），再看 X-Real-IP，沒有則回傳 "unknown"。
 */
export async function getClientIp(): Promise<string> {
  const h = await headers()
  const forwarded = h.get("x-forwarded-for")
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim()
    if (first) return first
  }
  const real = h.get("x-real-ip")
  if (real) return real.trim()
  return "unknown"
}
