"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  Edit,
  Trash2,
  Wallet,
  Target,
  ShieldCheck,
  ArrowUpRight,
  Activity,
  TrendingUp,
  TrendingDown,
} from "lucide-react"

interface PropfirmAccount {
  id: string
  name: string
  propfirm: string
  size: number
  accountType: string
  status: string
  pricePaid: number
  notes?: string | null
  createdAt: string
  pnlEntries?: Array<{
    id?: string
    date?: string
    amount: number
    notes?: string | null
  }>
  linkedEval?: { pricePaid: number }
}

interface AccountCardProps {
  account: PropfirmAccount
  onEdit: (account: PropfirmAccount) => void
  onDelete: (id: string) => void
  propfirmLabels: Record<string, string>
  accountTypeLabels: Record<string, string>
  statusLabels: Record<string, string>
  statusColors: Record<string, string>
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "USD",
  }).format(amount)
}

const formatCurrencyCompact = (amount: number) => {
  if (amount >= 1000) {
    return `${(amount / 1000).toFixed(amount >= 10000 ? 0 : 1)}k $US`
  }
  return formatCurrency(amount)
}

export function AccountCard({
  account,
  onEdit,
  onDelete,
  propfirmLabels,
  accountTypeLabels,
  statusLabels,
  statusColors,
}: AccountCardProps) {
  const router = useRouter()

  // Obtenir le dernier PnL entré sur ce compte
  let lastPnlEntry = null
  let lastPnlAmount = 0

  try {
    if (account.pnlEntries && Array.isArray(account.pnlEntries) && account.pnlEntries.length > 0) {
      const validEntries = account.pnlEntries.filter(
        (entry) => entry && typeof entry === "object" && typeof entry.amount === "number"
      )

      if (validEntries.length > 0) {
        lastPnlEntry = [...validEntries].sort((a, b) => {
          try {
            const dateA = a.date ? new Date(a.date).getTime() : 0
            const dateB = b.date ? new Date(b.date).getTime() : 0
            if (dateA === 0 && dateB === 0) return 0
            if (dateA === 0) return 1
            if (dateB === 0) return -1
            return dateB - dateA
          } catch {
            return 0
          }
        })[0]
        lastPnlAmount = lastPnlEntry?.amount ?? 0
      }
    }
  } catch {
    // En cas d'erreur, on continue sans afficher le dernier PnL
  }

  return (
    <Card className="border-none bg-transparent shadow-none group overflow-hidden rounded-2xl h-full flex flex-col">
      <CardContent className="p-0 h-full flex flex-col">
        <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-[#1e293b] bg-white dark:bg-[#151b2e] shadow-sm hover:shadow-md transition-all duration-200 w-full h-full flex flex-col">
          {/* Header */}
          <div className="flex flex-col gap-2 sm:gap-3 border-b border-slate-200 dark:border-[#1e293b] bg-slate-50 dark:bg-[#1e293b]/50 p-3 sm:p-4 rounded-t-2xl">
            <div className="flex items-start justify-between gap-2 min-w-0 w-full">
              <div className="min-w-0 flex-1 space-y-1.5 sm:space-y-2 overflow-hidden">
                <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 w-full">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <h3 className="text-sm sm:text-base md:text-lg font-bold text-slate-900 dark:text-slate-100 truncate min-w-0 flex-1 cursor-help">
                          {account.name}
                        </h3>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{account.name}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <span
                    className={`inline-flex items-center rounded-full px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs font-bold shrink-0 transition-colors ${statusColors[account.status]}`}
                  >
                    {statusLabels[account.status]}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 min-w-0">
                  <span className="inline-flex items-center gap-1 rounded-full bg-white dark:bg-[#1e293b] px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs font-semibold text-slate-700 dark:text-slate-200 shrink-0 border border-slate-200 dark:border-[#334155]">
                    {account.accountType === "EVAL" ? (
                      <Target className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
                    ) : (
                      <ShieldCheck className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
                    )}
                    <span className="truncate max-w-[100px] xs:max-w-[140px] sm:max-w-none">
                      {propfirmLabels[account.propfirm] ?? account.propfirm}
                    </span>
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1 sm:gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 sm:h-10 sm:w-10 text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-slate-100 dark:hover:bg-[#1e293b]"
                  onClick={(e) => {
                    e.stopPropagation()
                    onEdit({
                      ...account,
                      notes: account.notes ?? undefined,
                    } as PropfirmAccount)
                  }}
                  aria-label="Modifier"
                  title="Modifier"
                >
                  <Edit className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 sm:h-10 sm:w-10 text-slate-600 hover:text-red-600 hover:bg-red-50 dark:text-slate-300 dark:hover:text-red-400 dark:hover:bg-red-900/30"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete(account.id)
                  }}
                  aria-label="Supprimer"
                  title="Supprimer"
                >
                  <Trash2 className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
              </div>
            </div>

            {/* Footer avec taille et PnL */}
            <div className="flex items-center justify-between gap-2 sm:gap-3 pt-2 border-t border-slate-200 dark:border-[#1e293b] min-w-0 w-full">
              <div className="flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm text-slate-700 dark:text-slate-200 min-w-0 flex-1">
                <Wallet className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                <span className="font-semibold truncate">
                  {formatCurrencyCompact(account.size)}
                </span>
              </div>
              {lastPnlEntry ? (
                <div
                  className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg font-bold text-xs sm:text-sm shrink-0 transition-colors ${
                    lastPnlAmount >= 0
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-600/20 dark:text-emerald-300"
                      : "bg-rose-100 text-rose-700 dark:bg-rose-600/20 dark:text-rose-300"
                  }`}
                >
                  {lastPnlAmount >= 0 ? (
                    <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                  ) : (
                    <TrendingDown className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                  )}
                  <span className="whitespace-nowrap">
                    {lastPnlAmount >= 0 ? "+" : ""}
                    {formatCurrencyCompact(lastPnlAmount)}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg font-bold text-xs sm:text-sm shrink-0 bg-slate-100 text-slate-600 dark:bg-[#1e293b] dark:text-slate-300">
                  <Activity className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                  <span className="whitespace-nowrap">—</span>
                </div>
              )}
            </div>
          </div>

          {/* Body avec détails */}
          <div className="p-3 sm:p-4 space-y-2 sm:space-y-3 bg-white dark:bg-[#151b2e] rounded-b-2xl flex-1 flex flex-col">
            <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
              <div className="rounded-lg border border-slate-200 dark:border-[#1e293b] bg-slate-50 dark:bg-[#1e293b]/50 p-2 sm:p-3 transition-colors hover:bg-slate-100 dark:hover:bg-[#1e293b]">
                <div className="flex items-center gap-1 sm:gap-1.5 mb-1 sm:mb-1.5">
                  {account.accountType === "EVAL" ? (
                    <Target className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-blue-500 shrink-0" />
                  ) : (
                    <ShieldCheck className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-emerald-500 shrink-0" />
                  )}
                  <p className="text-[10px] sm:text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide truncate">
                    Type
                  </p>
                </div>
                <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 wrap-break-word">
                  {accountTypeLabels[account.accountType]}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 dark:border-[#1e293b] bg-slate-50 dark:bg-[#1e293b]/50 p-2 sm:p-3 transition-colors hover:bg-slate-100 dark:hover:bg-[#1e293b]">
                <div className="flex items-center gap-1 sm:gap-1.5 mb-1 sm:mb-1.5">
                  <Target className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-amber-500 shrink-0" />
                  <p className="text-[10px] sm:text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide truncate">
                    Prix payé
                  </p>
                </div>
                <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 text-right wrap-break-word">
                  {formatCurrencyCompact(account.pricePaid)}
                </p>
              </div>
            </div>

            {account.notes && (
              <div className="rounded-lg border border-slate-200 dark:border-[#1e293b] bg-slate-50 dark:bg-[#1e293b]/50 p-2 sm:p-3">
                <p className="text-[10px] sm:text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1 sm:mb-1.5 uppercase tracking-wide">
                  Notes
                </p>
                <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap line-clamp-2 wrap-break-word">
                  {account.notes}
                </p>
              </div>
            )}

            <Button
              variant="default"
              size="sm"
              className="w-full h-10 text-sm font-semibold group/btn mt-auto"
              onClick={(e) => {
                e.stopPropagation()
                router.push(`/dashboard/accounts/${account.id}`)
              }}
            >
              <ArrowUpRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-1.5 transition-transform group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5" />
              Voir détails
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
