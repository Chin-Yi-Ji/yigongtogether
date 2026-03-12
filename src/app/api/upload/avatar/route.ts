import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"
import sharp from "sharp"
import { auth } from "@/auth"
import { NextResponse } from "next/server"
import { rateLimitCheck, RATE_LIMIT_PRESETS } from "@/lib/rate-limit"
import { writeFile, mkdir } from "fs/promises"
import path from "path"
import { randomUUID } from "crypto"

const MAX_SIZE = 3 * 1024 * 1024 // 3MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"]

/** 大頭照最長邊上限（px），兼顧清晰度與檔案大小 */
const AVATAR_MAX_SIZE = 512
/** WebP 品質 1–100，82 約在體積與畫質平衡 */
const WEBP_QUALITY = 82

/**
 * 將上傳圖片縮小並轉成 WebP，縮小檔案、加快讀取，且不失太多解析度。
 * 若處理失敗則回傳 null，呼叫端可改存原圖。
 */
async function processAvatarImage(
  input: Buffer,
  mimeType: string
): Promise<{ buffer: Buffer; contentType: string } | null> {
  try {
    let pipeline = sharp(input)
      .rotate()
      .resize(AVATAR_MAX_SIZE, AVATAR_MAX_SIZE, {
        fit: "inside",
        withoutEnlargement: true,
      })

    const out = await pipeline
      .webp({ quality: WEBP_QUALITY })
      .toBuffer()

    return { buffer: out, contentType: "image/webp" }
  } catch {
    return null
  }
}

/** Cloudflare R2 / AWS S3 設定：有設定則上傳到雲端，否則存本機 */
function getS3Config() {
  const bucket = process.env.S3_BUCKET
  if (!bucket || !process.env.S3_ACCESS_KEY_ID || !process.env.S3_SECRET_ACCESS_KEY)
    return null
  const region = process.env.S3_REGION || "auto"
  const endpoint = process.env.S3_ENDPOINT
  const client = new S3Client({
    region,
    ...(endpoint && { endpoint }),
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    },
  })
  return { client, bucket }
}

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ message: "請先登入" }, { status: 401 })
    }

    const { allowed, resetAt } = rateLimitCheck(
      `avatar:${session.user.id}`,
      RATE_LIMIT_PRESETS.avatarPerUser
    )
    if (!allowed) {
      return NextResponse.json(
        { message: "上傳次數過於頻繁，請稍後再試" },
        { status: 429, headers: { "Retry-After": String(Math.ceil((resetAt - Date.now()) / 1000)) } }
      )
    }

    const formData = await req.formData()
    const file = formData.get("file") as File | null
    if (!file || !file.size) {
      return NextResponse.json({ message: "請選擇圖片檔案" }, { status: 400 })
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ message: "僅支援 JPG、PNG、WebP、GIF" }, { status: 400 })
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ message: "圖片不得超過 3MB" }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const rawBuffer = Buffer.from(bytes)
    const processed = await processAvatarImage(rawBuffer, file.type)
    const { buffer, contentType } = processed ?? {
      buffer: rawBuffer,
      contentType: file.type,
    }
    const ext = processed ? "webp" : (file.name.split(".").pop()?.toLowerCase() || "jpg")
    const safeExt = ["jpg", "jpeg", "png", "webp", "gif"].includes(ext) ? ext : "jpg"
    const filename = `${randomUUID()}.${safeExt}`

    const s3 = getS3Config()
    if (s3) {
      const { client, bucket } = s3
      const key = `avatars/${filename}`
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: buffer,
          ContentType: contentType,
        })
      )
      const baseUrl = process.env.S3_PUBLIC_URL?.replace(/\/$/, "")
      const url = baseUrl ? `${baseUrl}/${key}` : `/uploads/avatars/${filename}`
      if (!baseUrl) console.warn("S3_PUBLIC_URL 未設定，大頭照 URL 可能無法正確顯示")
      return NextResponse.json({ url })
    }

    const dir = path.join(process.cwd(), "public", "uploads", "avatars")
    await mkdir(dir, { recursive: true })
    const filepath = path.join(dir, filename)
    await writeFile(filepath, buffer)
    return NextResponse.json({ url: `/uploads/avatars/${filename}` })
  } catch (err) {
    console.error("Avatar upload error:", err)
    return NextResponse.json({ message: "上傳失敗" }, { status: 500 })
  }
}
