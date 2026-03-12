import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { rateLimitCheck, RATE_LIMIT_PRESETS } from "@/lib/rate-limit"

/** 一般用戶申請刪除帳號：將 Profile 標記為已申請刪除，前台不再顯示，僅管理員後台可見 */
export async function POST() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ message: "請先登入" }, { status: 401 })
  }

  const { allowed, resetAt } = rateLimitCheck(
    `delete-request:${session.user.id}`,
    RATE_LIMIT_PRESETS.deleteRequestPerUser
  )
  if (!allowed) {
    return NextResponse.json(
      { message: "申請次數過於頻繁，請稍後再試" },
      { status: 429, headers: { "Retry-After": String(Math.ceil((resetAt - Date.now()) / 1000)) } }
    )
  }

  try {
    const profile = await prisma.profile.findUnique({
      where: { userId: session.user.id },
    })
    if (!profile) {
      return NextResponse.json({ message: "找不到個人檔案" }, { status: 404 })
    }
    if (profile.deletedAt) {
      return NextResponse.json({ message: "您已申請刪除，請等待管理員處理" }, { status: 400 })
    }

    await prisma.profile.update({
      where: { id: profile.id },
      data: { deletedAt: new Date() },
    })
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error("delete-request error:", e)
    return NextResponse.json({ message: "操作失敗" }, { status: 500 })
  }
}
