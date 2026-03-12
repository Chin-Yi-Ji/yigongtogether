import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { experienceUpdateSchema } from "@/lib/validations"

async function getProfileId() {
  const session = await auth()
  if (!session?.user?.id) return null
  const profile = await prisma.profile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  })
  return profile?.id ?? null
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const profileId = await getProfileId()
  if (!profileId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const body = await req.json()
  const parsed = experienceUpdateSchema.safeParse(body)
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "輸入格式錯誤"
    return NextResponse.json({ message: msg }, { status: 400 })
  }
  const { type, title, org, start, end, description, isCurrent } = parsed.data

  const experience = await prisma.experience.findFirst({
    where: { id, profileId },
  })
  if (!experience) {
    return NextResponse.json({ message: "Experience 不存在" }, { status: 404 })
  }

  const updateData: Record<string, unknown> = {}
  if (type !== undefined) updateData.type = type === "education" ? "education" : "work"
  if (title !== undefined) updateData.title = title
  if (org !== undefined) updateData.org = org
  if (start !== undefined) updateData.start = start
  if (end !== undefined) updateData.end = end
  if (description !== undefined) updateData.description = description
  if (isCurrent !== undefined) updateData.isCurrent = Boolean(isCurrent)

  await prisma.experience.update({
    where: { id },
    data: updateData,
  })

  return NextResponse.json({ ok: true })
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const profileId = await getProfileId()
  if (!profileId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const experience = await prisma.experience.findFirst({
    where: { id, profileId },
  })
  if (!experience) {
    return NextResponse.json({ message: "Experience 不存在" }, { status: 404 })
  }

  await prisma.experience.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
