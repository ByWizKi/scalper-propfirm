"use client"

import { Filter, Activity, Target, Wallet, ShieldCheck, Eye } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"

interface FilterSectionProps {
  statusFilter: "all" | "active" | "validated" | "failed"
  typeFilter: "all" | "eval" | "funded"
  filterPropfirm: string
  sortBy: "date-desc" | "date-asc"
  availablePropfirms: string[]
  propfirmLabels: Record<string, string> | Record<number, string>
  filteredCount: number
  onStatusFilterChange: (filter: "all" | "active" | "validated" | "failed") => void
  onTypeFilterChange: (filter: "all" | "eval" | "funded") => void
  onPropfirmFilterChange: (propfirm: string) => void
  onSortChange: (sort: "date-desc" | "date-asc") => void
}

export function FilterSection({
  statusFilter,
  typeFilter,
  filterPropfirm,
  sortBy,
  availablePropfirms,
  propfirmLabels,
  filteredCount,
  onStatusFilterChange,
  onTypeFilterChange,
  onPropfirmFilterChange,
  onSortChange,
}: FilterSectionProps) {
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
            <Activity className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
            <span className="font-semibold">{filteredCount}</span>
            <span className="hidden sm:inline">compte{filteredCount > 1 ? "s" : ""}</span>
          </div>
        </div>
      </div>

      {/* Contenu */}
      <div className="p-4 sm:p-5 lg:p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {/* Statut */}
          <div className="flex flex-col gap-2 min-w-0">
            <span className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium">
              Statut:
            </span>
            <div className="grid grid-cols-2 gap-2">
              <FilterButton
                active={statusFilter === "all"}
                onClick={() => onStatusFilterChange("all")}
                variant="slate"
                size="sm"
              >
                Tous
              </FilterButton>
              <FilterButton
                active={statusFilter === "active"}
                onClick={() => onStatusFilterChange("active")}
                variant="emerald"
                size="sm"
              >
                Actifs
              </FilterButton>
              <FilterButton
                active={statusFilter === "validated"}
                onClick={() => onStatusFilterChange("validated")}
                variant="amber"
                size="sm"
              >
                Validés
              </FilterButton>
              <FilterButton
                active={statusFilter === "failed"}
                onClick={() => onStatusFilterChange("failed")}
                variant="rose"
                size="sm"
              >
                Échoués
              </FilterButton>
            </div>
          </div>

          {/* Type */}
          <div className="flex flex-col gap-2 min-w-0">
            <span className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium">
              Type:
            </span>
            <div className="grid grid-cols-2 gap-2">
              <FilterButton
                active={typeFilter === "all"}
                onClick={() => onTypeFilterChange("all")}
                variant="slate"
                size="sm"
              >
                Tous
              </FilterButton>
              <FilterButton
                active={typeFilter === "eval"}
                onClick={() => onTypeFilterChange("eval")}
                variant="slate"
                size="sm"
              >
                Éval
              </FilterButton>
              <FilterButton
                active={typeFilter === "funded"}
                onClick={() => onTypeFilterChange("funded")}
                variant="emerald"
                size="sm"
              >
                Financé
              </FilterButton>
            </div>
          </div>

          {/* Propfirm */}
          {availablePropfirms.length > 0 && (
            <div className="flex flex-col gap-2 min-w-0">
              <span className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium">
                Propfirm:
              </span>
              <Select value={filterPropfirm} onValueChange={onPropfirmFilterChange}>
                <SelectTrigger className="h-9 w-full min-w-0">
                  <SelectValue placeholder="Propfirm" />
                </SelectTrigger>
                <SelectContent className="w-[var(--radix-select-trigger-width)]">
                  <SelectItem value="all">Toutes</SelectItem>
                  {availablePropfirms.map((propfirm) => (
                    <SelectItem key={propfirm} value={propfirm}>
                      {(propfirmLabels as Record<string, string>)[propfirm] ?? propfirm}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Tri */}
          {availablePropfirms.length > 0 && (
            <div className="flex flex-col gap-2 min-w-0">
              <span className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium">
                Tri:
              </span>
              <Select
                value={sortBy}
                onValueChange={(value) => onSortChange(value as "date-desc" | "date-asc")}
              >
                <SelectTrigger className="h-9 w-full min-w-0">
                  <SelectValue placeholder="Tri" />
                </SelectTrigger>
                <SelectContent className="w-[var(--radix-select-trigger-width)]">
                  <SelectItem value="date-desc">Plus récents</SelectItem>
                  <SelectItem value="date-asc">Plus anciens</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

interface FilterButtonProps {
  active: boolean
  onClick: () => void
  variant: "slate" | "emerald" | "amber" | "rose"
  size?: "sm" | "md"
  icon?: React.ReactNode
  children: React.ReactNode
}

function FilterButton({
  active,
  onClick,
  variant,
  size = "md",
  icon,
  children,
}: FilterButtonProps) {
  const variantStyles = {
    slate: active
      ? "bg-slate-700 text-white border-slate-700 shadow-sm dark:bg-[#475569] dark:border-[#64748b] dark:text-white"
      : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50 hover:border-slate-400 dark:bg-[#1e293b]/60 dark:text-slate-200 dark:border-[#334155] dark:hover:bg-[#1e293b] dark:hover:border-[#475569]",
    emerald: active
      ? "bg-emerald-600 text-white border-emerald-600 shadow-sm dark:bg-emerald-500 dark:border-emerald-400 dark:text-white"
      : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50 hover:border-slate-400 dark:bg-[#1e293b]/60 dark:text-slate-200 dark:border-[#334155] dark:hover:bg-[#1e293b] dark:hover:border-[#475569]",
    amber: active
      ? "bg-amber-600 text-white border-amber-600 shadow-sm dark:bg-amber-500 dark:border-amber-400 dark:text-white"
      : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50 hover:border-slate-400 dark:bg-[#1e293b]/60 dark:text-slate-200 dark:border-[#334155] dark:hover:bg-[#1e293b] dark:hover:border-[#475569]",
    rose: active
      ? "bg-rose-600 text-white border-rose-600 shadow-sm dark:bg-rose-500 dark:border-rose-400 dark:text-white"
      : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50 hover:border-slate-400 dark:bg-[#1e293b]/60 dark:text-slate-200 dark:border-[#334155] dark:hover:bg-[#1e293b] dark:hover:border-[#475569]",
  }

  const sizeStyles = {
    sm: "px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs rounded-md border font-medium h-8 sm:h-9 whitespace-nowrap w-full",
    md: "px-3 py-2 text-xs rounded-md border font-medium h-9 w-[120px]",
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-center gap-1 transition-all duration-200 cursor-pointer active:scale-95 ${variantStyles[variant]} ${sizeStyles[size]} shrink-0`}
    >
      {icon}
      <span className="whitespace-nowrap text-xs">{children}</span>
    </button>
  )
}
