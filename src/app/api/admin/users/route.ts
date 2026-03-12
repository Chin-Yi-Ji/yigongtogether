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

  const users = await prisma.user.findMany({
    orderBy: { id: "desc" },
    include: {
      profile: {
        include: {
          tags: { include: { tag: true } },
        },
      },
    },
  })

  const list = users.map((u) => ({
    id: u.id,
    email: u.email,
    name: u.name,
    image: u.image,
    role: u.role,
    profile: u.profile
      ? {
          id: u.profile.id,
          handle: u.profile.handle,
          displayName: u.profile.displayName,
          deletedAt: u.profile.deletedAt,
          tags: u.profile.tags.map((pt) => ({ label: pt.tag.label, type: pt.tag.type })),
        }
      : null,
  }))

  return NextResponse.json(list)
}
