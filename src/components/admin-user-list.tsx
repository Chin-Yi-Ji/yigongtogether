"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Shield, ShieldOff, Trash2, Loader2 } from "lucide-react"

type UserItem = {
  id: string
  email: string | null
  name: string | null
  image: string | null
  role: string
  profile: {
    id: string
    handle: string
    displayName: string
    deletedAt: Date | null
    tags: { label: string; type: string }[]
  } | null
}

export function AdminUserList({
  initialList,
  currentUserId,
}: {
  initialList: UserItem[]
  currentUserId: string
}) {
  const router = useRouter()
  const [list, setList] = useState(initialList)
  const [loadingId, setLoadingId] = useState<string | null>(null)

  async function setRole(userId: string, role: "user" | "admin") {
    setLoadingId(userId)
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      })
      if (res.ok) {
        setList((prev) => prev.map((u) => (u.id === userId ? { ...u, role } : u)))
        router.refresh()
      } else {
        const data = await res.json().catch(() => ({}))
        alert(data.message || "更新失敗")
      }
    } finally {
      setLoadingId(null)
    }
  }

  async function permanentDelete(userId: string) {
    if (userId === currentUserId) {
      alert("無法刪除自己")
      return
    }
    if (!confirm("確定要永久刪除此帳號？此操作無法復原。")) return
    setLoadingId(userId)
    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: "DELETE" })
      if (res.ok) {
        setList((prev) => prev.filter((u) => u.id !== userId))
        router.refresh()
      } else {
        const data = await res.json().catch(() => ({}))
        alert(data.message || "刪除失敗")
      }
    } finally {
      setLoadingId(null)
    }
  }

  return (
    <div className="space-y-4">
      {list.map((u) => (
        <Card key={u.id} className="border-border/60">
          <CardHeader className="pb-2">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                {u.image ? (
                  <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg">
                    <Image src={u.image} alt="" fill className="object-cover" />
                  </div>
                ) : (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-sm font-medium">
                    {u.name?.charAt(0) ?? u.email?.charAt(0) ?? "?"}
                  </div>
                )}
                <div>
                  <CardTitle className="text-base">
                    {u.profile?.displayName ?? u.name ?? "—"}
                    {u.profile?.deletedAt && (
                      <span className="ml-2 text-xs font-normal text-amber-600 dark:text-amber-400">（已申請刪除）</span>
                    )}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">{u.email ?? "無 email"}</p>
                  {u.profile && (
                    <p className="text-xs text-muted-foreground">/{u.profile.handle}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${u.role === "admin" ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                  {u.role === "admin" ? "管理員" : "一般"}
                </span>
                {u.id !== currentUserId && (
                  <>
                    {u.role === "admin" ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="rounded-lg"
                        disabled={loadingId === u.id}
                        onClick={() => setRole(u.id, "user")}
                      >
                        {loadingId === u.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldOff className="h-4 w-4" />}
                        <span className="ml-1">取消管理員</span>
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="rounded-lg"
                        disabled={loadingId === u.id}
                        onClick={() => setRole(u.id, "admin")}
                      >
                        {loadingId === u.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
                        <span className="ml-1">設為管理員</span>
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="rounded-lg"
                      disabled={loadingId === u.id}
                      onClick={() => permanentDelete(u.id)}
                    >
                      {loadingId === u.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      <span className="ml-1">永久刪除</span>
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardHeader>
          {u.profile && u.profile.tags.length > 0 && (
            <CardContent className="pt-0">
              <p className="text-xs text-muted-foreground mb-1">標籤</p>
              <div className="flex flex-wrap gap-1.5">
                {u.profile.tags.map((t) => (
                  <span
                    key={`${t.label}-${t.type}`}
                    className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground"
                  >
                    #{t.label} <span className="text-muted-foreground">({t.type})</span>
                  </span>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  )
}
