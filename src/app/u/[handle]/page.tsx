import type { Metadata } from "next"
import { prisma } from "@/lib/prisma"
import { notFound, redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Image from "next/image"
import Link from "next/link"
import { SiteHeader } from "@/components/site-header"
import { ArrowLeft, MapPin } from "lucide-react"
import { auth } from "@/auth"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>
}): Promise<Metadata> {
  const { handle } = await params
  const profile = await prisma.profile.findUnique({
    where: { handle, deletedAt: null },
    select: { displayName: true, tagline: true, oneLiner: true },
  })
  if (!profile) return { title: "找不到 | YigongHub" }
  const title = `${profile.displayName} | YigongHub`
  const description =
    (profile.tagline ?? profile.oneLiner?.slice(0, 120) ?? "").trim() || undefined
  return { title, description }
}

function canShow(visibility: string | undefined, isLoggedIn: boolean): boolean {
  if (!visibility || visibility === "public") return true
  if (visibility === "registered") return isLoggedIn
  return false // private
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ handle: string }>
}) {
  const { handle } = await params
  const session = await auth()
  if (!session?.user?.id) {
    redirect(`/signin?callbackUrl=${encodeURIComponent(`/u/${handle}`)}`)
  }
  const isLoggedIn = true

  const profile = await prisma.profile.findUnique({
    where: { handle },
    include: {
      user: {
        select: {
          image: true,
        },
      },
      tags: {
        include: {
          tag: true,
        },
      },
      experiences: {
        orderBy: {
          start: "desc",
        },
      },
    },
  })

  if (!profile) {
    notFound()
  }
  if (profile.deletedAt != null) {
    notFound()
  }

  const privacy = (typeof profile.privacyConfig === "object" && profile.privacyConfig !== null
    ? profile.privacyConfig as Record<string, string>
    : {}) as Record<string, string>
  const showLocation = canShow(privacy.location ?? "public", isLoggedIn)
  const showExperiences = canShow(privacy.experiences ?? "public", isLoggedIn)

  const allTags = profile.tags.map((pt) => pt.tag)
  const contacts = Array.isArray(profile.contacts)
    ? (profile.contacts as { type: string; value: string }[])
    : profile.contactType && profile.contactValue
      ? [{ type: profile.contactType, value: profile.contactValue }]
      : []

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />

      <div className="container mx-auto max-w-3xl flex-1 px-4 py-8 md:py-12">
        <Link
          href="/explore"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          返回探索
        </Link>

        {/* Profile Header */}
        <Card className="overflow-hidden border-border/60 shadow-soft-lg">
          <div className="h-28 bg-gradient-to-br from-primary/25 via-primary/10 to-transparent md:h-32" />
          <CardContent className="pt-0 pb-8">
            <div className="-mt-14 flex flex-col gap-4 sm:flex-row sm:items-end">
              {profile.avatar ? (
                <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-2xl border-4 border-card shadow-soft">
                  <Image
                    src={profile.avatar}
                    alt={profile.displayName}
                    fill
                    className="object-cover"
                    priority
                  />
                </div>
              ) : (
                <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-2xl border-4 border-card bg-primary/10 text-3xl font-semibold text-primary shadow-soft">
                  {profile.displayName.charAt(0)}
                </div>
              )}
              <div className="min-w-0 flex-1 pb-1">
                <div className="flex items-baseline justify-between gap-3">
                  <h1 className="text-2xl font-semibold tracking-tight md:text-3xl min-w-0">
                    {profile.displayName}
                  </h1>
                  {(profile.cohort || profile.isVolunteerFriend) && (
                    <span className="text-sm font-normal text-muted-foreground shrink-0">
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
                {showLocation && profile.location && (
                  <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4 shrink-0" />
                    {profile.location}
                  </p>
                )}
                {contacts.length > 0 && (
                  <div className="mt-1.5 space-y-0.5 text-sm text-muted-foreground">
                    {contacts.map((c) => (
                      <p key={`${c.type}-${c.value}`}>
                        {c.type}： {c.value}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {allTags.length > 0 && (
              <div className="mt-6 flex flex-wrap gap-2">
                {allTags.map((tag) => (
                  <span
                    key={tag.id}
                    className="rounded-full bg-secondary px-3 py-1.5 text-sm font-medium text-secondary-foreground"
                  >
                    #{tag.label}
                  </span>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 自我介紹（獨立框，在 hashtag 下、經歷上） */}
        {profile.oneLiner && (
          <Card className="mt-8 border-border/60">
            <CardHeader>
              <CardTitle className="text-base">自我介紹</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-muted-foreground leading-relaxed">
                {profile.oneLiner}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Content Sections */}
        <div className="mt-8 space-y-6">
          {profile.futureLooking && (
            <Card className="border-border/60">
              <CardHeader>
                <CardTitle className="text-base">對未來的期待</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-muted-foreground leading-relaxed">
                  {profile.futureLooking}
                </p>
              </CardContent>
            </Card>
          )}

          {(profile.nowLearning || profile.nowBuilding) && (
            <div className="grid gap-6 md:grid-cols-2">
              {profile.nowLearning && (
                <Card className="border-border/60">
                  <CardHeader>
                    <CardTitle className="text-base">最近在學</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {profile.nowLearning}
                    </p>
                  </CardContent>
                </Card>
              )}
              {profile.nowBuilding && (
                <Card className="border-border/60">
                  <CardHeader>
                    <CardTitle className="text-base">最近在做</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {profile.nowBuilding}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {showExperiences && profile.experiences.length > 0 &&
            (() => {
              const currentJobs = profile.experiences.filter((e) => e.isCurrent)
              const pastJobs = profile.experiences.filter((e) => !e.isCurrent)
              return (
                <>
                  {currentJobs.length > 0 && (
                    <Card className="border-border/60">
                      <CardHeader>
                        <CardTitle className="text-base">目前工作經歷</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        {currentJobs.map((exp) => (
                          <div
                            key={exp.id}
                            className="border-l-2 border-primary pl-5"
                          >
                            <div className="flex flex-wrap items-baseline justify-between gap-2">
                              <h3 className="font-semibold">{exp.title}</h3>
                              <span className="text-sm text-muted-foreground">
                                {exp.start} － 現在
                              </span>
                            </div>
                            <p className="mt-0.5 text-sm text-muted-foreground">
                              {exp.org}
                            </p>
                            {exp.description && (
                              <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                                {exp.description}
                              </p>
                            )}
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}
                  {pastJobs.length > 0 && (
                    <Card className="border-border/60">
                      <CardHeader>
                        <CardTitle className="text-base">過往經歷</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        {pastJobs.map((exp) => (
                          <div
                            key={exp.id}
                            className="border-l-2 border-border pl-5"
                          >
                            <div className="flex flex-wrap items-baseline justify-between gap-2">
                              <h3 className="font-semibold">{exp.title}</h3>
                              <span className="text-sm text-muted-foreground">
                                {exp.start} － {exp.end || "現在"}
                              </span>
                            </div>
                            <p className="mt-0.5 text-sm text-muted-foreground">
                              {exp.org}
                            </p>
                            {exp.description && (
                              <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                                {exp.description}
                              </p>
                            )}
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}
                </>
              )
            })()}
        </div>
      </div>
    </div>
  )
}
