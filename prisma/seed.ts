import "dotenv/config"
import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  throw new Error("DATABASE_URL 未設定，請在 .env 中設定資料庫連線")
}

const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

const FAKE_HANDLES = ["allen-chi", "jane-wang", "david-lee"]

const COHORT_UPDATE_DISPLAY_NAME = "郭旻軒（銀行員小k）"
const COHORT_UPDATE_VALUE = "27"

async function main() {
  const fakeProfiles = await prisma.profile.findMany({
    where: { handle: { in: FAKE_HANDLES } },
    select: { id: true, userId: true },
  })
  if (fakeProfiles.length > 0) {
    const profileIds = fakeProfiles.map((p) => p.id)
    const userIds = fakeProfiles.map((p) => p.userId)
    await prisma.profileTag.deleteMany({ where: { profileId: { in: profileIds } } })
    await prisma.experience.deleteMany({ where: { profileId: { in: profileIds } } })
    await prisma.profile.deleteMany({ where: { id: { in: profileIds } } })
    await prisma.session.deleteMany({ where: { userId: { in: userIds } } })
    await prisma.account.deleteMany({ where: { userId: { in: userIds } } })
    await prisma.user.deleteMany({ where: { id: { in: userIds } } })
    console.log(`Seed：已清除 ${fakeProfiles.length} 筆假資料（${FAKE_HANDLES.join(", ")}）。`)
  } else {
    console.log("Seed：無假資料需清除，連線正常。")
  }

  const cohortProfile = await prisma.profile.findFirst({
    where: { displayName: COHORT_UPDATE_DISPLAY_NAME },
    select: { id: true, cohort: true },
  })
  if (cohortProfile && cohortProfile.cohort !== COHORT_UPDATE_VALUE) {
    await prisma.profile.update({
      where: { id: cohortProfile.id },
      data: { cohort: COHORT_UPDATE_VALUE },
    })
    console.log(`Seed：已將「${COHORT_UPDATE_DISPLAY_NAME}」的屆數更新為 ${COHORT_UPDATE_VALUE}。`)
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
