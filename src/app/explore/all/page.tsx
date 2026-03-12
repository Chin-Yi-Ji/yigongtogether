import { prisma } from "@/lib/prisma"
import { Card, CardContent } from "@/components/ui/card"
import Link from "next/link"
import Image from "next/image"
import { SiteHeader } from "@/components/site-header"
import { ArrowLeft } from "lucide-react"
import { auth } from "@/auth"
import { redirect } from "next/navigation"

/** 從屆數字串（如 "38 屆"）取出數字，無法解析則回傳 Infinity 排最後 */
function cohortOrder(cohort: string | null): number {
  if (!cohort || cohort.includes("義工之友")) return Infinity
  const match = cohort.match(/(\d+)/)
  return match ? parseInt(match[1], 10) : Infinity
}

export default async function ExploreAllPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/signin?callbackUrl=/explore/all")

  const profiles = await prisma.profile.findMany({
    where: { deletedAt: null },
    include: {
      tags: { include: { tag: true } },
      user: { select: { image: true } },
    },
    orderBy: { cohort: "asc" },
  })

  const sorted = [...profiles].sort((a, b) => {
    const orderA = cohortOrder(a.cohort)
    const orderB = cohortOrder(b.cohort)
    if (orderA !== orderB) return orderA - orderB
    return (a.displayName || "").localeCompare(b.displayName || "")
  })

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />

      <div className="container mx-auto max-w-6xl flex-1 px-4 py-10 md:py-14">
        <Link
          href="/explore"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          返回探索
        </Link>

        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
          全部夥伴
        </h1>
        <p className="mt-1.5 text-muted-foreground">
          依屆數由小到大排列
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((profile) => {
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

        {sorted.length === 0 && (
          <div className="mt-8 flex flex-col items-center justify-center rounded-xl border border-dashed border-border/80 bg-muted/30 py-16 text-center">
            <p className="text-muted-foreground">尚無夥伴資料</p>
          </div>
        )}
      </div>
    </div>
  )
}
