import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { normalizeTag } from "@/lib/utils"
import { profileCreateSchema } from "@/lib/validations"
import { getClientIp } from "@/lib/get-client-ip"
import { rateLimitCheck, RATE_LIMIT_PRESETS } from "@/lib/rate-limit"

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const ip = await getClientIp()
    const { allowed, resetAt } = rateLimitCheck(`profile-create:${ip}`, RATE_LIMIT_PRESETS.profileCreatePerIp)
    if (!allowed) {
      return NextResponse.json(
        { message: "請求過於頻繁，請稍後再試" },
        { status: 429, headers: { "Retry-After": String(Math.ceil((resetAt - Date.now()) / 1000)) } }
      )
    }

    const body = await req.json()
    const parsed = profileCreateSchema.safeParse(body)
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? "輸入格式錯誤"
      return NextResponse.json({ message: msg }, { status: 400 })
    }

    const {
      handle,
      displayName,
      oneLiner,
      avatar,
      hashtags,
      location,
      cohort,
      contactType,
      contactValue,
      isVolunteerFriend,
      nowLearning,
      nowBuilding,
      futureLooking,
      experiences,
    } = parsed.data

    // 檢查 handle 是否已存在
    const existingHandle = await prisma.profile.findUnique({
      where: { handle },
    })

    if (existingHandle) {
      return NextResponse.json(
        { message: "此連結名稱已被使用，請換一個" },
        { status: 400 }
      )
    }

    // 建立 Profile
    const profile = await prisma.profile.create({
      data: {
        userId: session.user.id,
        handle,
        displayName,
        oneLiner,
        avatar: avatar || session.user.image,
        location: location ?? undefined,
        cohort: cohort ?? undefined,
        contactType: contactType ?? undefined,
        contactValue: contactValue ?? undefined,
        isVolunteerFriend: isVolunteerFriend ?? false,
        nowLearning: nowLearning ?? undefined,
        nowBuilding: nowBuilding ?? undefined,
        futureLooking: futureLooking ?? undefined,
      },
    })

    // 建立 Tags（支援 type：interest / expertise / topic / hashtag）
    const validTypes = ["interest", "expertise", "topic", "hashtag"]
    if (hashtags && Array.isArray(hashtags)) {
      for (const item of hashtags) {
        const label = typeof item === "string" ? item : item?.label
        const type =
          typeof item === "object" && item && item.type && validTypes.includes(item.type)
            ? item.type
            : "hashtag"
        const normalized = normalizeTag(String(label ?? ""))
        if (!normalized) continue

        const tag = await prisma.tag.upsert({
          where: { name: normalized },
          update: { label: String(label), type },
          create: {
            name: normalized,
            label: String(label),
            type,
          },
        })
        await prisma.profileTag.create({
          data: { profileId: profile.id, tagId: tag.id },
        })
      }
    }

    // 建立學經歷
    if (experiences && Array.isArray(experiences) && experiences.length > 0) {
      for (const exp of experiences) {
        await prisma.experience.create({
          data: {
            profileId: profile.id,
            type: exp.type === "education" ? "education" : "work",
            title: exp.title,
            org: exp.org,
            start: exp.start,
            end: exp.end ?? null,
            description: exp.description ?? null,
            isCurrent: Boolean(exp.isCurrent),
          },
        })
      }
    }

    return NextResponse.json({ handle: profile.handle }, { status: 201 })
  } catch (error) {
    console.error("Create profile error:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}
