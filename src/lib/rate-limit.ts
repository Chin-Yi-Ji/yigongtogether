/**
 * 簡易 in-memory Rate limiting（固定時間窗）。
 * 設計給約 100 人同時上線，單一 Node 實例使用；多實例時可改為 Redis（如 Upstash）。
 */

type Entry = { count: number; resetAt: number }

const store = new Map<string, Entry>()

const MAX_ENTRIES = 5000
const CLEAN_INTERVAL_MS = 60 * 1000
let lastClean = Date.now()

function cleanExpired() {
  const now = Date.now()
  if (now - lastClean < CLEAN_INTERVAL_MS) return
  lastClean = now
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt <= now) store.delete(key)
  }
  if (store.size > MAX_ENTRIES) {
    const entries = [...store.entries()].sort((a, b) => a[1].resetAt - b[1].resetAt)
    const toDelete = entries.slice(0, store.size - MAX_ENTRIES).map(([k]) => k)
    toDelete.forEach((k) => store.delete(k))
  }
}

export type RateLimitConfig = {
  /** 時間窗長度（毫秒） */
  windowMs: number
  /** 時間窗內最多幾次 */
  max: number
}

/** 依 key 檢查並增加計數；若超過上限回傳 false，否則 true */
export function rateLimitCheck(
  key: string,
  config: RateLimitConfig
): { allowed: boolean; remaining: number; resetAt: number } {
  cleanExpired()
  const now = Date.now()
  let entry = store.get(key)
  if (!entry || entry.resetAt <= now) {
    entry = { count: 0, resetAt: now + config.windowMs }
    store.set(key, entry)
  }
  entry.count += 1
  const remaining = Math.max(0, config.max - entry.count)
  const allowed = entry.count <= config.max
  return { allowed, remaining, resetAt: entry.resetAt }
}

/** 預設設定：約 100 人同時上線情境 */
export const RATE_LIMIT_PRESETS = {
  /** 登入／OAuth：每 IP 每分鐘 30 次（middleware 用，見 middleware.ts） */
  authPerIp: { windowMs: 60 * 1000, max: 30 },
  /** 建立 Profile：每 IP 每小時 5 次 */
  profileCreatePerIp: { windowMs: 60 * 60 * 1000, max: 5 },
  /** 上傳大頭照：每使用者 每分鐘 10 次 */
  avatarPerUser: { windowMs: 60 * 1000, max: 10 },
  /** 更新 Profile：每使用者 每分鐘 60 次 */
  profileUpdatePerUser: { windowMs: 60 * 1000, max: 60 },
  /** 申請刪除帳號：每使用者 每天 2 次 */
  deleteRequestPerUser: { windowMs: 24 * 60 * 60 * 1000, max: 2 },
} as const
