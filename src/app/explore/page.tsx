import type { Metadata } from "next"
import { unstable_cache } from "next/cache"
import { prisma } from "@/lib/prisma"
import { Card, CardContent } from "@/components/ui/card"
import Link from "next/link"
import Image from "next/image"
import { SiteHeader } from "@/components/site-header"
import { Search, TrendingUp, Clock, Users } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { normalizeTag } from "@/lib/utils"

export const metadata: Metadata = {
  title: "探索社群 | YigongHub",
  description: "透過 hashtag、興趣與工作經歷，找到志同道合的夥伴。",
}

const FALLBACK_HASHTAGS = [
  "創業",
  "永續",
  "AI",
  "設計",
  "開源",
  "自由潛水",
  "社會創新",
  "UX",
]

type ProfileWithRelations = Awaited<
  ReturnType<typeof prisma.profile.findMany<{
    include: {
      tags: { include: { tag: true } }
      user: { select: { image: true } }
    }
  }>>
>[number]

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  const session = await auth()
  const callbackUrl = `/explore${q ? `?q=${encodeURIComponent(q)}` : ""}`
  if (!session?.user?.id) redirect(`/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`)

  let popularTags: { id: string; name: string; label: string; count: number }[] = []
  let latestProfiles: ProfileWithRelations[] = []
  let similarProfiles: ProfileWithRelations[] = []
  let dbError: string | null = null

  try {
    const searchQuery = q?.trim()
    const includeRel = {
      tags: { include: { tag: true } },
      user: { select: { image: true } },
    }

    const fetchTags = () =>
      prisma.tag.findMany({
        where: { type: "hashtag", hidden: false },
        include: { _count: { select: { profiles: true } } },
      })
    const fetchLatestProfiles = () =>
      prisma.profile.findMany({
        where: { deletedAt: null },
        include: includeRel,
        take: 5,
        orderBy: { updatedAt: "desc" },
      })
    const myProfilePromise =
      session?.user?.id
        ? prisma.profile.findUnique({
            where: { userId: session.user.id },
            select: { id: true, tags: { select: { tagId: true } } },
          })
        : Promise.resolve(null)

    let tagsWithCountResult: Awaited<ReturnType<typeof fetchTags>>
    let latestProfilesResult: ProfileWithRelations[]
    let myProfileForSimilar: { id: string; tags: { tagId: string }[] } | null

    if (searchQuery) {
      const runSearch = async () => {
        const terms = searchQuery.split(/[\s,]+/).map((t) => t.trim()).filter(Boolean)
        const effectiveTerms = terms.length > 0 ? terms : [searchQuery]

        const getMatchingTagIds = async (term: string): Promise<string[]> => {
          const normalized = normalizeTag(term)
          const tagOr: Array<{ name?: { contains: string; mode: "insensitive" }; label?: { contains: string; mode: "insensitive" }; name?: { equals: string } }> = [
            { name: { contains: term, mode: "insensitive" as const } },
            { label: { contains: term, mode: "insensitive" as const } },
          ]
          if (normalized) tagOr.push({ name: { equals: normalized } })
          const tags = await prisma.tag.findMany({
            where: { OR: tagOr },
            select: { id: true },
          })
          return tags.map((t) => t.id)
        }

        const tagIdsByTerm = await Promise.all(effectiveTerms.map((t) => getMatchingTagIds(t)))
        const allMatchingTagIds = [...new Set(tagIdsByTerm.flat())]

        const searchFieldsForTerm = (term: string) => [
          { handle: { contains: term, mode: "insensitive" as const } },
          { displayName: { contains: term, mode: "insensitive" as const } },
          { oneLiner: { contains: term, mode: "insensitive" as const } },
          { tagline: { contains: term, mode: "insensitive" as const } },
          { futureLooking: { contains: term, mode: "insensitive" as const } },
          { nowLearning: { contains: term, mode: "insensitive" as const } },
          { nowBuilding: { contains: term, mode: "insensitive" as const } },
          ...(allMatchingTagIds.length > 0
            ? [{ tags: { some: { tagId: { in: allMatchingTagIds } } } }]
            : []),
        ]
        const orConditions = effectiveTerms.flatMap((term) => searchFieldsForTerm(term))

        const [tags, profiles, myProfile] = await Promise.all([
          fetchTags(),
          prisma.profile.findMany({
            where: { deletedAt: null, OR: orConditions },
            include: includeRel,
            take: 50,
            orderBy: { updatedAt: "desc" },
          }),
          myProfilePromise,
        ])
        return { tags, profiles, myProfile }
      }

      const searchResult = await runSearch()
      tagsWithCountResult = searchResult.tags
      latestProfilesResult = searchResult.profiles
      myProfileForSimilar = searchResult.myProfile
    } else {
      const cached = unstable_cache(
        async () => {
          const [tags, profiles] = await Promise.all([fetchTags(), fetchLatestProfiles()])
          return { tags, profiles }
        },
        ["explore-initial"],
        { revalidate: 60 }
      )
      const [cachedResult, myProfileForSimilarRes] = await Promise.all([cached(), myProfilePromise])
      tagsWithCountResult = cachedResult.tags
      latestProfilesResult = cachedResult.profiles
      myProfileForSimilar = myProfileForSimilarRes
    }

    const tagsArray = Array.isArray(tagsWithCountResult) ? tagsWithCountResult : []
    popularTags = [...tagsArray]
      .sort((a, b) => (b._count?.profiles ?? 0) - (a._count?.profiles ?? 0))
      .slice(0, 12)
      .map((t) => ({
        id: t.id,
        name: t.name,
        label: t.label,
        count: t._count?.profiles ?? 0,
      }))

    latestProfiles = Array.isArray(latestProfilesResult) ? latestProfilesResult : []

    if (myProfileForSimilar && myProfileForSimilar.tags.length > 0) {
      const myTagIds = myProfileForSimilar.tags.map((t) => t.tagId)
      const others = await prisma.profile.findMany({
        where: {
          deletedAt: null,
          id: { not: myProfileForSimilar.id },
          tags: { some: { tagId: { in: myTagIds } } },
        },
        include: includeRel,
        take: 9,
      })
      similarProfiles = others
        .map((p) => ({
          p,
          overlap: p.tags.filter((pt) => myTagIds.includes(pt.tagId)).length,
        }))
        .sort((a, b) => b.overlap - a.overlap)
        .map((x) => x.p)
    }
  } catch (err) {
    console.error("Explore page DB error:", err)
    dbError = "資料庫連線異常，目前顯示為空。請確認 .env 的 DATABASE_URL 與資料庫已啟動。"
  }

  const hasSearchQuery = Boolean(q?.trim())
  const showPopularTags = popularTags.length > 0 || !hasSearchQuery

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />

      <div className="container mx-auto max-w-6xl flex-1 px-4 py-10 md:py-14">
        {dbError && (
          <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
            {dbError}
          </div>
        )}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
            探索社群
          </h1>
          <p className="mt-1.5 text-muted-foreground">
            {hasSearchQuery
              ? `搜尋結果：「${q}」`
              : "用 hashtag 搜尋，或看看最新更新與熱門標籤"}
          </p>
        </div>

        {/* Hashtag 搜尋 */}
        <form action="/explore" method="get" className="mb-10">
          <div className="flex gap-2 rounded-xl border border-border/80 bg-card p-2 shadow-soft focus-within:ring-2 focus-within:ring-primary/20">
            <div className="relative flex flex-1 items-center">
              <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                name="q"
                defaultValue={q}
                placeholder="搜尋 hashtag、興趣、專長或名稱（多個關鍵字請用空格或逗號分隔）"
                className="h-11 border-0 bg-transparent pl-10 focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>
            <Button type="submit" size="sm" className="rounded-lg px-6">
              搜尋
            </Button>
          </div>
        </form>

        {/* 與你相似的人（無搜尋時才顯示） */}
        {!hasSearchQuery && similarProfiles.length > 0 && (
          <section className="mb-10">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Users className="h-4 w-4" />
              與你相似的人
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {similarProfiles.map((profile) => {
                const tags = profile.tags.map((pt) => pt.tag).slice(0, 4)
                const tagline = (profile as { tagline?: string | null }).tagline?.trim()
                const hasTagline = Boolean(tagline)
                const hasTags = tags.length > 0
                return (
                  <Link key={profile.id} href={`/u/${profile.handle}`}>
                    <Card className="card-hover border-border/60">
                      <CardContent className="flex items-center gap-4 p-4">
                        {profile.avatar ? (
                          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl">
                            <Image
                              src={profile.avatar}
                              alt={profile.displayName}
                              fill
                              className="object-cover"
                            />
                          </div>
                        ) : (
                          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-lg font-medium text-primary">
                            {profile.displayName.charAt(0)}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0">
                            <p className="font-medium truncate">{profile.displayName}</p>
                            {(profile.cohort || profile.isVolunteerFriend) && (
                              <span className="text-xs text-muted-foreground shrink-0">
                                {profile.isVolunteerFriend
                                  ? "義工之友"
                                  : profile.cohort?.includes("屆")
                                    ? profile.cohort
                                    : profile.cohort
                                      ? `${profile.cohort} 屆`
                                      : ""}
                              </span>
                            )}
                          </div>
                          {hasTagline && (
                            <p className="text-xs text-muted-foreground truncate mt-0.5">
                              {tagline}
                            </p>
                          )}
                          {hasTags && (
                            <p className="text-xs text-muted-foreground truncate mt-0.5">
                              {tags.map((t) => `#${t.label}`).join(" ")}
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                )
              })}
            </div>
          </section>
        )}

        {/* 熱門搜尋推薦 */}
        {showPopularTags && (
          <section className="mb-10">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              熱門搜尋推薦
            </h2>
            <div className="flex flex-wrap gap-2">
              {(popularTags.length > 0
                ? popularTags
                : FALLBACK_HASHTAGS.map((label) => ({
                    id: label,
                    name: label.toLowerCase().replace(/\s/g, ""),
                    label,
                    count: 0,
                  }))
              ).map((tag) => (
                <Link
                  key={tag.id}
                  href={`/explore?q=${encodeURIComponent(tag.label)}`}
                  className="rounded-full bg-secondary px-3 py-1.5 text-sm font-medium text-secondary-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
                >
                  #{tag.label}
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* 最新更新的 Profile / 搜尋結果（與「與你相似的人」相同卡片樣式） */}
        <section>
          <h2 className="mb-5 flex items-center gap-2 text-lg font-semibold tracking-tight">
            <Clock className="h-5 w-5" />
            {hasSearchQuery ? "搜尋結果" : "最新更新的 Profile"}
          </h2>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {latestProfiles.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center rounded-xl border border-dashed border-border/80 bg-muted/30 py-16 text-center">
                <p className="text-muted-foreground">
                  {hasSearchQuery
                    ? "找不到符合的 Profile"
                    : "尚無 Profile，建立一個成為第一個！"}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {hasSearchQuery
                    ? "試試其他關鍵字或點擊上方熱門標籤"
                    : "登入後即可建立你的個人頁"}
                </p>
                {!hasSearchQuery && (
                  <Link href="/signin" className="mt-4">
                    <Button>登入並建立 Profile</Button>
                  </Link>
                )}
              </div>
            ) : (
              latestProfiles.map((profile) => {
                const tags = profile.tags.map((pt) => pt.tag).slice(0, 4)
                const tagline = (profile as { tagline?: string | null }).tagline?.trim()
                const hasTagline = Boolean(tagline)
                const hasTags = tags.length > 0
                return (
                  <Link key={profile.id} href={`/u/${profile.handle}`}>
                    <Card className="card-hover border-border/60">
                      <CardContent className="flex items-center gap-4 p-4">
                        {profile.avatar ? (
                          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl">
                            <Image
                              src={profile.avatar}
                              alt={profile.displayName}
                              fill
                              className="object-cover"
                            />
                          </div>
                        ) : (
                          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-lg font-medium text-primary">
                            {profile.displayName.charAt(0)}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0">
                            <p className="font-medium truncate">{profile.displayName}</p>
                            {(profile.cohort || profile.isVolunteerFriend) && (
                              <span className="text-xs text-muted-foreground shrink-0">
                                {profile.isVolunteerFriend
                                  ? "義工之友"
                                  : profile.cohort?.includes("屆")
                                    ? profile.cohort
                                    : profile.cohort
                                      ? `${profile.cohort} 屆`
                                      : ""}
                              </span>
                            )}
                          </div>
                          {hasTagline && (
                            <p className="text-xs text-muted-foreground truncate mt-0.5">
                              {tagline}
                            </p>
                          )}
                          {hasTags && (
                            <p className="text-xs text-muted-foreground truncate mt-0.5">
                              {tags.map((t) => `#${t.label}`).join(" ")}
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                )
              })
            )}
          </div>

          {hasSearchQuery && (
            <div className="mt-6 flex justify-center">
              <Link href="/explore">
                <Button variant="outline" size="sm" className="rounded-lg">
                  結束搜尋，回到探索
                </Button>
              </Link>
            </div>
          )}
        </section>

        {/* 查看全部夥伴 */}
        {!hasSearchQuery && (
          <section className="mt-12 pt-8 border-t border-border/60">
            <div className="flex justify-center">
              <Link href="/explore/all">
                <Button variant="secondary" className="rounded-lg">
                  查看全部夥伴
                </Button>
              </Link>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
