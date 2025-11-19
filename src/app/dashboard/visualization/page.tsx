"use client"

import { useEffect, useState, useMemo, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
} from "recharts"

type CustomTooltipProps = {
  active?: boolean
  payload?: Array<{
    name?: string
    value?: number | string
    color?: string
  }>
  label?: string
}
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Wallet,
  Target,
  Activity,
  RefreshCw,
  Calendar,
  Filter,
  BarChart2,
  User,
  Layers,
} from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { format } from "date-fns"
import { fr } from "date-fns/locale"

// ⚡ LAZY LOADING: Charger les composants graphiques uniquement côté client

const PROPFIRM_LABELS: Record<string, string> = {
  TOPSTEP: "TopStep",
  TAKEPROFITTRADER: "Take Profit Trader",
  APEX: "Apex",
  BULENOX: "Bulenox",
  PHIDIAS: "Phidias",
  OTHER: "Autre",
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "#10b981", // emerald-500
  VALIDATED: "#3b82f6", // blue-500
  FAILED: "#ef4444", // red-500
  ARCHIVED: "#6b7280", // gray-500
}

interface Account {
  id: string
  name: string
  propfirm: string
  accountType: string
  size: number
  status: string
  createdAt?: string
  pnlEntries: Array<{ date: string; amount: number }>
  withdrawals: Array<{ date: string; amount: number }>
}

interface VisualizationData {
  accounts: Account[]
  totalPnl: number
  totalWithdrawals: number
  totalNetWithdrawals: number
  totalCapitalUnderManagement: number
}

// ⚡ PERFORMANCE: Composant de tooltip personnalisé memoizé optimisé pour mobile
const CustomTooltip = (props: CustomTooltipProps) => {
  const { active, payload, label } = props
  if (!active || !payload || !payload.length) return null

  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-2 sm:p-3 shadow-lg max-w-[200px] sm:max-w-none">
      <p className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-50 mb-1 sm:mb-2">
        {label}
      </p>
      {payload.map((entry, index) => (
        <p key={index} className="text-[10px] sm:text-xs" style={{ color: entry.color }}>
          {entry.name}: {typeof entry.value === "number" ? entry.value.toFixed(2) : entry.value} $
        </p>
      ))}
    </div>
  )
}

// ⚡ MOBILE: Configuration responsive pour les axes X
const getXAxisProps = (angle: number = -45) => ({
  className: "text-[10px] sm:text-xs",
  tick: { fill: "currentColor", fontSize: 10 } as const,
  angle,
  textAnchor: "end" as const,
  height: 60,
  interval: "preserveStartEnd" as const,
})

// ⚡ MOBILE: Configuration responsive pour les axes Y
const getYAxisProps = (formatter?: (value: number) => string) => ({
  className: "text-[10px] sm:text-xs",
  tick: { fill: "currentColor", fontSize: 10 } as const,
  width: 50,
  tickFormatter: formatter,
})

// ⚡ MOBILE: Configuration responsive pour les légendes
const legendProps = {
  wrapperStyle: { fontSize: "10px" } as const,
  iconSize: 12,
}

export default function VisualizationPage() {
  const [data, setData] = useState<VisualizationData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [dateRange, setDateRange] = useState<"7days" | "30days" | "90days" | "all">("30days")
  const [propfirmFilter, setPropfirmFilter] = useState<string>("all")
  const [viewMode, setViewMode] = useState<"propfirm" | "account">("propfirm")
  const [selectedAccountId, setSelectedAccountId] = useState<string>("")
  const [isMobile, setIsMobile] = useState(false)

  // Détecter si on est sur mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640)
    }
    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  // ⚡ MEMOIZATION: Fonction de fetch memoizée
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true)
      const [accountsRes, pnlRes, withdrawalsRes] = await Promise.all([
        fetch("/api/accounts", { cache: "no-store" }),
        fetch("/api/pnl", { cache: "no-store" }),
        fetch("/api/withdrawals", { cache: "no-store" }),
      ])

      if (accountsRes.ok && pnlRes.ok && withdrawalsRes.ok) {
        const accountsData = await accountsRes.json()
        const pnlData = await pnlRes.json()
        const withdrawalsData = await withdrawalsRes.json()

        // Enrichir les comptes avec leurs PnL et retraits
        const enrichedAccounts = accountsData.map((account: Account) => ({
          ...account,
          pnlEntries: pnlData.filter((pnl: { accountId: string }) => pnl.accountId === account.id),
          withdrawals: withdrawalsData.filter(
            (w: { accountId: string }) => w.accountId === account.id
          ),
        }))

        const totalPnl = pnlData.reduce(
          (sum: number, entry: { amount: number }) => sum + entry.amount,
          0
        )
        const totalWithdrawals = withdrawalsData.reduce(
          (sum: number, w: { amount: number }) => sum + w.amount,
          0
        )
        const totalNetWithdrawals = withdrawalsData.reduce(
          (sum: number, w: { accountId: string; amount: number }) => {
            const account = enrichedAccounts.find((a: Account) => a.id === w.accountId)
            if (!account) return sum
            const netAmount = w.amount * (account.propfirm === "TAKEPROFITTRADER" ? 0.8 : 1)
            return sum + netAmount
          },
          0
        )

        const totalCapitalUnderManagement = enrichedAccounts
          .filter((a: Account) => a.status === "ACTIVE")
          .reduce((sum: number, acc: Account) => sum + acc.size, 0)

        setData({
          accounts: enrichedAccounts,
          totalPnl,
          totalWithdrawals,
          totalNetWithdrawals,
          totalCapitalUnderManagement,
        })
      }
    } catch (error) {
      console.error("Error:", error)
      toast({
        title: "Erreur",
        description: "Impossible de charger les données",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // ⚡ MEMOIZATION: Comptes éligibles filtrés par propfirm uniquement
  const filteredAccounts = useMemo(() => {
    if (!data) return []
    if (propfirmFilter === "all") return data.accounts
    return data.accounts.filter((acc) => acc.propfirm === propfirmFilter)
  }, [data, propfirmFilter])

  // ⚡ MEMOIZATION: Calculer les données pour le graphique 1 - Évolution PnL
  const pnlEvolutionData = useMemo(() => {
    if (!data || filteredAccounts.length === 0) return []

    const now = new Date()
    const daysAgo =
      dateRange === "7days" ? 7 : dateRange === "30days" ? 30 : dateRange === "90days" ? 90 : 365
    const startDate = new Date(now)
    startDate.setDate(startDate.getDate() - daysAgo)

    const dailyPnl: Record<string, number> = {}
    let cumulativePnl = 0

    filteredAccounts.forEach((account) => {
      account.pnlEntries
        .filter((entry) => new Date(entry.date) >= startDate)
        .forEach((entry) => {
          const dateKey = format(new Date(entry.date), "yyyy-MM-dd")
          dailyPnl[dateKey] = (dailyPnl[dateKey] || 0) + entry.amount
        })
    })

    const sortedDates = Object.keys(dailyPnl).sort()
    return sortedDates.map((date) => {
      cumulativePnl += dailyPnl[date]
      return {
        date: format(new Date(date), "d MMM", { locale: fr }),
        pnl: dailyPnl[date],
        cumulative: cumulativePnl,
      }
    })
  }, [data, dateRange, filteredAccounts])

  // ⚡ MEMOIZATION: Calculer les données pour le graphique 2 - Répartition par propfirm
  const propfirmDistributionData = useMemo(() => {
    if (!data || filteredAccounts.length === 0) return []

    const distribution: Record<string, number> = {}
    filteredAccounts.forEach((account) => {
      const propfirm = account.propfirm || "OTHER"
      distribution[propfirm] = (distribution[propfirm] || 0) + 1
    })

    return Object.entries(distribution).map(([propfirm, count]) => ({
      name: PROPFIRM_LABELS[propfirm] || propfirm,
      value: count,
    }))
  }, [data, filteredAccounts])

  // ⚡ MEMOIZATION: Calculer les données pour le graphique 3 - Évolution capital
  const capitalEvolutionData = useMemo(() => {
    if (!data || filteredAccounts.length === 0) return []

    const now = new Date()
    const daysAgo =
      dateRange === "7days" ? 7 : dateRange === "30days" ? 30 : dateRange === "90days" ? 90 : 365
    const startDate = new Date(now)
    startDate.setDate(startDate.getDate() - daysAgo)

    const monthlyCapital: Record<string, number> = {}

    filteredAccounts
      .filter((acc) => acc.status === "ACTIVE")
      .forEach((account) => {
        // Utiliser la date de création si disponible, sinon utiliser la date de début de la période
        const accountCreated = account.createdAt ? new Date(account.createdAt) : startDate
        const monthKey = format(accountCreated >= startDate ? accountCreated : startDate, "yyyy-MM")
        monthlyCapital[monthKey] = (monthlyCapital[monthKey] || 0) + account.size
      })

    const sortedMonths = Object.keys(monthlyCapital).sort()
    let cumulativeCapital = 0
    return sortedMonths.map((month) => {
      cumulativeCapital += monthlyCapital[month]
      return {
        month: format(new Date(month + "-01"), "MMM yyyy", { locale: fr }),
        capital: cumulativeCapital,
      }
    })
  }, [data, dateRange, filteredAccounts])

  // ⚡ MEMOIZATION: Calculer les données pour le graphique 4 - Top comptes par PnL
  const topAccountsByPnlData = useMemo(() => {
    if (!data || filteredAccounts.length === 0) return []

    const accountsWithPnl = filteredAccounts.map((account) => {
      const totalPnl = account.pnlEntries.reduce((sum, entry) => sum + entry.amount, 0)
      return {
        name: account.name.length > 15 ? `${account.name.substring(0, 15)}...` : account.name,
        pnl: totalPnl,
        propfirm: PROPFIRM_LABELS[account.propfirm] || account.propfirm,
      }
    })

    return accountsWithPnl
      .sort((a, b) => b.pnl - a.pnl)
      .slice(0, 10)
      .reverse() // Pour afficher du plus petit au plus grand
  }, [data, filteredAccounts])

  // ⚡ MEMOIZATION: Calculer les données pour le graphique 5 - Retraits vs PnL mensuel
  const withdrawalsVsPnlData = useMemo(() => {
    if (!data || filteredAccounts.length === 0) return []

    const now = new Date()
    const monthsAgo =
      dateRange === "7days" ? 1 : dateRange === "30days" ? 3 : dateRange === "90days" ? 6 : 12
    const startDate = new Date(now)
    startDate.setMonth(startDate.getMonth() - monthsAgo)

    const monthlyData: Record<string, { pnl: number; withdrawals: number }> = {}

    filteredAccounts.forEach((account) => {
      account.pnlEntries
        .filter((entry) => new Date(entry.date) >= startDate)
        .forEach((entry) => {
          const monthKey = format(new Date(entry.date), "MMM yyyy", { locale: fr })
          if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = { pnl: 0, withdrawals: 0 }
          }
          monthlyData[monthKey].pnl += entry.amount
        })

      account.withdrawals
        .filter((w) => new Date(w.date) >= startDate)
        .forEach((withdrawal) => {
          const monthKey = format(new Date(withdrawal.date), "MMM yyyy", { locale: fr })
          if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = { pnl: 0, withdrawals: 0 }
          }
          const netAmount = withdrawal.amount * (account.propfirm === "TAKEPROFITTRADER" ? 0.8 : 1)
          monthlyData[monthKey].withdrawals += netAmount
        })
    })

    return Object.entries(monthlyData)
      .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
      .map(([month, values]) => ({
        month,
        pnl: values.pnl,
        retraits: values.withdrawals,
      }))
  }, [data, dateRange, filteredAccounts])

  // ⚡ MEMOIZATION: Calculer les données pour le graphique 6 - État des comptes
  const accountStatusData = useMemo(() => {
    if (!data || filteredAccounts.length === 0) return []

    const statusCount: Record<string, number> = {}
    filteredAccounts.forEach((account) => {
      const status = account.status || "ARCHIVED"
      statusCount[status] = (statusCount[status] || 0) + 1
    })

    return Object.entries(statusCount).map(([status, count]) => ({
      name:
        status === "ACTIVE"
          ? "Actifs"
          : status === "VALIDATED"
            ? "Validés"
            : status === "FAILED"
              ? "Échoués"
              : "Archivés",
      value: count,
      fill: STATUS_COLORS[status] || STATUS_COLORS.ARCHIVED,
    }))
  }, [data, filteredAccounts])

  // ⚡ MEMOIZATION: Calculer les données pour le graphique 7 - PnL par propfirm
  const pnlByPropfirmData = useMemo(() => {
    if (!data || filteredAccounts.length === 0) return []

    const pnlByPropfirm: Record<string, number> = {}
    filteredAccounts.forEach((account) => {
      const propfirm = account.propfirm || "OTHER"
      const totalPnl = account.pnlEntries.reduce((sum, entry) => sum + entry.amount, 0)
      pnlByPropfirm[propfirm] = (pnlByPropfirm[propfirm] || 0) + totalPnl
    })

    return Object.entries(pnlByPropfirm)
      .map(([propfirm, pnl]) => ({
        name: PROPFIRM_LABELS[propfirm] || propfirm,
        pnl: pnl,
      }))
      .sort((a, b) => b.pnl - a.pnl)
  }, [data, filteredAccounts])

  // ⚡ PERFORMANCE: Couleurs pour les graphiques pie
  const COLORS = [
    "#3b82f6", // blue-500
    "#10b981", // emerald-500
    "#f59e0b", // amber-500
    "#ef4444", // red-500
    "#8b5cf6", // violet-500
    "#ec4899", // pink-500
  ]

  const uniquePropfirms = useMemo(() => {
    if (!data) return []
    return Array.from(new Set(data.accounts.map((acc) => acc.propfirm)))
  }, [data])

  // ⚡ MEMOIZATION: Compte sélectionné pour la vue individuelle
  const selectedAccount = useMemo(() => {
    if (!data || !selectedAccountId) return null
    return data.accounts.find((acc) => acc.id === selectedAccountId) || null
  }, [data, selectedAccountId])

  // ⚡ MEMOIZATION: Données pour les graphiques de compte individuel
  // Graphique 1: Évolution PnL du compte
  const accountPnlEvolutionData = useMemo(() => {
    if (!selectedAccount) return []

    const now = new Date()
    const daysAgo =
      dateRange === "7days" ? 7 : dateRange === "30days" ? 30 : dateRange === "90days" ? 90 : 365
    const startDate = new Date(now)
    startDate.setDate(startDate.getDate() - daysAgo)

    const dailyPnl: Record<string, number> = {}
    let cumulativePnl = 0

    selectedAccount.pnlEntries
      .filter((entry) => new Date(entry.date) >= startDate)
      .forEach((entry) => {
        const dateKey = format(new Date(entry.date), "yyyy-MM-dd")
        dailyPnl[dateKey] = (dailyPnl[dateKey] || 0) + entry.amount
      })

    const sortedDates = Object.keys(dailyPnl).sort()
    return sortedDates.map((date) => {
      cumulativePnl += dailyPnl[date]
      return {
        date: format(new Date(date), "d MMM", { locale: fr }),
        pnl: dailyPnl[date],
        cumulative: cumulativePnl,
      }
    })
  }, [selectedAccount, dateRange])

  // ⚡ MEMOIZATION: Évolution de la balance du compte
  const accountBalanceEvolutionData = useMemo(() => {
    if (!selectedAccount) return []

    const now = new Date()
    const daysAgo =
      dateRange === "7days" ? 7 : dateRange === "30days" ? 30 : dateRange === "90days" ? 90 : 365
    const startDate = new Date(now)
    startDate.setDate(startDate.getDate() - daysAgo)

    // Trier toutes les transactions (PnL et retraits) par date
    const transactions: Array<{ date: Date; pnl: number; withdrawal: number }> = []

    selectedAccount.pnlEntries
      .filter((entry) => new Date(entry.date) >= startDate)
      .forEach((entry) => {
        transactions.push({
          date: new Date(entry.date),
          pnl: entry.amount,
          withdrawal: 0,
        })
      })

    selectedAccount.withdrawals
      .filter((w) => new Date(w.date) >= startDate)
      .forEach((w) => {
        transactions.push({
          date: new Date(w.date),
          pnl: 0,
          withdrawal: w.amount,
        })
      })

    // Trier par date
    transactions.sort((a, b) => a.date.getTime() - b.date.getTime())

    // Calculer la balance cumulative
    let currentBalance = selectedAccount.size
    const balanceData: Array<{ date: string; balance: number; pnl: number; withdrawal: number }> =
      []

    transactions.forEach((tx) => {
      currentBalance += tx.pnl - tx.withdrawal
      balanceData.push({
        date: format(tx.date, "d MMM", { locale: fr }),
        balance: currentBalance,
        pnl: tx.pnl,
        withdrawal: tx.withdrawal,
      })
    })

    return balanceData
  }, [selectedAccount, dateRange])

  // ⚡ MEMOIZATION: Drawdown du compte
  const accountDrawdownData = useMemo(() => {
    if (!selectedAccount) return []

    const now = new Date()
    const daysAgo =
      dateRange === "7days" ? 7 : dateRange === "30days" ? 30 : dateRange === "90days" ? 90 : 365
    const startDate = new Date(now)
    startDate.setDate(startDate.getDate() - daysAgo)

    // Calculer le drawdown au fil du temps
    let peakBalance = selectedAccount.size
    let currentBalance = selectedAccount.size
    const drawdownData: Array<{ date: string; balance: number; drawdown: number; peak: number }> =
      []

    // Trier toutes les transactions par date
    const transactions: Array<{ date: Date; amount: number }> = []

    selectedAccount.pnlEntries
      .filter((entry) => new Date(entry.date) >= startDate)
      .forEach((entry) => {
        transactions.push({ date: new Date(entry.date), amount: entry.amount })
      })

    selectedAccount.withdrawals
      .filter((w) => new Date(w.date) >= startDate)
      .forEach((w) => {
        transactions.push({ date: new Date(w.date), amount: -w.amount })
      })

    transactions.sort((a, b) => a.date.getTime() - b.date.getTime())

    transactions.forEach((tx) => {
      currentBalance += tx.amount
      if (currentBalance > peakBalance) {
        peakBalance = currentBalance
      }
      const drawdown = peakBalance - currentBalance
      drawdownData.push({
        date: format(tx.date, "d MMM", { locale: fr }),
        balance: currentBalance,
        drawdown: drawdown,
        peak: peakBalance,
      })
    })

    return drawdownData
  }, [selectedAccount, dateRange])

  // ⚡ MEMOIZATION: Performance journalière du compte
  const accountDailyPerformanceData = useMemo(() => {
    if (!selectedAccount) return []

    const now = new Date()
    const daysAgo =
      dateRange === "7days" ? 7 : dateRange === "30days" ? 30 : dateRange === "90days" ? 90 : 365
    const startDate = new Date(now)
    startDate.setDate(startDate.getDate() - daysAgo)

    const dailyPnl: Record<string, number> = {}

    selectedAccount.pnlEntries
      .filter((entry) => new Date(entry.date) >= startDate)
      .forEach((entry) => {
        const dateKey = format(new Date(entry.date), "yyyy-MM-dd")
        dailyPnl[dateKey] = (dailyPnl[dateKey] || 0) + entry.amount
      })

    return Object.entries(dailyPnl)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, pnl]) => ({
        date: format(new Date(date), "d MMM", { locale: fr }),
        pnl: pnl,
      }))
  }, [selectedAccount, dateRange])

  // ⚡ MEMOIZATION: Retraits vs PnL pour le compte
  const accountWithdrawalsVsPnlData = useMemo(() => {
    if (!selectedAccount) return []

    const now = new Date()
    const monthsAgo =
      dateRange === "7days" ? 1 : dateRange === "30days" ? 3 : dateRange === "90days" ? 6 : 12
    const startDate = new Date(now)
    startDate.setMonth(startDate.getMonth() - monthsAgo)

    const monthlyData: Record<string, { pnl: number; withdrawals: number }> = {}

    selectedAccount.pnlEntries
      .filter((entry) => new Date(entry.date) >= startDate)
      .forEach((entry) => {
        const monthKey = format(new Date(entry.date), "MMM yyyy", { locale: fr })
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = { pnl: 0, withdrawals: 0 }
        }
        monthlyData[monthKey].pnl += entry.amount
      })

    selectedAccount.withdrawals
      .filter((w) => new Date(w.date) >= startDate)
      .forEach((withdrawal) => {
        const monthKey = format(new Date(withdrawal.date), "MMM yyyy", { locale: fr })
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = { pnl: 0, withdrawals: 0 }
        }
        const netAmount =
          withdrawal.amount * (selectedAccount.propfirm === "TAKEPROFITTRADER" ? 0.8 : 1)
        monthlyData[monthKey].withdrawals += netAmount
      })

    return Object.entries(monthlyData)
      .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
      .map(([month, values]) => ({
        month,
        pnl: values.pnl,
        retraits: values.withdrawals,
      }))
  }, [selectedAccount, dateRange])

  // ⚡ MEMOIZATION: Statistiques du compte sélectionné
  const accountStats = useMemo(() => {
    if (!selectedAccount) return null

    const totalPnl = selectedAccount.pnlEntries.reduce((sum, entry) => sum + entry.amount, 0)
    const totalWithdrawals = selectedAccount.withdrawals.reduce((sum, w) => sum + w.amount, 0)
    const currentBalance = selectedAccount.size + totalPnl - totalWithdrawals
    const netProfit = totalPnl - totalWithdrawals

    // Calculer le drawdown maximum
    let peakBalance = selectedAccount.size
    let currentBalanceCalc = selectedAccount.size
    let maxDrawdown = 0

    const transactions: Array<{ amount: number }> = [
      ...selectedAccount.pnlEntries.map((e) => ({ amount: e.amount })),
      ...selectedAccount.withdrawals.map((w) => ({ amount: -w.amount })),
    ]

    transactions.forEach((tx) => {
      currentBalanceCalc += tx.amount
      if (currentBalanceCalc > peakBalance) {
        peakBalance = currentBalanceCalc
      }
      const drawdown = peakBalance - currentBalanceCalc
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown
      }
    })

    return {
      totalPnl,
      totalWithdrawals,
      currentBalance,
      netProfit,
      maxDrawdown,
      accountSize: selectedAccount.size,
    }
  }, [selectedAccount])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-zinc-900 dark:border-zinc-50 mx-auto"></div>
          <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
            Chargement des visualisations...
          </p>
        </div>
      </div>
    )
  }

  if (!data || data.accounts.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <Activity className="mx-auto h-16 w-16 text-zinc-400" />
          <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Aucune donnée</h3>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Créez des comptes et enregistrez des PnL pour voir les visualisations
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 sm:space-y-8 p-4 sm:p-6 lg:p-8">
      {/* Header avec filtres */}
      <section className="space-y-4">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-2">
              <h1 className="text-3xl sm:text-4xl font-bold text-zinc-900 dark:text-zinc-50">
                Visualisations
              </h1>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Vue d&apos;ensemble de vos performances et de l&apos;état de vos comptes
              </p>
            </div>
            <Button variant="outline" onClick={fetchData} className="w-full sm:w-auto">
              <RefreshCw className="h-4 w-4 mr-2" />
              Actualiser
            </Button>
          </div>

          {/* Menu de filtres amélioré et responsive */}
          <div className="flex flex-col gap-3 p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
            {/* Toggle vue Propfirm / Par compte */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 whitespace-nowrap">
                Mode d&apos;affichage:
              </label>
              <div className="flex gap-2 w-full sm:w-auto">
                <Button
                  variant={viewMode === "propfirm" ? "default" : "outline"}
                  onClick={() => {
                    setViewMode("propfirm")
                    setSelectedAccountId("")
                  }}
                  className="flex-1 sm:flex-none"
                >
                  <Layers className="h-4 w-4 mr-2" />
                  Propfirm
                </Button>
                <Button
                  variant={viewMode === "account" ? "default" : "outline"}
                  onClick={() => setViewMode("account")}
                  className="flex-1 sm:flex-none"
                >
                  <User className="h-4 w-4 mr-2" />
                  Par compte
                </Button>
              </div>
            </div>

            {/* Filtres conditionnels */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {/* Sélecteur de compte (visible uniquement en mode compte) */}
              {viewMode === "account" && (
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                    Sélectionner un compte
                  </label>
                  <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                    <SelectTrigger className="w-full">
                      <User className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Choisir un compte" />
                    </SelectTrigger>
                    <SelectContent>
                      {data?.accounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.name} ({PROPFIRM_LABELS[account.propfirm] || account.propfirm})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Filtre propfirm (visible uniquement en mode propfirm) */}
              {viewMode === "propfirm" && (
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                    Filtrer par propfirm
                  </label>
                  <Select value={propfirmFilter} onValueChange={setPropfirmFilter}>
                    <SelectTrigger className="w-full">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toutes les propfirms</SelectItem>
                      {uniquePropfirms.map((propfirm) => (
                        <SelectItem key={propfirm} value={propfirm}>
                          {PROPFIRM_LABELS[propfirm] || propfirm}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Sélecteur de période */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  Période
                </label>
                <Select
                  value={dateRange}
                  onValueChange={(value: "7days" | "30days" | "90days" | "all") =>
                    setDateRange(value)
                  }
                >
                  <SelectTrigger className="w-full">
                    <Calendar className="h-4 w-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7days">7 derniers jours</SelectItem>
                    <SelectItem value="30days">30 derniers jours</SelectItem>
                    <SelectItem value="90days">90 derniers jours</SelectItem>
                    <SelectItem value="all">Tout</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Affichage conditionnel selon le mode */}
      {viewMode === "propfirm" && (
        <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 items-start">
          {/* Graphique 1: Évolution du PnL */}
          <Card className="col-span-1 md:col-span-2 lg:col-span-2 xl:col-span-3">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-emerald-500" />
                Évolution du PnL cumulé
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px] sm:h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={pnlEvolutionData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="stroke-zinc-200 dark:stroke-zinc-800"
                    />
                    <XAxis
                      dataKey="date"
                      className="text-[10px] sm:text-xs"
                      tick={{ fill: "currentColor", fontSize: 10 }}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      className="text-[10px] sm:text-xs"
                      tick={{ fill: "currentColor", fontSize: 10 }}
                      tickFormatter={(value) => `$${value.toFixed(0)}`}
                      width={50}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: "10px" }} iconSize={12} />
                    <Line
                      type="monotone"
                      dataKey="pnl"
                      stroke="#10b981"
                      strokeWidth={2}
                      name="PnL journalier"
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="cumulative"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      name="PnL cumulé"
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Graphique 2: Répartition par propfirm */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-blue-500" />
                Répartition par propfirm
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px] sm:h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={propfirmDistributionData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(props: { name?: string; percent?: number }) => {
                        const { name, percent } = props
                        // Sur mobile, afficher seulement le pourcentage pour éviter le débordement
                        if (isMobile) {
                          return `${((percent ?? 0) * 100).toFixed(0)}%`
                        }
                        return `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                      }}
                      outerRadius={isMobile ? 50 : 60}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {propfirmDistributionData.map((_entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                      {...legendProps}
                      verticalAlign="bottom"
                      height={isMobile ? 80 : 36}
                      wrapperStyle={{ paddingTop: "10px" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Graphique 3: Évolution du capital */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-amber-500" />
                Évolution du capital sous gestion
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px] sm:h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={capitalEvolutionData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="stroke-zinc-200 dark:stroke-zinc-800"
                    />
                    <XAxis dataKey="month" {...getXAxisProps()} />
                    <YAxis {...getYAxisProps((value) => `$${(value / 1000).toFixed(0)}k`)} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="capital"
                      stroke="#f59e0b"
                      fill="#f59e0b"
                      fillOpacity={0.3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Graphique 4: Top comptes par PnL */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-purple-500" />
                Top 10 comptes par PnL
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px] sm:h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={topAccountsByPnlData}
                    layout="vertical"
                    margin={{ left: 0, right: 5, top: 5, bottom: 5 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="stroke-zinc-200 dark:stroke-zinc-800"
                    />
                    <XAxis type="number" {...getYAxisProps()} />
                    <YAxis
                      dataKey="name"
                      type="category"
                      width={isMobile ? 80 : 100}
                      className="text-[9px] sm:text-[10px] md:text-xs"
                      tick={{ fill: "currentColor", fontSize: isMobile ? 9 : 10 }}
                      tickFormatter={(value) => {
                        // Tronquer les noms longs sur mobile
                        if (isMobile && value.length > 12) {
                          return `${value.substring(0, 10)}...`
                        }
                        return value
                      }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="pnl" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Graphique 5: Retraits vs PnL mensuel */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-emerald-500" />
                Retraits vs PnL mensuel
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px] sm:h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={withdrawalsVsPnlData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="stroke-zinc-200 dark:stroke-zinc-800"
                    />
                    <XAxis dataKey="month" {...getXAxisProps()} />
                    <YAxis {...getYAxisProps((value) => `$${(value / 1000).toFixed(0)}k`)} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend {...legendProps} />
                    <Bar dataKey="pnl" fill="#10b981" name="PnL" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="retraits" fill="#3b82f6" name="Retraits" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Graphique 6: État des comptes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-red-500" />
                État des comptes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px] sm:h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={accountStatusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(props: { name?: string; percent?: number }) => {
                        const { name, percent } = props
                        // Sur mobile, afficher seulement le pourcentage
                        if (isMobile) {
                          return `${((percent ?? 0) * 100).toFixed(0)}%`
                        }
                        return `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                      }}
                      outerRadius={isMobile ? 50 : 60}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {accountStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                      {...legendProps}
                      verticalAlign="bottom"
                      height={isMobile ? 80 : 36}
                      wrapperStyle={{ paddingTop: "10px" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Graphique 7: PnL par propfirm */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart2 className="h-5 w-5 text-indigo-500" />
                PnL total par propfirm
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px] sm:h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={pnlByPropfirmData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="stroke-zinc-200 dark:stroke-zinc-800"
                    />
                    <XAxis dataKey="name" {...getXAxisProps()} />
                    <YAxis {...getYAxisProps((value) => `$${(value / 1000).toFixed(0)}k`)} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="pnl" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      {viewMode === "account" && selectedAccount && accountStats && (
        <div className="space-y-6">
          {/* Statistiques du compte */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                  Compte sélectionné
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                  {selectedAccount.name}
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  {PROPFIRM_LABELS[selectedAccount.propfirm] || selectedAccount.propfirm}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                  PnL total
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                  ${accountStats.totalPnl.toFixed(2)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                  Balance actuelle
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                  ${accountStats.currentBalance.toFixed(2)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                  Drawdown max
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-bold text-red-600 dark:text-red-400">
                  ${accountStats.maxDrawdown.toFixed(2)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Grille de graphiques pour le compte */}
          <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 items-start">
            {/* Graphique 1: Évolution PnL du compte */}
            <Card className="col-span-1 md:col-span-2 lg:col-span-2 xl:col-span-3">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-emerald-500" />
                  Évolution du PnL du compte
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[250px] sm:h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={accountPnlEvolutionData}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        className="stroke-zinc-200 dark:stroke-zinc-800"
                      />
                      <XAxis dataKey="date" {...getXAxisProps()} />
                      <YAxis {...getYAxisProps((value) => `$${value.toFixed(0)}`)} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend {...legendProps} />
                      <Line
                        type="monotone"
                        dataKey="pnl"
                        stroke="#10b981"
                        strokeWidth={2}
                        name="PnL journalier"
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="cumulative"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        name="PnL cumulé"
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Graphique 2: Évolution de la balance */}
            <Card className="col-span-1 md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-amber-500" />
                  Évolution de la balance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[250px] sm:h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={accountBalanceEvolutionData}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        className="stroke-zinc-200 dark:stroke-zinc-800"
                      />
                      <XAxis dataKey="date" {...getXAxisProps()} />
                      <YAxis {...getYAxisProps((value) => `$${value.toFixed(0)}`)} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend {...legendProps} />
                      <Area
                        type="monotone"
                        dataKey="balance"
                        fill="#f59e0b"
                        stroke="#f59e0b"
                        fillOpacity={0.3}
                        name="Balance"
                      />
                      <Bar dataKey="pnl" fill="#10b981" name="PnL" />
                      <Bar dataKey="withdrawal" fill="#ef4444" name="Retrait" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Graphique 3: Drawdown */}
            <Card className="col-span-1 md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingDown className="h-5 w-5 text-red-500" />
                  Drawdown au fil du temps
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[250px] sm:h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={accountDrawdownData}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        className="stroke-zinc-200 dark:stroke-zinc-800"
                      />
                      <XAxis dataKey="date" {...getXAxisProps()} />
                      <YAxis {...getYAxisProps((value) => `$${value.toFixed(0)}`)} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend {...legendProps} />
                      <Area
                        type="monotone"
                        dataKey="drawdown"
                        fill="#ef4444"
                        stroke="#ef4444"
                        fillOpacity={0.3}
                        name="Drawdown"
                      />
                      <Line
                        type="monotone"
                        dataKey="peak"
                        stroke="#10b981"
                        strokeWidth={2}
                        name="Pic"
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="balance"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        name="Balance"
                        dot={false}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Graphique 4: Performance journalière */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-purple-500" />
                  Performance journalière
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[250px] sm:h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={accountDailyPerformanceData}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        className="stroke-zinc-200 dark:stroke-zinc-800"
                      />
                      <XAxis dataKey="date" {...getXAxisProps()} />
                      <YAxis {...getYAxisProps((value) => `$${value.toFixed(0)}`)} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="pnl" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="PnL" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Graphique 5: Retraits vs PnL mensuel */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-emerald-500" />
                  Retraits vs PnL mensuel
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[250px] sm:h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={accountWithdrawalsVsPnlData}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        className="stroke-zinc-200 dark:stroke-zinc-800"
                      />
                      <XAxis dataKey="month" {...getXAxisProps()} />
                      <YAxis {...getYAxisProps((value) => `$${value.toFixed(0)}`)} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend {...legendProps} />
                      <Bar dataKey="pnl" fill="#10b981" name="PnL" radius={[4, 4, 0, 0]} />
                      <Bar
                        dataKey="retraits"
                        fill="#3b82f6"
                        name="Retraits"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
      {viewMode === "account" && (!selectedAccount || !accountStats) && (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <User className="mx-auto h-16 w-16 text-zinc-400" />
            <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
              Sélectionnez un compte
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Choisissez un compte dans le menu ci-dessus pour voir ses visualisations
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
