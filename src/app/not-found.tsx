import Link from "next/link"
import { Button } from "@/components/ui/button"
import { SiteHeader } from "@/components/site-header"

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-20">
        <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          404
        </p>
        <h1 className="mt-4 font-serif text-2xl font-normal tracking-tight md:text-3xl">
          找不到頁面
        </h1>
        <p className="mt-2 text-center text-muted-foreground">
          此連結可能已失效或頁面已移除。
        </p>
        <Link href="/" className="mt-8">
          <Button>返回首頁</Button>
        </Link>
      </main>
    </div>
  )
}
