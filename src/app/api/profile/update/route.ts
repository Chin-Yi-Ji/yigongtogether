import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { normalizeTag } from "@/lib/utils"
import { profileUpdateSchema } from "@/lib/validations"
import { rateLimitCheck, RATE_LIMIT_PRESETS } from "@/lib/rate-limit"

export async function PATCH(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { allowed, resetAt } = rateLimitCheck(
      `profile-update:${session.user.id}`,
      RATE_LIMIT_PRESETS.profileUpdatePerUser
    )
    if (!allowed) {
      return NextResponse.json(
        { message: "請求過於頻繁，請稍後再試" },
        { status: 429, headers: { "Retry-After": String(Math.ceil((resetAt - Date.now()) / 1000)) } }
      )
    }

    const profile = await prisma.profile.findUnique({
      where: { userId: session.user.id },
    })
    if (!profile) {
      return NextResponse.json({ message: "Profile 不存在" }, { status: 404 })
    }

    const body = await req.json()
    const parsed = profileUpdateSchema.safeParse(body)
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? "輸入格式錯誤"
      return NextResponse.json({ message: msg }, { status: 400 })
    }

    const {
      displayName,
      tagline,
      oneLiner,
      avatar,
      hashtags,
      location,
      cohort,
      contacts,
      isVolunteerFriend,
      nowLearning,
      nowBuilding,
      futureLooking,
      privacyConfig,
    } = parsed.data

    const updateData: Record<string, unknown> = {}
    if (displayName !== undefined) updateData.displayName = displayName
    if (tagline !== undefined) updateData.tagline = tagline
    if (oneLiner !== undefined) updateData.oneLiner = oneLiner
    if (avatar !== undefined) updateData.avatar = avatar
    if (location !== undefined) updateData.location = location
    if (cohort !== undefined) updateData.cohort = cohort
    if (contacts !== undefined && Array.isArray(contacts)) updateData.contacts = contacts
    if (isVolunteerFriend !== undefined) updateData.isVolunteerFriend = isVolunteerFriend
    if (nowLearning !== undefined) updateData.nowLearning = nowLearning
    if (nowBuilding !== undefined) updateData.nowBuilding = nowBuilding
    if (futureLooking !== undefined) updateData.futureLooking = futureLooking
    if (privacyConfig !== undefined && typeof privacyConfig === "object")
      updateData.privacyConfig = privacyConfig

    await prisma.$transaction(async (tx) => {
      await tx.profile.update({
        where: { id: profile.id },
        data: updateData,
      })
      if (hashtags !== undefined && Array.isArray(hashtags)) {
        await tx.profileTag.deleteMany({ where: { profileId: profile.id } })
        const validTypes = ["interest", "expertise", "topic", "hashtag"]
        const seen = new Set<string>()
        for (const item of hashtags) {
          const label = typeof item === "string" ? item : item?.label
          const type =
            typeof item === "object" && item && item.type && validTypes.includes(item.type)
              ? item.type
              : "hashtag"
          const normalized = normalizeTag(String(label ?? ""))
          if (!normalized || seen.has(normalized)) continue
          seen.add(normalized)
          const tag = await tx.tag.upsert({
            where: { name: normalized },
            update: { label: String(label), type },
            create: {
              name: normalized,
              label: String(label),
              type,
            },
          })
          await tx.profileTag.create({
            data: { profileId: profile.id, tagId: tag.id },
          })
        }
      }
    })

    return NextResponse.json({ handle: profile.handle }, { status: 200 })
  } catch (error) {
    console.error("Profile update error:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}
