import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

// 若無 DATABASE_URL 仍建立 client，實際查詢時會失敗並由各頁面 catch
const connectionString =
  process.env.DATABASE_URL || "postgresql://localhost:5432/placeholder?schema=public";

// Google Cloud SQL 等雲端 PostgreSQL 常需 SSL，且預設伺服器憑證可能需關閉嚴格驗證
const useSSL =
  connectionString.includes("sslmode=require") ||
  connectionString.includes("cloudsql") ||
  process.env.DATABASE_SSL === "true";

const adapter = new PrismaPg({
  connectionString,
  ...(useSSL && {
    ssl: { rejectUnauthorized: false },
  }),
});

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["query"] : undefined,
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
