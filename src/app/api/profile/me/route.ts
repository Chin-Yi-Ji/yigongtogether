import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const profile = await prisma.profile.findUnique({
    where: { userId: session.user.id },
    include: {
      tags: { include: { tag: true } },
      experiences: { orderBy: { start: "desc" } },
    },
  })

  if (!profile) {
    return NextResponse.json({ message: "Profile 不存在" }, { status: 404 })
  }

  const privacyConfig =
    typeof profile.privacyConfig === "object" && profile.privacyConfig !== null
      ? profile.privacyConfig
      : {}

  const tagsWithTypes = profile.tags.map((pt) => ({
    label: pt.tag.label,
    type: pt.tag.type,
  }))

  const contacts = Array.isArray(profile.contacts)
    ? profile.contacts
    : profile.contactType && profile.contactValue
      ? [{ type: profile.contactType, value: profile.contactValue }]
      : []

  return NextResponse.json({
    ...profile,
    contacts,
    privacyConfig,
    hashtags: profile.tags
      .filter((pt) => pt.tag.type === "hashtag")
      .map((pt) => pt.tag.label),
    tagsWithTypes,
  })
}
