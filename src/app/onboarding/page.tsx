import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import OnboardingForm from "@/components/onboarding-form"
import { SiteHeader } from "@/components/site-header"
import { CATEGORY_ORDER, TAG_CATEGORY, INTEREST_TAGS } from "@/lib/onboarding-constants"

/** 依已建立檔案人數排序，並按四向度分組（不顯示向度名稱） */
function buildInterestTagGroups(
  tagCounts: { label: string; count: number }[]
): string[][] {
  const countByLabel = new Map(tagCounts.map((t) => [t.label, t.count]))
  const groups: Record<string, { label: string; count: number }[]> = {
    動態興趣: [],
    靜態興趣: [],
    專業能力: [],
    其他: [],
  }
  // 已知標籤依向度分組，並取得人數
  for (const label of Object.keys(TAG_CATEGORY)) {
    const category = TAG_CATEGORY[label]
    const count = countByLabel.get(label) ?? 0
    groups[category].push({ label, count })
  }
  // DB 有但不在 TAG_CATEGORY 的標籤歸到「其他」
  for (const { label, count } of tagCounts) {
    if (TAG_CATEGORY[label] === undefined) {
      groups["其他"].push({ label, count })
    }
  }
  // 各組依人數降序，回傳為 string[][]（不帶向度名稱）
  return CATEGORY_ORDER.map((cat) =>
    groups[cat]
      .sort((a, b) => b.count - a.count)
      .map((x) => x.label)
  )
}

export default async function OnboardingPage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect("/signin")
  }

  const existingProfile = await prisma.profile.findUnique({
    where: { userId: session.user.id },
  })

  if (existingProfile) {
    redirect(`/u/${existingProfile.handle}`)
  }

  let interestTagGroups: string[][] = [INTEREST_TAGS as unknown as string[]]
  try {
    const tagsWithCount = await prisma.tag.findMany({
      select: { label: true, _count: { select: { profiles: true } } },
    })
    const tagCounts = tagsWithCount.map((t) => ({
      label: t.label,
      count: t._count.profiles,
    }))
    interestTagGroups = buildInterestTagGroups(tagCounts)
  } catch {
    // 若 DB 查詢失敗，使用預設順序（單一組）
    interestTagGroups = [INTEREST_TAGS as unknown as string[]]
  }

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />

      <div className="container mx-auto max-w-xl flex-1 px-4 py-12 md:py-16">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
            建立你的 Profile
          </h1>
          <p className="mt-2 text-muted-foreground">
            先選位置與興趣，再填寫自我介紹與學經歷，讓大家更快認識你
          </p>
        </div>
        <OnboardingForm
          user={{
            id: session.user.id,
            name: session.user.name ?? null,
            email: session.user.email ?? null,
            image: session.user.image ?? null,
          }}
          interestTagGroups={interestTagGroups}
        />
      </div>
    </div>
  )
}
