"use client"

import { Filter, Activity, DollarSign } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"

interface WithdrawalFilterSectionProps {
  dateFilter: string
  startDate: string
  endDate: string
  propfirmFilter: string
  accountTypeFilter: string
  accountFilter: string
  availablePropfirms: string[]
  eligibleAccounts: Array<{ id: string; name: string }>
  propfirmLabels: Record<string, string>
  filteredCount: number
  onDateFilterChange: (value: string) => void
  onStartDateChange: (value: string) => void
  onEndDateChange: (value: string) => void
  onPropfirmFilterChange: (value: string) => void
  onAccountTypeFilterChange: (value: string) => void
  onAccountFilterChange: (value: string) => void
  onReset: () => void
}

export function WithdrawalFilterSection({
  dateFilter,
  startDate,
  endDate,
  propfirmFilter,
  accountTypeFilter,
  accountFilter,
  availablePropfirms,
  eligibleAccounts,
  propfirmLabels,
  filteredCount,
  onDateFilterChange,
  onStartDateChange,
  onEndDateChange,
  onPropfirmFilterChange,
  onAccountTypeFilterChange,
  onAccountFilterChange,
  onReset,
}: WithdrawalFilterSectionProps) {
  const hasActiveFilters =
    dateFilter !== "all" ||
    propfirmFilter !== "all" ||
    accountTypeFilter !== "all" ||
    accountFilter !== "all" ||
    startDate ||
    endDate

  return (
    <section className="rounded-2xl border border-slate-200/70 dark:border-[#1e293b]/70 bg-white/85 dark:bg-[#151b2e]/90 backdrop-blur-sm shadow-sm">
      {/* Header */}
      <div className="px-4 sm:px-5 lg:px-6 py-3 sm:py-4 border-b border-slate-200/70 dark:border-[#1e293b]/70">
        <div className="flex items-center justify-between">
          <h2 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Filter className="h-4 w-4 sm:h-5 sm:w-5" />
            Filtres
          </h2>
          <div className="flex items-center gap-1.5 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
            <DollarSign className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
            <span className="font-semibold">{filteredCount}</span>
            <span className="hidden sm:inline">retrait{filteredCount > 1 ? "s" : ""}</span>
          </div>
        </div>
      </div>

      {/* Contenu */}
      <div className="p-4 sm:p-5 lg:p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 sm:gap-6">
          {/* Période */}
          <div className="flex flex-col gap-2 min-w-0">
            <span className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium">
              Période:
            </span>
            <Select value={dateFilter} onValueChange={onDateFilterChange}>
              <SelectTrigger className="h-9 w-full min-w-0">
                <SelectValue placeholder="Période" />
              </SelectTrigger>
              <SelectContent className="w-[var(--radix-select-trigger-width)]">
                <SelectItem value="all">Toutes les dates</SelectItem>
                <SelectItem value="7days">7 derniers jours</SelectItem>
                <SelectItem value="30days">30 derniers jours</SelectItem>
                <SelectItem value="thisMonth">Ce mois</SelectItem>
                <SelectItem value="custom">Personnalisée</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Dates personnalisées */}
          {dateFilter === "custom" && (
            <>
              <div className="flex flex-col gap-2 min-w-0">
                <span className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium">
                  Date début:
                </span>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => onStartDateChange(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
              <div className="flex flex-col gap-2 min-w-0">
                <span className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium">
                  Date fin:
                </span>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => onEndDateChange(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </>
          )}

          {/* Propfirm */}
          {availablePropfirms.length > 0 && (
            <div className="flex flex-col gap-2 min-w-0">
              <span className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium">
                Propfirm:
              </span>
              <Select value={propfirmFilter} onValueChange={onPropfirmFilterChange}>
                <SelectTrigger className="h-9 w-full min-w-0">
                  <SelectValue placeholder="Propfirm" />
                </SelectTrigger>
                <SelectContent className="w-[var(--radix-select-trigger-width)]">
                  <SelectItem value="all">Toutes</SelectItem>
                  {availablePropfirms.map((propfirm) => (
                    <SelectItem key={propfirm} value={propfirm}>
                      {propfirmLabels[propfirm] ?? propfirm}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Type de compte */}
          <div className="flex flex-col gap-2 min-w-0">
            <span className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium">
              Type:
            </span>
            <Select value={accountTypeFilter} onValueChange={onAccountTypeFilterChange}>
              <SelectTrigger className="h-9 w-full min-w-0">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent className="w-[var(--radix-select-trigger-width)]">
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="eval">Évaluation</SelectItem>
                <SelectItem value="funded">Financé</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Compte */}
          {eligibleAccounts.length > 0 && (
            <div className="flex flex-col gap-2 min-w-0">
              <span className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium">
                Compte:
              </span>
              <Select value={accountFilter} onValueChange={onAccountFilterChange}>
                <SelectTrigger className="h-9 w-full min-w-0">
                  <SelectValue placeholder="Compte" />
                </SelectTrigger>
                <SelectContent className="w-[var(--radix-select-trigger-width)]">
                  <SelectItem value="all">Tous</SelectItem>
                  {eligibleAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Bouton réinitialiser */}
          {hasActiveFilters && (
            <div className="flex flex-col gap-2 min-w-0">
              <span className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium opacity-0">
                Réinitialiser
              </span>
              <Button variant="outline" size="sm" onClick={onReset} className="h-9 text-xs">
                <X className="h-3 w-3 mr-1.5" />
                Réinitialiser
              </Button>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

