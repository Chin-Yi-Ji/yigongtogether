"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, Eye, EyeOff } from "lucide-react"

const TAG_TYPES = [
  { value: "interest", label: "興趣" },
  { value: "expertise", label: "專長" },
  { value: "topic", label: "主題" },
  { value: "hashtag", label: "hashtag" },
] as const

type TagItem = {
  id: string
  name: string
  label: string
  type: string
  hidden: boolean
  profileCount: number
}

export function AdminTagList() {
  const router = useRouter()
  const [tags, setTags] = useState<TagItem[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/admin/tags")
      .then((res) => res.ok ? res.json() : [])
      .then(setTags)
      .finally(() => setLoading(false))
  }, [])

  async function toggleHidden(tag: TagItem) {
    setUpdatingId(tag.id)
    try {
      const res = await fetch(`/api/admin/tags/${tag.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hidden: !tag.hidden }),
      })
      if (res.ok) {
        setTags((prev) => prev.map((t) => (t.id === tag.id ? { ...t, hidden: !t.hidden } : t)))
        router.refresh()
      } else {
        const data = await res.json().catch(() => ({}))
        alert(data.message || "更新失敗")
      }
    } finally {
      setUpdatingId(null)
    }
  }

  async function updateType(tag: TagItem, newType: string) {
    if (newType === tag.type) return
    setUpdatingId(tag.id)
    try {
      const res = await fetch(`/api/admin/tags/${tag.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: newType }),
      })
      if (res.ok) {
        setTags((prev) => prev.map((t) => (t.id === tag.id ? { ...t, type: newType } : t)))
        router.refresh()
      } else {
        const data = await res.json().catch(() => ({}))
        alert(data.message || "更新失敗")
      }
    } finally {
      setUpdatingId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (tags.length === 0) {
    return (
      <Card className="border-border/60">
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          尚無標籤
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-border/60">
      <CardContent className="p-0">
        <div className="max-h-[320px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted/80 border-b border-border/60">
              <tr>
                <th className="text-left py-3 px-4 font-medium">標籤名稱</th>
                <th className="text-left py-3 px-4 font-medium">類型</th>
                <th className="text-right py-3 px-4 font-medium">使用數</th>
                <th className="text-right py-3 px-4 font-medium w-28">顯示</th>
              </tr>
            </thead>
            <tbody>
              {tags.map((tag) => (
                <tr key={tag.id} className="border-b border-border/40 last:border-0">
                  <td className="py-2.5 px-4">
                    <span className={tag.hidden ? "text-muted-foreground" : ""}>#{tag.label}</span>
                  </td>
                  <td className="py-2.5 px-4">
                    <select
                      value={tag.type}
                      onChange={(e) => updateType(tag, e.target.value)}
                      disabled={updatingId === tag.id}
                      className="rounded border border-input bg-background px-2 py-1 text-xs"
                    >
                      {TAG_TYPES.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2.5 px-4 text-right tabular-nums">{tag.profileCount}</td>
                  <td className="py-2.5 px-4 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => toggleHidden(tag)}
                      disabled={updatingId === tag.id}
                      title={tag.hidden ? "顯示於探索" : "隱藏"}
                    >
                      {updatingId === tag.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : tag.hidden ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
