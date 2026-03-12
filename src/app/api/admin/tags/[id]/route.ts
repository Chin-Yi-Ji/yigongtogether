import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { isAdmin } from "@/lib/admin"

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ message: "請先登入" }, { status: 401 })
  if (!isAdmin({ email: session.user.email, role: session.user.role })) {
    return NextResponse.json({ message: "僅管理員可操作" }, { status: 403 })
  }
  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const { hidden, type: tagType } = body as { hidden?: boolean; type?: string }
  const validTypes = ["interest", "expertise", "topic", "hashtag"]
  const updates: { hidden?: boolean; type?: string } = {}
  if (typeof hidden === "boolean") updates.hidden = hidden
  if (tagType !== undefined) {
    if (!validTypes.includes(tagType)) {
      return NextResponse.json(
        { message: `type 須為 ${validTypes.join("、")} 之一` },
        { status: 400 }
      )
    }
    updates.type = tagType
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ message: "請提供 hidden 或 type" }, { status: 400 })
  }
  await prisma.tag.update({
    where: { id },
    data: updates,
  })
  return NextResponse.json({ ok: true })
}
