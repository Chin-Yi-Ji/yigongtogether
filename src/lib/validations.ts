import { z } from "zod"

const handleSchema = z
  .string()
  .min(1, "個人連結名稱不可為空")
  .max(30, "個人連結名稱最多 30 字元")
  .regex(/^[a-z0-9\-_]+$/, "僅能使用小寫英文、數字、- 與 _")

const tagItemSchema = z.union([
  z.string(),
  z.object({ label: z.string(), type: z.enum(["interest", "expertise", "topic", "hashtag"]).optional() }),
])

export const experienceSchema = z.object({
  type: z.enum(["work", "education"]).optional().default("work"),
  title: z.string().min(1, "職稱不可為空").max(200),
  org: z.string().min(1, "單位不可為空").max(200),
  start: z.string().min(1, "開始時間不可為空").max(50),
  end: z.string().max(50).optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  isCurrent: z.boolean().optional().default(false),
})

export const profileCreateSchema = z.object({
  handle: handleSchema,
  displayName: z.string().min(1, "顯示名稱不可為空").max(100, "顯示名稱最多 100 字元"),
  oneLiner: z.string().min(1, "自我介紹不可為空").max(500, "自我介紹最多 500 字元"),
  avatar: z
    .union([z.string().url(), z.string().min(1).startsWith("/"), z.literal("")])
    .optional()
    .nullable(),
  hashtags: z.array(tagItemSchema).optional().default([]),
  location: z.string().max(100).optional().nullable(),
  cohort: z
    .string()
    .max(50)
    .optional()
    .nullable()
    .refine(
      (val) => {
        if (!val || !val.trim()) return true
        const m = val.trim().match(/(\d+)/)
        const n = m ? parseInt(m[1], 10) : NaN
        return !Number.isNaN(n) && n >= 1 && n <= 999
      },
      { message: "屆數請填 1-999 的數字" }
    ),
  contactType: z.string().max(30).optional().nullable(),
  contactValue: z.string().max(200).optional().nullable(),
  isVolunteerFriend: z.boolean().optional(),
  nowLearning: z.string().max(500).optional().nullable(),
  nowBuilding: z.string().max(500).optional().nullable(),
  futureLooking: z.string().max(2000).optional().nullable(),
  experiences: z.array(experienceSchema).optional().default([]),
})

const contactEntrySchema = z.object({
  type: z.string().max(30),
  value: z.string().max(200),
})

export const profileUpdateSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  tagline: z.string().max(30).optional().nullable(),
  oneLiner: z.string().max(500).optional().nullable(),
  avatar: z.string().url().optional().nullable(),
  hashtags: z.array(tagItemSchema).optional(),
  location: z.string().max(100).optional().nullable(),
  cohort: z
    .string()
    .max(50)
    .optional()
    .nullable()
    .refine(
      (val) => {
        if (!val || !val.trim()) return true
        const m = val.trim().match(/(\d+)/)
        const n = m ? parseInt(m[1], 10) : NaN
        return !Number.isNaN(n) && n >= 1 && n <= 999
      },
      { message: "屆數請填 1-999 的數字" }
    ),
  contacts: z.array(contactEntrySchema).optional(),
  isVolunteerFriend: z.boolean().optional(),
  nowLearning: z.string().max(500).optional().nullable(),
  nowBuilding: z.string().max(500).optional().nullable(),
  futureLooking: z.string().max(2000).optional().nullable(),
  privacyConfig: z.record(z.string(), z.enum(["public", "registered", "private"])).optional(),
})

export const experienceUpdateSchema = z.object({
  type: z.enum(["work", "education"]).optional(),
  title: z.string().min(1).max(200).optional(),
  org: z.string().min(1).max(200).optional(),
  start: z.string().min(1).max(50).optional(),
  end: z.string().max(50).optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  isCurrent: z.boolean().optional(),
})

export type ProfileCreateInput = z.infer<typeof profileCreateSchema>
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>
export type ExperienceInput = z.infer<typeof experienceSchema>
