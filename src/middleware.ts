import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

/** 登入／OAuth 依 IP 限流：每分鐘最多 30 次（Edge 用 in-memory，與 API 的 store 分開） */
const AUTH_WINDOW_MS = 60 * 1000
const AUTH_MAX_PER_WINDOW = 30

declare global {
  // eslint-disable-next-line no-var
  var __authRateLimit: Map<string, { count: number; resetAt: number }> | undefined
}

function getAuthStore(): Map<string, { count: number; resetAt: number }> {
  if (typeof globalThis.__authRateLimit === "undefined") {
    globalThis.__authRateLimit = new Map()
  }
  return globalThis.__authRateLimit
}

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for")
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim()
    if (first) return first
  }
  const real = req.headers.get("x-real-ip")
  if (real) return real.trim()
  return "unknown"
}

export function middleware(req: NextRequest) {
  if (!req.nextUrl.pathname.startsWith("/api/auth")) {
    return NextResponse.next()
  }

  const ip = getClientIp(req)
  const now = Date.now()
  const store = getAuthStore()
  let entry = store.get(ip)

  if (!entry || entry.resetAt <= now) {
    entry = { count: 0, resetAt: now + AUTH_WINDOW_MS }
    store.set(ip, entry)
  }
  entry.count += 1

  if (entry.count > AUTH_MAX_PER_WINDOW) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000)
    return NextResponse.json(
      { message: "請求過於頻繁，請稍後再試" },
      { status: 429, headers: { "Retry-After": String(retryAfter) } }
    )
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/api/auth/:path*"],
}
