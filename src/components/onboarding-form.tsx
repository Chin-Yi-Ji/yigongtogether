"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatHandle, normalizeTag } from "@/lib/utils"
import { LOCATION_OPTIONS, CONTACT_TYPES } from "@/lib/onboarding-constants"
import { ChevronRight, Upload, X, Plus } from "lucide-react"

const MAX_INTERESTS = 5
const MAX_BIO = 500

interface OnboardingFormProps {
  user: {
    id: string
    name?: string | null
    email?: string | null
    image?: string | null
  }
  /** 預設標籤依四向度分組、每組內依使用人數排序（由 onboarding 頁傳入） */
  interestTagGroups: string[][]
}

type ExperienceRow = {
  type: "work" | "education"
  title: string
  org: string
  start: string
  end: string
  description: string
  isCurrent: boolean
}

const emptyExp = (): ExperienceRow => ({
  type: "work",
  title: "",
  org: "",
  start: "",
  end: "",
  description: "",
  isCurrent: false,
})

export default function OnboardingForm({ user, interestTagGroups }: OnboardingFormProps) {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)

  // Step 1
  const [location, setLocation] = useState<string>("")
  const [locationCustom, setLocationCustom] = useState("")

  // Step 2
  const [selectedInterests, setSelectedInterests] = useState<string[]>([])

  // Step 3
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user.image ?? null)
  const [handle, setHandle] = useState(formatHandle(user.name || user.email?.split("@")[0] || ""))
  const [displayName, setDisplayName] = useState(user.name || "")
  const [oneLiner, setOneLiner] = useState("")
  const [educationExperiences, setEducationExperiences] = useState<ExperienceRow[]>([{ ...emptyExp(), type: "education" }])
  const [workExperiences, setWorkExperiences] = useState<ExperienceRow[]>([{ ...emptyExp(), type: "work" }])
  const [isStudent, setIsStudent] = useState(false)
  const [cohort, setCohort] = useState("")
  const [isVolunteerFriend, setIsVolunteerFriend] = useState(false)
  const [contactType, setContactType] = useState("")
  const [contactValue, setContactValue] = useState("")
  const [extraHashtags, setExtraHashtags] = useState("")
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const locationDisplay = location === "國外" && locationCustom.trim() ? locationCustom.trim() : location
  const allInterests = [...selectedInterests, ...extraHashtags.split(/[\s,]+/).filter(Boolean).map((s) => s.replace(/^#+/, ""))].filter(Boolean)

  const toggleInterest = (tag: string) => {
    setSelectedInterests((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : prev.length >= MAX_INTERESTS ? prev : [...prev, tag]
    )
  }

  const addEducation = () => setEducationExperiences((e) => [...e, { ...emptyExp(), type: "education" }])
  const removeEducation = (i: number) => {
    if (educationExperiences.length <= 1) return
    setEducationExperiences((e) => e.filter((_, idx) => idx !== i))
  }
  const updateEducation = (i: number, field: keyof ExperienceRow, value: string | boolean) => {
    setEducationExperiences((e) => e.map((row, idx) => (idx === i ? { ...row, [field]: value } : row)))
  }

  const addWork = () => setWorkExperiences((e) => [...e, { ...emptyExp(), type: "work" }])
  const removeWork = (i: number) => {
    if (workExperiences.length <= 1) return
    setWorkExperiences((e) => e.filter((_, idx) => idx !== i))
  }
  const updateWork = (i: number, field: keyof ExperienceRow, value: string | boolean) => {
    setWorkExperiences((e) => e.map((row, idx) => (idx === i ? { ...row, [field]: value } : row)))
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
    } catch {
      alert("上傳失敗")
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (step < 3) {
      if (step === 1 && !location) {
        alert("請選擇目前位置")
        return
      }
      if (step === 2 && selectedInterests.length === 0) {
        alert("請至少選擇一個興趣關注")
        return
      }
      setStep((s) => s + 1)
      return
    }

    // Step 3 submit
    const loc = location === "國外" && locationCustom.trim() ? locationCustom.trim() : location
    if (!loc) {
      alert("請選擇目前位置（可回到上一步）")
      return
    }
    const validEducation = educationExperiences.filter((e) => e.title.trim() && e.org.trim() && e.start.trim())
    const validWork = workExperiences.filter((e) => e.title.trim() && e.org.trim() && e.start.trim())
    if (!isStudent && validWork.length === 0) {
      alert("若目前非學生，請至少填寫一筆工作經歷（職稱、單位、開始時間）；勾選「還是學生」則工作經歷為選填")
      return
    }
    const validExps = [
      ...validEducation.map((e) => ({ ...e, type: "education" as const })),
      ...validWork.map((e) => ({ ...e, type: "work" as const })),
    ]
    const err: Record<string, string> = {}
    const h = formatHandle(handle) || handle.trim()
    if (!h) err.handle = "請填寫個人連結名稱"
    else if (!/^[a-z0-9\-_]+$/.test(h)) err.handle = "僅能使用小寫英文、數字、- 與 _"
    else if (h.length > 30) err.handle = "最多 30 字元"
    if (!displayName.trim()) err.displayName = "請填寫顯示名稱"
    else if (displayName.length > 100) err.displayName = "顯示名稱最多 100 字"
    if (!oneLiner.trim()) err.oneLiner = "請填寫自我介紹（500 字以內）"
    else if (oneLiner.length > MAX_BIO) err.oneLiner = `自我介紹不得超過 ${MAX_BIO} 字`
    setFieldErrors(err)
    if (Object.keys(err).length > 0) return

    setLoading(true)
    try {
      const hashtagsPayload = [
        ...allInterests.map((label) => ({ label, type: "interest" as const })),
        { label: loc, type: "hashtag" as const },
      ]
      const body = {
        handle: formatHandle(handle) || handle,
        displayName: displayName.trim(),
        oneLiner: oneLiner.trim(),
        avatar: avatarUrl || undefined,
        hashtags: hashtagsPayload,
        location: loc,
        cohort: cohort.trim() || undefined,
        contactType: contactType.trim() || undefined,
        contactValue: contactValue.trim() || undefined,
        isVolunteerFriend,
        experiences: validExps.map((exp) => ({
          type: exp.type,
          title: exp.title.trim(),
          org: exp.org.trim(),
          start: exp.start.trim(),
          end: exp.end.trim() || null,
          description: exp.description.trim() || null,
          isCurrent: exp.isCurrent,
        })),
      }
      const res = await fetch("/api/profile/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        const { handle: h } = await res.json()
        router.push(`/u/${h}`)
      } else {
        const err = await res.json()
        alert(err.message || "建立失敗")
      }
    } catch (err) {
      console.error(err)
      alert("發生錯誤，請稍後再試")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Step 1: 目前位置 */}
      {step === 1 && (
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-base">目前位置</CardTitle>
            <p className="text-sm text-muted-foreground">選擇你的所在地區（之後可再編輯）</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {LOCATION_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setLocation(opt)}
                  className={`rounded-full px-5 py-2.5 text-sm font-medium transition-colors ${
                    location === opt
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
            {location === "國外" && (
              <div>
                <label className="text-sm font-medium">自訂位置（hashtag）</label>
                <Input
                  value={locationCustom}
                  onChange={(e) => setLocationCustom(e.target.value)}
                  placeholder="例如：東京、新加坡、矽谷"
                  className="mt-1 rounded-lg"
                />
              </div>
            )}
            <Button type="submit" className="w-full rounded-lg" size="lg">
              下一步：興趣關注
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2: 興趣關注（四向度分組、組內依人數排序，不顯示向度名稱） */}
      {step === 2 && (
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-base">興趣關注</CardTitle>
            <p className="text-sm text-muted-foreground">
              點選你有興趣的標籤，最多選 {MAX_INTERESTS} 個（已選 {selectedInterests.length}/{MAX_INTERESTS}）
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {interestTagGroups.map((group, groupIndex) => (
              <div key={groupIndex} className="flex flex-wrap gap-2">
                {group.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleInterest(tag)}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                      selectedInterests.includes(tag)
                        ? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2"
                        : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                    }`}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            ))}
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setStep(1)} className="rounded-lg">
                上一步
              </Button>
              <Button type="submit" className="flex-1 rounded-lg" size="lg">
                下一步：自我介紹
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: 自我介紹表單 */}
      {step === 3 && (
        <div className="space-y-6">
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="text-base">頭貼</CardTitle>
              <p className="text-sm text-muted-foreground">上傳你的大頭照（選填，也可使用登入帳號頭像）</p>
            </CardHeader>
            <CardContent className="flex items-center gap-4">
              <label className="relative flex h-24 w-24 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-border bg-muted/50 transition-colors hover:bg-muted">
                {avatarUrl ? (
                  <Image src={avatarUrl} alt="頭貼" fill className="object-cover" sizes="96px" />
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
              {uploading && <span className="text-sm text-muted-foreground">上傳中…</span>}
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="text-base">基本資料與自我介紹</CardTitle>
              <p className="text-sm text-muted-foreground">必填：個人連結名稱、顯示名稱、位置、自我介紹（500 字內）；若目前非學生則至少一筆工作經歷</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">個人連結名稱 *</label>
                <Input
                  value={handle}
                  onChange={(e) => {
                    setHandle(formatHandle(e.target.value))
                    if (fieldErrors.handle) setFieldErrors((p) => ({ ...p, handle: "" }))
                  }}
                  placeholder="例如：allen-chi、jane-wang"
                  required
                  className={`mt-1 rounded-lg ${fieldErrors.handle ? "border-destructive" : ""}`}
                />
                <p className="mt-1 text-xs text-muted-foreground">你的個人頁網址：yigonghub.app/u/{handle || "你的代稱"}</p>
                <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">僅能使用小寫英文、數字、- 與 _，最多 30 字元；第一次填寫後即無法修改</p>
                {fieldErrors.handle && <p className="mt-1 text-xs text-destructive">{fieldErrors.handle}</p>}
              </div>
              <div>
                <label className="text-sm font-medium">顯示名稱 *</label>
                <Input
                  value={displayName}
                  onChange={(e) => {
                    setDisplayName(e.target.value)
                    if (fieldErrors.displayName) setFieldErrors((p) => ({ ...p, displayName: "" }))
                  }}
                  placeholder="你的名字或暱稱"
                  required
                  className={`mt-1 rounded-lg ${fieldErrors.displayName ? "border-destructive" : ""}`}
                />
                {fieldErrors.displayName && <p className="mt-1 text-xs text-destructive">{fieldErrors.displayName}</p>}
              </div>
              <div>
                <label className="text-sm font-medium">目前位置 *</label>
                <Input value={locationDisplay} readOnly className="mt-1 rounded-lg bg-muted/50" />
                <p className="mt-1 text-xs text-muted-foreground">由第一步帶入，建立後可至個人檔案修改</p>
              </div>

              <div>
                <label className="text-sm font-medium">聯絡方式（選填）</label>
                <div className="mt-1 flex flex-wrap gap-2">
                  <select
                    value={contactType}
                    onChange={(e) => setContactType(e.target.value)}
                    className="rounded-lg border border-input bg-background px-3 py-2 text-sm min-w-[120px]"
                  >
                    {CONTACT_TYPES.map((opt) => (
                      <option key={opt.value || "none"} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <Input
                    value={contactValue}
                    onChange={(e) => setContactValue(e.target.value)}
                    placeholder={contactType ? "帳號或連結" : "請先選擇類型"}
                    disabled={!contactType}
                    className="flex-1 min-w-[140px] rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">四省中科博館義工（選填）</label>
                <p className="text-xs text-muted-foreground mt-0.5">屆數請填 1-999 的數字</p>
                <div className="mt-2 flex flex-wrap items-center gap-4">
                  <Input
                    type="number"
                    min={1}
                    max={999}
                    value={(cohort ?? "").replace(/\D/g, "") || ""}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, "")
                      const num =
                        raw === ""
                          ? ""
                          : String(Math.min(999, Math.max(1, parseInt(raw, 10) || 0)))
                      setCohort(num)
                    }}
                    placeholder="例：38"
                    className="w-32 rounded-lg"
                  />
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={isVolunteerFriend}
                      onChange={(e) => setIsVolunteerFriend(e.target.checked)}
                    />
                    我是義工之友
                  </label>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">學歷（選填，可多筆）</label>
                <p className="text-xs text-muted-foreground">學校、科系／學位、開始／結束為必填</p>
                <div className="mt-2 space-y-4">
                  {educationExperiences.map((exp, i) => (
                    <div key={`edu-${i}`} className="rounded-lg border border-border/60 bg-muted/20 p-4">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-sm font-medium">學歷 第 {i + 1} 筆</span>
                        {educationExperiences.length > 1 && (
                          <button type="button" onClick={() => removeEducation(i)} className="text-muted-foreground hover:text-foreground">
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                      <label className="mb-2 flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={exp.isCurrent}
                          onChange={(e) => updateEducation(i, "isCurrent", e.target.checked)}
                        />
                        目前在學
                      </label>
                      <Input
                        placeholder="科系／學位（例：資訊工程碩士）"
                        value={exp.title}
                        onChange={(e) => updateEducation(i, "title", e.target.value)}
                        className="mt-2 rounded-lg"
                      />
                      <Input
                        placeholder="學校名稱"
                        value={exp.org}
                        onChange={(e) => updateEducation(i, "org", e.target.value)}
                        className="mt-2 rounded-lg"
                      />
                      <div className="mt-2 flex gap-2">
                        <Input
                          placeholder="開始（例：2020）"
                          value={exp.start}
                          onChange={(e) => updateEducation(i, "start", e.target.value)}
                          className="rounded-lg"
                        />
                        <Input
                          placeholder="結束（例：2024）"
                          value={exp.end}
                          onChange={(e) => updateEducation(i, "end", e.target.value)}
                          className="rounded-lg"
                          disabled={exp.isCurrent}
                        />
                      </div>
                      <Input
                        placeholder="簡述（選填）"
                        value={exp.description}
                        onChange={(e) => updateEducation(i, "description", e.target.value)}
                        className="mt-2 rounded-lg"
                      />
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={addEducation} className="rounded-lg">
                    <Plus className="mr-1 h-4 w-4" />
                    新增一筆學歷
                  </Button>
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={isStudent}
                    onChange={(e) => setIsStudent(e.target.checked)}
                  />
                  還是學生（勾選則工作經歷為選填）
                </label>
                <p className="mt-2 text-xs text-muted-foreground">
                  {isStudent ? "工作經歷為選填，有則填寫" : "若目前非學生，至少一筆；職稱、單位、開始時間為必填"}
                </p>
                <div className="mt-2 space-y-4">
                      {workExperiences.map((exp, i) => (
                    <div key={`work-${i}`} className="rounded-lg border border-border/60 bg-muted/20 p-4">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-sm font-medium">工作經歷 第 {i + 1} 筆</span>
                        {workExperiences.length > 1 && (
                          <button type="button" onClick={() => removeWork(i)} className="text-muted-foreground hover:text-foreground">
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                      <label className="mb-2 flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={exp.isCurrent}
                          onChange={(e) => updateWork(i, "isCurrent", e.target.checked)}
                        />
                        目前任職
                      </label>
                      <Input
                        placeholder="職稱"
                        value={exp.title}
                        onChange={(e) => updateWork(i, "title", e.target.value)}
                        className="mt-2 rounded-lg"
                      />
                      <Input
                        placeholder="公司／單位名稱"
                        value={exp.org}
                        onChange={(e) => updateWork(i, "org", e.target.value)}
                        className="mt-2 rounded-lg"
                      />
                      <div className="mt-2 flex gap-2">
                        <Input
                          placeholder="開始（例：2022）"
                          value={exp.start}
                          onChange={(e) => updateWork(i, "start", e.target.value)}
                          className="rounded-lg"
                        />
                        <Input
                          placeholder="結束（例：2024）"
                          value={exp.end}
                          onChange={(e) => updateWork(i, "end", e.target.value)}
                          className="rounded-lg"
                          disabled={exp.isCurrent}
                        />
                      </div>
                      <Input
                        placeholder="簡述（選填）"
                        value={exp.description}
                        onChange={(e) => updateWork(i, "description", e.target.value)}
                        className="mt-2 rounded-lg"
                      />
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={addWork} className="rounded-lg">
                    <Plus className="mr-1 h-4 w-4" />
                    新增一筆工作經歷
                  </Button>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">興趣（由第二步帶入，可再新增）</label>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {allInterests.map((t) => (
                    <span key={t} className="rounded-full bg-secondary px-2.5 py-0.5 text-xs text-secondary-foreground">
                      #{t}
                    </span>
                  ))}
                </div>
                <Input
                  value={extraHashtags}
                  onChange={(e) => setExtraHashtags(e.target.value)}
                  placeholder="空格或逗號分隔，可再加其他 hashtag"
                  className="mt-2 rounded-lg"
                />
              </div>

              <div>
                <label className="text-sm font-medium">自我介紹 *（500 字以內）</label>
                <textarea
                  value={oneLiner}
                  onChange={(e) => {
                    setOneLiner(e.target.value.slice(0, MAX_BIO))
                    if (fieldErrors.oneLiner) setFieldErrors((p) => ({ ...p, oneLiner: "" }))
                  }}
                  placeholder="用幾句話介紹你自己、在做什麼、想認識什麼樣的人……"
                  required
                  rows={4}
                  className={`mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${fieldErrors.oneLiner ? "border-destructive" : "border-input"}`}
                />
                <p className="mt-1 text-xs text-muted-foreground">{oneLiner.length} / {MAX_BIO} {fieldErrors.oneLiner && <span className="text-destructive">{fieldErrors.oneLiner}</span>}</p>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setStep(2)} className="rounded-lg">
              上一步
            </Button>
            <Button type="submit" className="flex-1 rounded-lg" size="lg" disabled={loading}>
              {loading ? "建立中…" : "完成建立"}
            </Button>
          </div>
        </div>
      )}
    </form>
  )
}
