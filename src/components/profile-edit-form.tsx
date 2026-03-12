"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Image from "next/image"
import { Loader2, Plus, Trash2, Upload, Pencil, X } from "lucide-react"
import { CONTACT_TYPES } from "@/lib/onboarding-constants"

type Experience = {
  id: string
  type: string
  title: string
  org: string
  start: string
  end: string | null
  description: string | null
  isCurrent: boolean
}

type TagWithType = { label: string; type: string }

type ContactRow = { type: string; value: string }

type Profile = {
  handle: string
  displayName: string
  avatar: string | null
  tagline: string | null
  oneLiner: string | null
  location: string | null
  cohort: string | null
  contacts?: ContactRow[]
  isVolunteerFriend: boolean
  nowLearning: string | null
  nowBuilding: string | null
  futureLooking: string | null
  hashtags: string[]
  tagsWithTypes?: TagWithType[]
  experiences: Experience[]
  privacyConfig: Record<string, string>
  deletedAt?: string | null
}

export default function ProfileEditForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [formData, setFormData] = useState({
    displayName: "",
    tagline: "",
    oneLiner: "",
    location: "",
    cohort: "",
    contacts: [] as ContactRow[],
    isVolunteerFriend: false,
    keywordTags: [] as string[],
    nowLearning: "",
    nowBuilding: "",
    futureLooking: "",
  })
  const [privacy, setPrivacy] = useState<Record<string, string>>({
    location: "public",
    experiences: "public",
  })
  const [isStudent, setIsStudent] = useState(false)
  const [newEducation, setNewEducation] = useState({
    title: "",
    org: "",
    start: "",
    end: "",
    description: "",
    isCurrent: false,
  })
  const [newWork, setNewWork] = useState({
    title: "",
    org: "",
    start: "",
    end: "",
    description: "",
    isCurrent: false,
  })
  const [editingExpId, setEditingExpId] = useState<string | null>(null)
  const [editingExpData, setEditingExpData] = useState({
    title: "",
    org: "",
    start: "",
    end: "",
    description: "",
    isCurrent: false,
  })

  const [keywordInput, setKeywordInput] = useState("")
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const validateFields = (): boolean => {
    const err: Record<string, string> = {}
    if (!formData.displayName?.trim()) err.displayName = "請填寫顯示名稱"
    else if (formData.displayName.length > 100) err.displayName = "顯示名稱最多 100 字"
    if (formData.tagline.length > 30) err.tagline = "一句話認識最多 30 字"
    if (formData.oneLiner.length > 500) err.oneLiner = "自我介紹最多 500 字"
    setFieldErrors(err)
    return Object.keys(err).length === 0
  }

  useEffect(() => {
    fetch("/api/profile/me")
      .then((res) => {
        if (!res.ok) throw new Error("無法載入")
        return res.json()
      })
      .then((data: Profile) => {
        setProfile(data)
        const contacts = Array.isArray(data.contacts) && data.contacts.length > 0
          ? data.contacts
          : (data as { contactType?: string; contactValue?: string }).contactType &&
              (data as { contactValue?: string }).contactValue
            ? [{ type: (data as unknown as { contactType: string; contactValue: string }).contactType, value: (data as unknown as { contactType: string; contactValue: string }).contactValue }]
            : []
        const keywordTags = (data.tagsWithTypes ?? []).map((x) => x.label)
        setAvatarUrl(data.avatar ?? null)
        setFormData({
          displayName: data.displayName,
          tagline: (data as { tagline?: string | null }).tagline ?? "",
          oneLiner: data.oneLiner ?? "",
          location: data.location ?? "",
          cohort: data.cohort ?? "",
          contacts,
          isVolunteerFriend: data.isVolunteerFriend ?? false,
          keywordTags,
          nowLearning: data.nowLearning ?? "",
          nowBuilding: data.nowBuilding ?? "",
          futureLooking: data.futureLooking ?? "",
        })
        if (data.privacyConfig && typeof data.privacyConfig === "object") {
          setPrivacy((p) => ({ ...p, ...data.privacyConfig }))
        }
      })
      .catch(() => router.push("/onboarding"))
      .finally(() => setLoading(false))
  }, [router])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile) return
    if (!validateFields()) return
    const workExps = profile.experiences.filter((x) => x.type === "work")
    if (!isStudent && workExps.length === 0) {
      alert("若目前非學生，請至少填寫一筆工作經歷；勾選「還是學生」則工作經歷為選填")
      return
    }
    setSaving(true)
    try {
      const res = await fetch("/api/profile/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          avatar: avatarUrl || undefined,
          tagline: formData.tagline.trim() || undefined,
          hashtags: formData.keywordTags.map((label) => ({ label, type: "hashtag" })),
          location: formData.location || undefined,
          cohort: formData.cohort || undefined,
          contacts: formData.contacts.filter((c) => c.type && c.value.trim()),
          isVolunteerFriend: formData.isVolunteerFriend,
          nowLearning: formData.nowLearning || undefined,
          nowBuilding: formData.nowBuilding || undefined,
          futureLooking: formData.futureLooking || undefined,
          privacyConfig: privacy,
        }),
      })
      if (res.ok) router.push(`/u/${profile.handle}`)
      else alert((await res.json()).message || "儲存失敗")
    } finally {
      setSaving(false)
    }
  }

  const addExperienceByType = async (
    type: "education" | "work",
    exp: { title: string; org: string; start: string; end: string; description: string; isCurrent: boolean }
  ) => {
    if (!exp.title?.trim() || !exp.org?.trim() || !exp.start?.trim()) {
      alert("請填寫職稱／名稱、單位、開始時間")
      return
    }
    const res = await fetch("/api/profile/experiences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        title: exp.title.trim(),
        org: exp.org.trim(),
        start: exp.start.trim(),
        end: exp.end?.trim() || null,
        description: exp.description?.trim() || null,
        isCurrent: exp.isCurrent,
      }),
    })
    if (res.ok) {
      const created = await res.json()
      setProfile((p) =>
        p ? { ...p, experiences: [created, ...p.experiences] } : p
      )
      if (type === "education") {
        setNewEducation({ title: "", org: "", start: "", end: "", description: "", isCurrent: false })
      } else {
        setNewWork({ title: "", org: "", start: "", end: "", description: "", isCurrent: false })
      }
    } else {
      const data = await res.json().catch(() => ({}))
      alert(data.message || "新增失敗")
    }
  }

  const deleteExperience = async (id: string) => {
    if (!confirm("確定刪除這筆經歷？")) return
    const res = await fetch(`/api/profile/experiences/${id}`, { method: "DELETE" })
    if (res.ok && profile)
      setProfile((p) =>
        p ? { ...p, experiences: p.experiences.filter((e) => e.id !== id) } : p
      )
    setEditingExpId(null)
  }

  const updateExperience = async () => {
    if (!editingExpId || !profile) return
    if (!editingExpData.title?.trim() || !editingExpData.org?.trim() || !editingExpData.start?.trim()) {
      alert("請填寫職稱／名稱、單位、開始時間")
      return
    }
    const res = await fetch(`/api/profile/experiences/${editingExpId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: editingExpData.title.trim(),
        org: editingExpData.org.trim(),
        start: editingExpData.start.trim(),
        end: editingExpData.end?.trim() || null,
        description: editingExpData.description?.trim() || null,
        isCurrent: editingExpData.isCurrent,
      }),
    })
    if (res.ok) {
      setProfile((p) =>
        p
          ? {
              ...p,
              experiences: p.experiences.map((e) =>
                e.id === editingExpId
                  ? {
                      ...e,
                      title: editingExpData.title.trim(),
                      org: editingExpData.org.trim(),
                      start: editingExpData.start.trim(),
                      end: editingExpData.end?.trim() || null,
                      description: editingExpData.description?.trim() || null,
                      isCurrent: editingExpData.isCurrent,
                    }
                  : e
              ),
            }
          : p
      )
      setEditingExpId(null)
    } else {
      const data = await res.json().catch(() => ({}))
      alert(data.message || "更新失敗")
    }
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.set("file", file)
      const res = await fetch("/api/upload/avatar", { method: "POST", body: formData })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        alert(data.message || "上傳失敗")
        return
      }
      const { url } = await res.json()
      setAvatarUrl(url)
      if (profile) setProfile((p) => (p ? { ...p, avatar: url } : p))
    } catch {
      alert("上傳失敗")
    } finally {
      setUploading(false)
    }
    e.target.value = ""
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }
  if (!profile) return null

  const isPendingDeletion = Boolean(profile.deletedAt)

  return (
    <div className="space-y-6">
      {isPendingDeletion && (
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
          <CardContent className="pt-6">
            <p className="text-amber-800 dark:text-amber-200 font-medium">您已申請刪除帳號</p>
            <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">正在等待管理員確認，確認後將永久刪除。此期間您的個人頁不會對外顯示。</p>
          </CardContent>
        </Card>
      )}
    <form onSubmit={handleSave} className="space-y-6" style={isPendingDeletion ? { pointerEvents: "none", opacity: 0.7 } : undefined}>
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-base">基本資料</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">個人連結 /u/{profile.handle}（建立時設定，無法修改）</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">大頭照</label>
            <p className="text-xs text-muted-foreground mt-0.5">可上傳 JPG、PNG、WebP、GIF，最大 3MB</p>
            <div className="mt-2 flex items-center gap-4">
              <label className="relative flex h-24 w-24 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-border bg-muted/50 transition-colors hover:bg-muted">
                {avatarUrl ? (
                  <Image
                    src={avatarUrl}
                    alt="大頭照"
                    fill
                    className="object-cover"
                    sizes="96px"
                  />
                ) : (
                  <Upload className="h-8 w-8 text-muted-foreground" />
                )}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="sr-only"
                  onChange={handleAvatarChange}
                  disabled={uploading}
                />
              </label>
              <div className="text-sm text-muted-foreground">
                <p>點擊頭像或框內上傳新照片</p>
                {uploading && <p className="mt-1 text-amber-600 dark:text-amber-400">上傳中…</p>}
              </div>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">顯示名稱</label>
            <Input
              value={formData.displayName}
              onChange={(e) => {
                setFormData({ ...formData, displayName: e.target.value })
                if (fieldErrors.displayName) setFieldErrors((prev) => ({ ...prev, displayName: "" }))
              }}
              required
              className={`mt-1 rounded-lg ${fieldErrors.displayName ? "border-destructive" : ""}`}
            />
            {fieldErrors.displayName && (
              <p className="mt-1 text-xs text-destructive">{fieldErrors.displayName}</p>
            )}
          </div>
          <div>
            <label className="text-sm font-medium">一句話認識</label>
            <p className="text-xs text-muted-foreground mt-0.5">限 30 字內，會顯示在探索社群的個人方塊</p>
            <Input
              value={formData.tagline}
              onChange={(e) => {
                setFormData({ ...formData, tagline: e.target.value.slice(0, 30) })
                if (fieldErrors.tagline) setFieldErrors((prev) => ({ ...prev, tagline: "" }))
              }}
              maxLength={30}
              placeholder="例：喜歡設計與永續的工程師"
              className={`mt-1 rounded-lg ${fieldErrors.tagline ? "border-destructive" : ""}`}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {formData.tagline.length} / 30
              {fieldErrors.tagline && <span className="text-destructive ml-1">{fieldErrors.tagline}</span>}
            </p>
          </div>
          <div>
            <label className="text-sm font-medium">自我介紹</label>
            <p className="text-xs text-muted-foreground mt-0.5">最多 500 字</p>
            <textarea
              value={formData.oneLiner}
              onChange={(e) => {
                setFormData({ ...formData, oneLiner: e.target.value.slice(0, 500) })
                if (fieldErrors.oneLiner) setFieldErrors((prev) => ({ ...prev, oneLiner: "" }))
              }}
              maxLength={500}
              rows={4}
              className={`mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${fieldErrors.oneLiner ? "border-destructive" : "border-input"}`}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {formData.oneLiner.length} / 500
              {fieldErrors.oneLiner && <span className="text-destructive ml-1">{fieldErrors.oneLiner}</span>}
            </p>
          </div>
          <div>
            <label className="text-sm font-medium">所在地</label>
            <Input
              value={formData.location}
              onChange={(e) =>
                setFormData({ ...formData, location: e.target.value })
              }
              className="mt-1 rounded-lg"
            />
            <div className="mt-2 flex gap-2">
              <span className="text-xs text-muted-foreground">顯示：</span>
              <label className="flex items-center gap-1 text-xs">
                <input
                  type="radio"
                  name="privacy-location"
                  checked={privacy.location === "public"}
                  onChange={() =>
                    setPrivacy((p) => ({ ...p, location: "public" }))
                  }
                />
                公開
              </label>
              <label className="flex items-center gap-1 text-xs">
                <input
                  type="radio"
                  name="privacy-location"
                  checked={privacy.location === "registered"}
                  onChange={() =>
                    setPrivacy((p) => ({ ...p, location: "registered" }))
                  }
                />
                僅登入
              </label>
              <label className="flex items-center gap-1 text-xs">
                <input
                  type="radio"
                  name="privacy-location"
                  checked={privacy.location === "private"}
                  onChange={() =>
                    setPrivacy((p) => ({ ...p, location: "private" }))
                  }
                />
                不顯示
              </label>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">四省中科博館義工 屆數（選填）</label>
            <p className="text-xs text-muted-foreground mt-0.5">請填 1-999 的數字</p>
            <Input
              type="number"
              min={1}
              max={999}
              value={(formData.cohort ?? "").replace(/\D/g, "") || ""}
              onChange={(e) => {
                const raw = e.target.value.replace(/\D/g, "")
                const num =
                  raw === ""
                    ? ""
                    : String(Math.min(999, Math.max(1, parseInt(raw, 10) || 0)))
                setFormData({ ...formData, cohort: num })
              }}
              placeholder="例：38"
              className="mt-1 rounded-lg"
            />
            <label className="mt-2 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={formData.isVolunteerFriend}
                onChange={(e) =>
                  setFormData({ ...formData, isVolunteerFriend: e.target.checked })
                }
              />
              我是義工之友
            </label>
          </div>
          <div>
            <label className="text-sm font-medium">聯絡方式（選填）</label>
            <p className="text-xs text-muted-foreground mt-0.5">可新增多筆，例如 LinkedIn、Instagram</p>
            <div className="mt-2 space-y-2">
              {formData.contacts.map((c, i) => (
                <div key={i} className="flex flex-wrap gap-2 items-center">
                  <select
                    value={c.type}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        contacts: formData.contacts.map((row, j) =>
                          j === i ? { ...row, type: e.target.value } : row
                        ),
                      })
                    }
                    className="rounded-lg border border-input bg-background px-3 py-2 text-sm min-w-[120px]"
                  >
                    {CONTACT_TYPES.map((opt) => (
                      <option key={opt.value || "empty"} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <Input
                    value={c.value}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        contacts: formData.contacts.map((row, j) =>
                          j === i ? { ...row, value: e.target.value } : row
                        ),
                      })
                    }
                    placeholder="帳號或連結"
                    className="flex-1 min-w-[140px] rounded-lg"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-destructive hover:text-destructive"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        contacts: formData.contacts.filter((_, j) => j !== i),
                      })
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-lg"
                onClick={() =>
                  setFormData({
                    ...formData,
                    contacts: [...formData.contacts, { type: "Line", value: "" }],
                  })
                }
              >
                <Plus className="mr-1 h-4 w-4" />
                新增一筆聯絡方式
              </Button>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">給自己的關鍵字（興趣、專長等等…）</label>
            <p className="text-xs text-muted-foreground mt-0.5">輸入後按 Enter 新增標籤，點標籤右上角 ✕ 可刪除</p>
            <div className="mt-2 flex flex-wrap gap-2 rounded-lg border border-input bg-background px-3 py-2 min-h-[42px]">
              {formData.keywordTags.map((tag, i) => (
                <span
                  key={`${tag}-${i}`}
                  className="inline-flex items-center gap-0.5 rounded-full bg-secondary pl-2.5 pr-1 py-1 text-sm text-secondary-foreground"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        keywordTags: formData.keywordTags.filter((_, j) => j !== i),
                      })
                    }
                    className="rounded-full p-0.5 hover:bg-secondary-foreground/20"
                    aria-label="刪除"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              ))}
              <input
                type="text"
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    const v = keywordInput.trim()
                    if (v && !formData.keywordTags.includes(v)) {
                      setFormData({ ...formData, keywordTags: [...formData.keywordTags, v] })
                      setKeywordInput("")
                    }
                  }
                }}
                placeholder="輸入關鍵字後按 Enter"
                className="min-w-[120px] flex-1 border-0 bg-transparent py-1 text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">最近在學</label>
            <Input
              value={formData.nowLearning}
              onChange={(e) =>
                setFormData({ ...formData, nowLearning: e.target.value })
              }
              className="mt-1 rounded-lg"
            />
          </div>
          <div>
            <label className="text-sm font-medium">最近在做</label>
            <Input
              value={formData.nowBuilding}
              onChange={(e) =>
                setFormData({ ...formData, nowBuilding: e.target.value })
              }
              className="mt-1 rounded-lg"
            />
          </div>
          <div>
            <label className="text-sm font-medium">對未來的期待</label>
            <Input
              value={formData.futureLooking}
              onChange={(e) =>
                setFormData({ ...formData, futureLooking: e.target.value })
              }
              className="mt-1 rounded-lg"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-base">學歷與工作經歷</CardTitle>
          <p className="text-xs text-muted-foreground">
            經歷顯示：{" "}
            <label className="inline-flex items-center gap-1">
              <input
                type="radio"
                name="privacy-exp"
                checked={privacy.experiences === "public"}
                onChange={() =>
                  setPrivacy((p) => ({ ...p, experiences: "public" }))
                }
              />
              公開
            </label>
            <label className="ml-2 inline-flex items-center gap-1">
              <input
                type="radio"
                name="privacy-exp"
                checked={privacy.experiences === "registered"}
                onChange={() =>
                  setPrivacy((p) => ({ ...p, experiences: "registered" }))
                }
              />
              僅登入
            </label>
            <label className="ml-2 inline-flex items-center gap-1">
              <input
                type="radio"
                name="privacy-exp"
                checked={privacy.experiences === "private"}
                onChange={() =>
                  setPrivacy((p) => ({ ...p, experiences: "private" }))
                }
              />
              不顯示
            </label>
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 學歷 */}
          <div>
            <h4 className="text-sm font-medium mb-2">學歷</h4>
            {profile.experiences
              .filter((e) => e.type === "education")
              .map((exp) =>
                editingExpId === exp.id ? (
                  <div key={exp.id} className="rounded-lg border border-border/80 p-3 mb-2 space-y-2">
                    <Input
                      placeholder="學位／名稱"
                      value={editingExpData.title}
                      onChange={(e) => setEditingExpData((x) => ({ ...x, title: e.target.value }))}
                      className="rounded-lg"
                    />
                    <Input
                      placeholder="學校／單位"
                      value={editingExpData.org}
                      onChange={(e) => setEditingExpData((x) => ({ ...x, org: e.target.value }))}
                      className="rounded-lg"
                    />
                    <div className="flex gap-2">
                      <Input
                        placeholder="開始（例 2022）"
                        value={editingExpData.start}
                        onChange={(e) => setEditingExpData((x) => ({ ...x, start: e.target.value }))}
                        className="rounded-lg"
                      />
                      <Input
                        placeholder="結束（留空＝現在）"
                        value={editingExpData.end}
                        onChange={(e) => setEditingExpData((x) => ({ ...x, end: e.target.value }))}
                        className="rounded-lg"
                      />
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <label className="flex items-center gap-1 text-sm">
                        <input
                          type="checkbox"
                          checked={editingExpData.isCurrent}
                          onChange={(e) => setEditingExpData((x) => ({ ...x, isCurrent: e.target.checked }))}
                        />
                        在學中
                      </label>
                      <Button type="button" size="sm" onClick={updateExperience} className="rounded-lg">
                        儲存
                      </Button>
                      <Button type="button" variant="ghost" size="sm" onClick={() => setEditingExpId(null)} className="rounded-lg">
                        取消
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div
                    key={exp.id}
                    className="flex items-start justify-between gap-2 rounded-lg border border-border/80 p-3 mb-2"
                  >
                    <div>
                      <p className="font-medium">
                        {exp.title} · {exp.org}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {exp.start} － {exp.end || "現在"}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-0.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-foreground"
                        onClick={() => {
                          setEditingExpId(exp.id)
                          setEditingExpData({
                            title: exp.title,
                            org: exp.org,
                            start: exp.start,
                            end: exp.end ?? "",
                            description: exp.description ?? "",
                            isCurrent: exp.isCurrent,
                          })
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => deleteExperience(exp.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )
              )}
            <div className="grid gap-2 rounded-lg border border-dashed border-border/80 p-3 sm:grid-cols-2">
              <Input
                placeholder="學位／名稱"
                value={newEducation.title}
                onChange={(e) =>
                  setNewEducation((x) => ({ ...x, title: e.target.value }))
                }
                className="rounded-lg"
              />
              <Input
                placeholder="學校／單位"
                value={newEducation.org}
                onChange={(e) =>
                  setNewEducation((x) => ({ ...x, org: e.target.value }))
                }
                className="rounded-lg"
              />
              <Input
                placeholder="開始（例 2022）"
                value={newEducation.start}
                onChange={(e) =>
                  setNewEducation((x) => ({ ...x, start: e.target.value }))
                }
                className="rounded-lg"
              />
              <Input
                placeholder="結束（留空＝現在）"
                value={newEducation.end}
                onChange={(e) =>
                  setNewEducation((x) => ({ ...x, end: e.target.value }))
                }
                className="rounded-lg"
              />
              <div className="sm:col-span-2 flex items-center gap-2">
                <label className="flex items-center gap-1 text-sm">
                  <input
                    type="checkbox"
                    checked={newEducation.isCurrent}
                    onChange={(e) =>
                      setNewEducation((x) => ({ ...x, isCurrent: e.target.checked }))
                    }
                  />
                  在學中
                </label>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => addExperienceByType("education", newEducation)}
                  className="rounded-lg"
                >
                  確認
                </Button>
              </div>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isStudent}
              onChange={(e) => setIsStudent(e.target.checked)}
            />
            還是學生（勾選則工作經歷為選填）
          </label>

          {/* 工作經歷 */}
          <div>
            <h4 className="text-sm font-medium mb-2">工作經歷</h4>
            {profile.experiences
              .filter((e) => e.type === "work")
              .map((exp) =>
                editingExpId === exp.id ? (
                  <div key={exp.id} className="rounded-lg border border-border/80 p-3 mb-2 space-y-2">
                    <Input
                      placeholder="職稱"
                      value={editingExpData.title}
                      onChange={(e) => setEditingExpData((x) => ({ ...x, title: e.target.value }))}
                      className="rounded-lg"
                    />
                    <Input
                      placeholder="單位"
                      value={editingExpData.org}
                      onChange={(e) => setEditingExpData((x) => ({ ...x, org: e.target.value }))}
                      className="rounded-lg"
                    />
                    <div className="flex gap-2">
                      <Input
                        placeholder="開始（例 2022）"
                        value={editingExpData.start}
                        onChange={(e) => setEditingExpData((x) => ({ ...x, start: e.target.value }))}
                        className="rounded-lg"
                      />
                      <Input
                        placeholder="結束（留空＝現在）"
                        value={editingExpData.end}
                        onChange={(e) => setEditingExpData((x) => ({ ...x, end: e.target.value }))}
                        className="rounded-lg"
                      />
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <label className="flex items-center gap-1 text-sm">
                        <input
                          type="checkbox"
                          checked={editingExpData.isCurrent}
                          onChange={(e) => setEditingExpData((x) => ({ ...x, isCurrent: e.target.checked }))}
                        />
                        目前任職
                      </label>
                      <Button type="button" size="sm" onClick={updateExperience} className="rounded-lg">
                        儲存
                      </Button>
                      <Button type="button" variant="ghost" size="sm" onClick={() => setEditingExpId(null)} className="rounded-lg">
                        取消
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div
                    key={exp.id}
                    className="flex items-start justify-between gap-2 rounded-lg border border-border/80 p-3 mb-2"
                  >
                    <div>
                      <p className="font-medium">
                        {exp.title} · {exp.org}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {exp.start} － {exp.end || "現在"}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-0.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-foreground"
                        onClick={() => {
                          setEditingExpId(exp.id)
                          setEditingExpData({
                            title: exp.title,
                            org: exp.org,
                            start: exp.start,
                            end: exp.end ?? "",
                            description: exp.description ?? "",
                            isCurrent: exp.isCurrent,
                          })
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => deleteExperience(exp.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )
              )}
            <div className="grid gap-2 rounded-lg border border-dashed border-border/80 p-3 sm:grid-cols-2">
              <Input
                placeholder="職稱"
                value={newWork.title}
                onChange={(e) =>
                  setNewWork((x) => ({ ...x, title: e.target.value }))
                }
                className="rounded-lg"
              />
              <Input
                placeholder="單位"
                value={newWork.org}
                onChange={(e) => setNewWork((x) => ({ ...x, org: e.target.value }))}
                className="rounded-lg"
              />
              <Input
                placeholder="開始（例 2022）"
                value={newWork.start}
                onChange={(e) =>
                  setNewWork((x) => ({ ...x, start: e.target.value }))
                }
                className="rounded-lg"
              />
              <Input
                placeholder="結束（留空＝現在）"
                value={newWork.end}
                onChange={(e) =>
                  setNewWork((x) => ({ ...x, end: e.target.value }))
                }
                className="rounded-lg"
              />
              <div className="sm:col-span-2 flex items-center gap-2">
                <label className="flex items-center gap-1 text-sm">
                  <input
                    type="checkbox"
                    checked={newWork.isCurrent}
                    onChange={(e) =>
                      setNewWork((x) => ({ ...x, isCurrent: e.target.checked }))
                    }
                  />
                  目前任職
                </label>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => addExperienceByType("work", newWork)}
                  className="rounded-lg"
                >
                  確認
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Button
        type="submit"
        className="w-full rounded-lg"
        size="lg"
        disabled={saving || isPendingDeletion}
      >
        {saving ? "儲存中..." : "儲存並回到個人頁"}
      </Button>

      {!isPendingDeletion && (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-base text-destructive">刪除帳號</CardTitle>
            <p className="text-sm text-muted-foreground">刪除後前台將不再顯示您的個人頁，僅保留於管理員後台，待管理員確認後會永久刪除。</p>
          </CardHeader>
          <CardContent>
            <Button
              type="button"
              variant="destructive"
              className="rounded-lg"
              onClick={async () => {
                if (!confirm("確定要申請刪除帳號嗎？")) return
                try {
                  const res = await fetch("/api/account/delete-request", { method: "POST" })
                  const data = await res.json().catch(() => ({}))
                  if (res.ok) {
                    router.refresh()
                    setProfile((p) => (p ? { ...p, deletedAt: new Date().toISOString() } : p))
                  } else {
                    alert(data.message || "操作失敗")
                  }
                } catch {
                  alert("操作失敗")
                }
              }}
            >
              刪除我的帳號
            </Button>
          </CardContent>
        </Card>
      )}
    </form>
    </div>
  )
}
