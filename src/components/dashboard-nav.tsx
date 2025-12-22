"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { signOut, useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import {
  LayoutDashboard,
  Wallet,
  TrendingUp,
  DollarSign,
  LogOut,
  User,
  Menu,
  Calculator,
  Upload,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useState } from "react"

export const navigation = [
  { name: "Tableau de bord", href: "/dashboard", icon: LayoutDashboard },
  { name: "Comptes", href: "/dashboard/accounts", icon: Wallet },
  { name: "PnL", href: "/dashboard/pnl", icon: TrendingUp },
  { name: "Import de trades", href: "/dashboard/trades/import", icon: Upload },
  { name: "Retraits", href: "/dashboard/withdrawals", icon: DollarSign },
  { name: "Calculateurs", href: "/dashboard/calculations", icon: Calculator },
  { name: "Profil", href: "/dashboard/profile", icon: User },
]

export function DashboardNav() {
  const pathname = usePathname()
  const router = useRouter()
  const { data: session } = useSession()
  const [open, setOpen] = useState(false)

  const handleSignOut = async () => {
    await signOut({ redirect: false })
    router.push("/auth/login")
  }

  return (
    <>
      {/* Sidebar Desktop */}
      <div className="hidden lg:flex h-screen w-64 flex-col border-r border-slate-200 bg-white dark:border-[#1e293b] dark:bg-[#151b2e]">
        <div className="flex h-16 items-center border-b border-slate-200 px-6 dark:border-[#1e293b]">
          <h1 className="text-xl font-bold">Scalper Propfirm</h1>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50"
                    : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-50"
                )}
              >
                <Icon className="h-5 w-5" />
                {item.name}
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-zinc-200 p-4 dark:border-zinc-800">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
              <User className="h-4 w-4" />
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium truncate">
                {(session?.user as { username?: string })?.username ||
                  session?.user?.name ||
                  "Utilisateur"}
              </p>
              {session?.user?.name && (
                <p className="text-xs text-zinc-500 truncate">{session.user.name}</p>
              )}
            </div>
          </div>
          <Button variant="outline" size="sm" className="w-full" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Déconnexion
          </Button>
        </div>
      </div>

      {/* Mobile Header + Menu Burger */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between h-16 min-h-[calc(4rem+env(safe-area-inset-top))] px-4 pt-[env(safe-area-inset-top)] border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <h1 className="text-lg font-bold">Scalper Propfirm</h1>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <SheetHeader className="border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
              <SheetTitle>Menu</SheetTitle>
            </SheetHeader>
            <nav className="flex-1 space-y-1 px-3 py-4">
              {navigation.map((item) => {
                const isActive = pathname === item.href
                const Icon = item.icon
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50"
                        : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-50"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    {item.name}
                  </Link>
                )
              })}
            </nav>
            <div className="border-t border-zinc-200 p-4 dark:border-zinc-800">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
                  <User className="h-4 w-4" />
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="text-sm font-medium truncate">
                    {(session?.user as { username?: string })?.username ||
                      session?.user?.name ||
                      "Utilisateur"}
                  </p>
                  {session?.user?.name && (
                    <p className="text-xs text-zinc-500 truncate">{session.user.name}</p>
                  )}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => {
                  setOpen(false)
                  handleSignOut()
                }}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Déconnexion
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  )
}
