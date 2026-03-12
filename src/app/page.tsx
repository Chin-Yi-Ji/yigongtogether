import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import Link from "next/link"
import { SiteHeader } from "@/components/site-header"
import { Mail, LogIn } from "lucide-react"

export default async function Home() {
  const session = await auth()

  if (session?.user) {
    redirect("/explore")
  }

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />

      <main className="flex-1 flex flex-col">
        {/* 網站介紹 */}
        <section className="border-b border-border/80 bg-muted/30">
          <div className="container mx-auto max-w-3xl px-4 py-16 md:py-24">
            <div className="mx-auto max-w-2xl text-center">
              <h1 className="font-serif text-4xl font-normal tracking-tight text-foreground md:text-5xl">
                YigongHub
              </h1>
              <p className="mt-4 text-lg font-medium text-muted-foreground">
                這是一個連結義工節點的平台
              </p>
              <div className="mt-8 space-y-4 text-center text-muted-foreground leading-relaxed">
                <p>
                這個平台，是為了讓夥伴們能互相認識、建立連結。
                </p>
                <p>
                透過分享經歷與愛好，找到志同道合的夥伴或拓展人際網路。
                </p>
                <p>
                分享、連結、共好。
                </p>
                <p>
                不同世代義工的能量在此匯聚交流，成就更強大的彼此。
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 登入 / 建立帳號 */}
        <section className="container mx-auto max-w-3xl px-4 py-12 md:py-16">
          <div className="mx-auto max-w-sm">
            <h2 className="text-center text-xl font-semibold tracking-tight">
              登入或建立帳號
            </h2>
            <p className="mt-2 text-center text-sm text-muted-foreground">
              使用 Google 帳號即可開始，首次使用將自動為你建立帳號
            </p>
            <Card className="mt-8 border-border/60">
              <CardContent className="flex flex-col gap-3 pt-8 pb-8">
                <Link href="/signin" className="block">
                  <Button
                    size="lg"
                    className="w-full rounded-lg text-base"
                    variant="default"
                  >
                    <LogIn className="mr-2 h-5 w-5" />
                    用 Google 登入
                  </Button>
                </Link>
                <p className="text-center text-xs text-muted-foreground">
                  還沒有帳號？點擊上方按鈕即會為你建立新帳號
                </p>
                <div className="mt-4 flex flex-col gap-2 border-t border-border/80 pt-6">
                  <Link href="/explore">
                    <Button variant="ghost" size="sm" className="w-full text-muted-foreground">
                      先瀏覽探索，稍後再登入
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* 聯絡開發者 */}
        <section className="mt-auto border-t border-border/80 bg-muted/20">
          <div className="container mx-auto max-w-3xl px-4 py-10 md:py-12">
            <div className="flex flex-col items-center gap-4 text-center">
              <h2 className="flex items-center gap-2 text-sm font-medium uppercase tracking-wider text-muted-foreground">
                <Mail className="h-4 w-4" />
                聯絡開發者
              </h2>
              <p className="max-w-md text-sm text-muted-foreground leading-relaxed">
                如有問題、建議或合作想法，歡迎與我們聯絡
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4">
                <a
                  href="mailto:allen82218@gmail.com"
                  className="inline-flex items-center gap-2 rounded-lg border border-border/80 bg-card px-4 py-2.5 text-sm font-medium transition-colors hover:bg-muted"
                >
                  <Mail className="h-4 w-4" />
                  allen82218@gmail.com
                </a>
                <span className="text-muted-foreground">·</span>
                <span className="text-sm text-muted-foreground">
                </span>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
