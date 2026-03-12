import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import { getGoogleCredentials } from "@/lib/google-credentials"

const googleCreds = getGoogleCredentials()

export const { handlers, auth, signIn, signOut } = NextAuth({
  // 明確指定 secret，避免 dev 時因 secret 變動造成 JWT 解密失敗
  secret: process.env.AUTH_SECRET,
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  providers: [
    Google({
      clientId: googleCreds?.clientId ?? "",
      clientSecret: googleCreds?.clientSecret ?? "",
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id
        token.email = user.email ?? null
        try {
          const [profile, dbUser] = await Promise.all([
            prisma.profile.findUnique({
              where: { userId: user.id },
              select: { handle: true },
            }),
            prisma.user.findUnique({
              where: { id: user.id },
              select: { role: true },
            }),
          ])
          token.handle = profile?.handle ?? null
          const adminEmail = (process.env.ADMIN_EMAIL ?? "allen82218@gmail.com").toLowerCase()
          const isAdminUser = dbUser?.role === "admin" || (user.email?.toLowerCase() === adminEmail)
          token.role = isAdminUser ? "admin" : (dbUser?.role ?? "user")
        } catch {
          token.handle = null
          token.role = "user"
        }
      }
      if (trigger === "update" && session?.handle !== undefined) {
        token.handle = session.handle
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!
        session.user.handle = (token.handle as string) ?? null
        session.user.email = (token.email as string) ?? null
        session.user.role = (token.role as string) ?? "user"
      }
      return session
    },
  },
  pages: {
    signIn: "/signin",
    newUser: "/onboarding",
  },
  trustHost: true,
  debug: process.env.NODE_ENV === "development",
})
