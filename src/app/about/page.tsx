import type { Metadata } from "next"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { SiteHeader } from "@/components/site-header"
import Link from "next/link"

export const metadata: Metadata = {
  title: "關於 YigongHub",
  description: "YigongHub 是一個連結義工節點的平台，讓夥伴們互相認識、建立連結。",
}

export default async function AboutPage() {
  const session = await auth()
  if (!session?.user?.id) {
    redirect(`/signin?callbackUrl=${encodeURIComponent("/about")}`)
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader />

      <main className="flex-1">
        <article className="container mx-auto max-w-2xl px-6 py-16 md:py-24">
          <header className="text-center">
            <h1 className="font-serif text-4xl font-normal tracking-tight text-foreground md:text-5xl">
              YigongHub
            </h1>
            <p className="mt-4 font-serif text-lg text-muted-foreground md:text-xl">
              這是一個連結義工節點的平台
            </p>
            <div className="mx-auto mt-10 w-12 border-t border-border/80" aria-hidden />
          </header>

          <div className="mt-14 space-y-8 text-center text-muted-foreground leading-relaxed">
            <p className="text-[1.05rem]">
              這個平台，是為了讓夥伴們能互相認識、建立連結。
            </p>
            <p className="text-[1.05rem]">
              透過分享經歷與愛好，找到志同道合的夥伴或拓展人際網路。
            </p>
            <p className="font-serif text-foreground/90 text-lg italic">
              分享、連結、共好。
            </p>
            <p className="text-[1.05rem]">
              不同世代義工的能量在此匯聚交流，成就更強大的彼此。
            </p>
          </div>

          <footer className="mt-20 pt-10 text-center text-muted-foreground">
            <p className="text-xs">
              開發者：紀欽益（21 屆）。有想法或建議歡迎找他修改，
              <Link
                href="mailto:allen82218@gmail.com"
                className="text-foreground/80 underline underline-offset-2 hover:text-foreground"
              >
                allen82218@gmail.com
              </Link>
            </p>
          </footer>
        </article>
      </main>
    </div>
  )
}
