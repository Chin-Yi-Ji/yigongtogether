/** 目前位置選項（第一步） */
export const LOCATION_OPTIONS = ["北部", "中部", "南部", "東部", "國外"] as const

/** 聯絡方式選項（選填） */
export const CONTACT_TYPES = [
  { value: "", label: "不填寫" },
  { value: "Line", label: "Line" },
  { value: "Email", label: "Email" },
  { value: "Facebook", label: "Facebook" },
  { value: "Instagram", label: "Instagram" },
  { value: "LinkedIn", label: "LinkedIn" },
  { value: "個人網站", label: "個人網站" },
  { value: "手機", label: "手機" },
] as const

/** 興趣標籤四向度（不對使用者顯示名稱）：動態興趣、靜態興趣、專業能力、其他 */
export const CATEGORY_ORDER = ["動態興趣", "靜態興趣", "專業能力", "其他"] as const
export type TagCategory = (typeof CATEGORY_ORDER)[number]

/** 每個預設標籤所屬向度 */
export const TAG_CATEGORY: Record<string, TagCategory> = {
  // 動態興趣
  自由潛水: "動態興趣",
  旅行: "動態興趣",
  運動: "動態興趣",
  音樂: "動態興趣",
  攝影: "動態興趣",
  社群經營: "動態興趣",
  內容創作: "動態興趣",
  // 靜態興趣
  閱讀: "靜態興趣",
  寫作: "靜態興趣",
  設計: "靜態興趣",
  開源: "靜態興趣",
  公益: "靜態興趣",
  環保: "靜態興趣",
  永續: "靜態興趣",
  // 專業能力
  前端: "專業能力",
  後端: "專業能力",
  數據: "專業能力",
  UX: "專業能力",
  行銷: "專業能力",
  產品: "專業能力",
  AI: "專業能力",
  科技: "專業能力",
  遠端工作: "專業能力",
  創業: "專業能力",
  新創: "專業能力",
  投資: "專業能力",
  理財: "專業能力",
  教育: "專業能力",
  // 其他
  社會創新: "其他",
}

/** 興趣關注候選（依 TAG_CATEGORY 取得，供 fallback 或靜態情境使用） */
export const INTEREST_TAGS = Object.keys(TAG_CATEGORY) as unknown as readonly string[]
