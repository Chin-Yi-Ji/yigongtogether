import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { experienceSchema } from "@/lib/validations"

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const profile = await prisma.profile.findUnique({
      where: { userId: session.user.id },
    })
    if (!profile) {
      return NextResponse.json({ message: "Profile 不存在" }, { status: 404 })
    }

    const body = await req.json()
    const parsed = experienceSchema.safeParse(body)
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? "輸入格式錯誤"
      return NextResponse.json({ message: msg }, { status: 400 })
    }

    const { type, title, org, start, end, description, isCurrent } = parsed.data

    const experience = await prisma.experience.create({
      data: {
        profileId: profile.id,
        type: type === "education" ? "education" : "work",
        title,
        org,
        start,
        end: end ?? null,
        description: description ?? null,
        isCurrent: Boolean(isCurrent),
      },
    })

    return NextResponse.json(experience, { status: 201 })
  } catch (error) {
    console.error("Experience create error:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}
