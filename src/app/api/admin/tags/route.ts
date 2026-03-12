import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { isAdmin } from "@/lib/admin"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ message: "請先登入" }, { status: 401 })
  if (!isAdmin({ email: session.user.email, role: session.user.role })) {
    return NextResponse.json({ message: "僅管理員可操作" }, { status: 403 })
  }
  const tags = await prisma.tag.findMany({
    orderBy: { label: "asc" },
    include: { _count: { select: { profiles: true } } },
  })
  const list = tags.map((t) => ({
    id: t.id,
    name: t.name,
    label: t.label,
    type: t.type,
    hidden: t.hidden,
    profileCount: t._count.profiles,
  }))
  return NextResponse.json(list)
}
