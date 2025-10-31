"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { signOut, useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import {
  LayoutDashboard,
  Wallet,
  TrendingUp,
  DollarSign,
  LogOut,
  User
} from "lucide-react"
import { cn } from "@/lib/utils"

const navigation = [
  { name: "Tableau de bord", href: "/dashboard", icon: LayoutDashboard },
  { name: "Comptes", href: "/dashboard/accounts", icon: Wallet },
  { name: "PnL", href: "/dashboard/pnl", icon: TrendingUp },
  { name: "Retraits", href: "/dashboard/withdrawals", icon: DollarSign },
  { name: "Profil", href: "/dashboard/profile", icon: User },
]

export function DashboardNav() {
  const pathname = usePathname()
  const router = useRouter()
  const { data: session } = useSession()

  const handleSignOut = async () => {
    await signOut({ redirect: false })
    router.push("/auth/login")
  }

  return (
    <div className="flex h-screen w-64 flex-col border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex h-16 items-center border-b border-zinc-200 px-6 dark:border-zinc-800">
        <h1 className="text-xl font-bold">Propfirm Manager</h1>
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
              {(session?.user as any)?.username || session?.user?.name || "Utilisateur"}
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
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Déconnexion
        </Button>
      </div>
    </div>
  )
}

