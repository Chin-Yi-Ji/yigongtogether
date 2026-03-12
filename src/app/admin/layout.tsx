import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { isAdmin } from "@/lib/admin"
import { SiteHeader } from "@/components/site-header"
import Link from "next/link"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session?.user?.id) redirect("/signin")
  if (!isAdmin({ email: session.user.email, role: session.user.role })) {
    redirect("/")
  }

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <nav className="border-b border-border/60 bg-muted/30">
        <div className="container mx-auto max-w-6xl px-4 py-2 flex items-center gap-4">
          <Link href="/admin" className="text-sm font-medium text-muted-foreground hover:text-foreground">
            帳號列表
          </Link>
        </div>
      </nav>
      <main className="flex-1">{children}</main>
    </div>
  )
}
