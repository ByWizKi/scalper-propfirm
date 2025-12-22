"use client"

import { StatCard } from "@/components/stat-card"
import { Activity, Wallet, ShieldCheck, Target } from "lucide-react"

interface AccountStatsGridProps {
  totalCount: number
  activeCount: number
  evalCount: number
  fundedCount: number
  totalInvestment: number
  lastValidatedAccount?: {
    name: string
    propfirm: string
    size: number
    createdAt: string
  } | null
  lastAccount?: {
    name: string
    propfirm: string
    accountType: string
    createdAt: string
  } | null
  propfirmLabels: Record<string, string>
  accountTypeLabels: Record<string, string>
  formatCurrency: (amount: number) => string
  formatDate: (date: string) => string
}

export function AccountStatsGrid({
  totalCount,
  activeCount,
  evalCount,
  fundedCount,
  totalInvestment,
  lastValidatedAccount,
  lastAccount,
  propfirmLabels,
  accountTypeLabels,
  formatCurrency,
  formatDate,
}: AccountStatsGridProps) {
  const heroDescription = `${activeCount} actif${activeCount > 1 ? "s" : ""}`
  const heroSecondary = `${evalCount} éval · ${fundedCount} financé${fundedCount > 1 ? "s" : ""}`

  const lastAccountDateLabel = lastAccount ? formatDate(lastAccount.createdAt) : "—"
  const lastAccountDescription = lastAccount
    ? `${propfirmLabels[lastAccount.propfirm] ?? lastAccount.propfirm} • ${accountTypeLabels[lastAccount.accountType]}`
    : "Aucun compte"

  const lastAccountName = lastAccount
    ? lastAccount.name.length > 20
      ? `${lastAccount.name.substring(0, 20)}...`
      : lastAccount.name
    : "—"

  const lastValidatedLabel = lastValidatedAccount
    ? formatDate(lastValidatedAccount.createdAt)
    : "—"
  const lastValidatedDescription = lastValidatedAccount
    ? `${propfirmLabels[lastValidatedAccount.propfirm] ?? lastValidatedAccount.propfirm} • ${formatCurrency(lastValidatedAccount.size)}`
    : "Aucun compte validé"

  return (
    <div className="grid gap-4 sm:gap-6 md:grid-cols-2 xl:grid-cols-4">
      <StatCard
        title="Total comptes"
        value={totalCount}
        icon={Activity}
        description={heroDescription}
        secondaryText={heroSecondary}
        className="min-w-0"
      />
      <StatCard
        title="Total investi"
        value={formatCurrency(totalInvestment)}
        icon={Wallet}
        variant="warning"
        description="Argent dépensé"
        className="min-w-0"
      />
      <StatCard
        title="Dernier validé"
        value={lastValidatedAccount ? lastValidatedAccount.name : "—"}
        icon={ShieldCheck}
        description={lastValidatedDescription}
        secondaryText={lastValidatedLabel}
        variant={lastValidatedAccount ? "success" : "neutral"}
        className="min-w-0"
        valueTooltip={lastValidatedAccount?.name}
      />
      <StatCard
        title="Dernier ajouté"
        value={lastAccountName}
        valueTooltip={lastAccount?.name}
        icon={Target}
        description={lastAccountDescription}
        secondaryText={lastAccountDateLabel}
        className="min-w-0"
      />
    </div>
  )
}

