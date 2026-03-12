import Link from "next/link"
import { redirect } from "next/navigation"
import { SiteHeader } from "@/components/site-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { signIn } from "@/auth"
import { AuthError } from "next-auth"

const ERROR_MESSAGES: Record<string, string> = {
  Configuration: "伺服器尚未設定 Google 登入（請檢查 .env 的 AUTH_GOOGLE_ID、AUTH_GOOGLE_SECRET）",
  AccessDenied: "登入被拒絕",
  Verification: "驗證失敗，請重試",
  Default: "登入時發生錯誤，請稍後再試",
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>
}) {
  const { callbackUrl, error } = await searchParams
  const redirectTo = callbackUrl ?? "/"

  async function signInWithGoogle(formData: FormData) {
    "use server"
    try {
      await signIn("google", { redirectTo })
    } catch (err) {
      if (err instanceof AuthError) {
        redirect(`/signin?error=${err.type}&callbackUrl=${encodeURIComponent(redirectTo)}`)
      }
      throw err
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <div className="container mx-auto max-w-md flex-1 flex flex-col items-center justify-center px-4 py-12">
        <Card className="w-full border-border/60">
          <CardHeader>
            <CardTitle className="text-xl">登入 YigongHub</CardTitle>
            <CardDescription>使用 Google 帳號登入，建立你的個人頁</CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
                {ERROR_MESSAGES[error] ?? ERROR_MESSAGES.Default}
              </div>
            )}
            <form action={signInWithGoogle} className="block">
              <button
                type="submit"
                className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-primary px-8 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                使用 Google 登入
              </button>
            </form>
            <p className="mt-4 text-center text-xs text-muted-foreground">
              點擊後會跳轉至 Google 登入頁面，完成後回到本站
            </p>
          </CardContent>
        </Card>
        <Link href="/" className="mt-6 text-sm text-muted-foreground hover:text-foreground">
          返回首頁
        </Link>
      </div>
    </div>
  )
}
