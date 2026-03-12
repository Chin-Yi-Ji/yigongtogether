import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { isAdmin } from "@/lib/admin"
import { AdminUserList } from "@/components/admin-user-list"
import { AdminTagList } from "@/components/admin-tag-list"
import { Users, UserCheck, UserX, Tags } from "lucide-react"

export default async function AdminPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/signin")
  if (!isAdmin({ email: session.user.email, role: session.user.role })) redirect("/")

  const [users, totalUsers, totalProfiles, pendingDeleteCount] = await Promise.all([
    prisma.user.findMany({
      orderBy: { id: "desc" },
      include: {
        profile: {
          include: {
            tags: { include: { tag: true } },
          },
        },
      },
    }),
    prisma.user.count(),
    prisma.profile.count({ where: { deletedAt: null } }),
    prisma.profile.count({ where: { deletedAt: { not: null } } }),
  ])

  const list = users.map((u) => ({
    id: u.id,
    email: u.email,
    name: u.name,
    image: u.image,
    role: u.role,
    profile: u.profile
      ? {
          id: u.profile.id,
          handle: u.profile.handle,
          displayName: u.profile.displayName,
          deletedAt: u.profile.deletedAt,
          tags: u.profile.tags.map((pt) => ({ label: pt.tag.label, type: pt.tag.type })),
        }
      : null,
  }))

  const stats = [
    { label: "總帳號數", value: totalUsers, icon: Users },
    { label: "已建個人檔案", value: totalProfiles, icon: UserCheck },
    { label: "待確認刪除", value: pendingDeleteCount, icon: UserX },
  ]

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight mb-2">管理員後台</h1>
      <p className="text-sm text-muted-foreground mb-8">帳號列表、數據統計與標籤管理。</p>

      <section className="mb-10">
        <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
          <Users className="h-5 w-5" />
          數據與統計
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {stats.map(({ label, value, icon: Icon }) => (
            <div
              key={label}
              className="rounded-xl border border-border/60 bg-card px-5 py-4 flex items-center gap-4"
            >
              <div className="rounded-lg bg-muted/60 p-2">
                <Icon className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-semibold tabular-nums">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
          <Tags className="h-5 w-5" />
          標籤管理
        </h2>
        <p className="text-sm text-muted-foreground mb-4">隱藏後該標籤不會顯示於探索頁的熱門搜尋推薦。</p>
        <AdminTagList />
      </section>

      <section>
        <h2 className="text-lg font-medium mb-4">帳號列表</h2>
        <p className="text-sm text-muted-foreground mb-4">可查看所有帳號與標籤、指派管理員、確認刪除後永久刪除帳號。</p>
        <AdminUserList initialList={list} currentUserId={session.user.id} />
      </section>
    </div>
  )
}
