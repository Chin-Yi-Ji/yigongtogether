import type { Metadata } from "next"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { SiteHeader } from "@/components/site-header"
import ProfileEditForm from "@/components/profile-edit-form"
import Link from "next/link"

export const metadata: Metadata = {
  title: "個人檔案設定 | YigongHub",
  description: "編輯個人資料、經歷與隱私設定。",
}

export default async function SettingsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/signin")

  const profile = await prisma.profile.findUnique({
    where: { userId: session.user.id },
    select: { handle: true },
  })
  if (!profile) redirect("/onboarding")

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <div className="container mx-auto max-w-xl flex-1 px-4 py-10">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">個人檔案</h1>
          <Link
            href={`/u/${profile.handle}`}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            返回個人頁
          </Link>
        </div>
        <ProfileEditForm />
      </div>
    </div>
  )
}
