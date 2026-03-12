import Link from "next/link"
import { auth } from "@/auth"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"

export async function SiteHeader() {
  const session = await auth()

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/80 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="text-xl">YigongHub</span>
        </Link>
        <nav className="flex items-center gap-2">
          <ThemeToggle />
          {session?.user && (
            <Link href="/about">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                關於
              </Button>
            </Link>
          )}
          <Link href="/explore">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
              探索
            </Button>
          </Link>
          {session?.user ? (
            <>
              <Link href="/settings">
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                  個人檔案
                </Button>
              </Link>
              {session.user.role === "admin" && (
                <Link href="/admin">
                  <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                    管理後台
                  </Button>
                </Link>
              )}
              <Link href="/api/auth/signout">
                <Button variant="outline" size="sm">
                  登出
                </Button>
              </Link>
            </>
          ) : (
            <Link href="/signin">
              <Button size="sm">
                登入
              </Button>
            </Link>
          )}
        </nav>
      </div>
    </header>
  )
}
