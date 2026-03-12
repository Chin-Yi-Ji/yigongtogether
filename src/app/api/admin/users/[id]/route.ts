import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { isAdmin } from "@/lib/admin"

export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ message: "請先登入" }, { status: 401 })
  if (!isAdmin({ email: session.user.email, role: session.user.role })) {
    return NextResponse.json({ message: "僅管理員可操作" }, { status: 403 })
  }

  const { id } = await params
  const body = await _req.json().catch(() => ({}))
  const { role } = body as { role?: string }

  if (role !== undefined) {
    if (role !== "user" && role !== "admin") {
      return NextResponse.json({ message: "role 須為 user 或 admin" }, { status: 400 })
    }
    await prisma.user.update({
      where: { id },
      data: { role },
    })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ message: "無可更新欄位" }, { status: 400 })
}

/** 永久刪除帳號（含 Profile、Account、Session），僅管理員 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ message: "請先登入" }, { status: 401 })
  if (!isAdmin({ email: session.user.email, role: session.user.role })) {
    return NextResponse.json({ message: "僅管理員可操作" }, { status: 403 })
  }

  const { id } = await params
  if (id === session.user.id) {
    return NextResponse.json({ message: "無法刪除自己" }, { status: 400 })
  }

  await prisma.user.delete({
    where: { id },
  })
  return NextResponse.json({ ok: true })
}
