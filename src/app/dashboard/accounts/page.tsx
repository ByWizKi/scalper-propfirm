"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Wallet, Filter } from "lucide-react"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { AccountCard } from "@/components/account-card"
import { FilterSection } from "@/components/filter-section"
import { PageHeader } from "@/components/page-header"
import { EmptyState } from "@/components/empty-state"
import { AccountStatsGrid } from "@/components/account-stats-grid"
import { AccountFormDialog } from "@/components/account-form-dialog"
import { BulkAccountFormDialog } from "@/components/bulk-account-form-dialog"
import { useAccountsListCache } from "@/hooks/use-data-cache"
import { useDeleteAccountMutation } from "@/hooks/use-mutation"
import { PROPFIRM_LABELS, ACCOUNT_TYPE_LABELS, STATUS_LABELS, STATUS_COLORS } from "@/lib/constants"

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
  pnlEntries?: Array<{ id?: string; date?: string; amount: number; notes?: string | null }>
  linkedEval?: { pricePaid: number }
}

export default function AccountsPage() {
  const router = useRouter()

  // Utiliser le cache avec invalidation automatique
  const { data: accounts = [], isLoading } = useAccountsListCache()

  // Utiliser la mutation de suppression
  const { mutate: deleteAccount } = useDeleteAccountMutation()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<PropfirmAccount | null>(null)
  const [sortBy, setSortBy] = useState<"date-desc" | "date-asc">("date-desc")
  const [filterPropfirm, setFilterPropfirm] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "validated" | "failed">("all")
  const [typeFilter, setTypeFilter] = useState<"all" | "eval" | "funded">("all")

  const handleDelete = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce compte ?")) {
      return
    }
    await deleteAccount(id)
  }

  const handleEdit = (account: PropfirmAccount) => {
    setSelectedAccount(account)
    setDialogOpen(true)
  }

  const handleAdd = () => {
    setSelectedAccount(null)
    setDialogOpen(true)
  }

  const handleBulkAdd = () => {
    setBulkDialogOpen(true)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "d MMM yyyy", { locale: fr })
  }

  // Filtrer et trier les comptes
  const filteredAndSortedAccounts = useMemo(() => {
    return accounts
      .filter((account: PropfirmAccount) => {
        // Filtre par propfirm
        if (filterPropfirm !== "all" && account.propfirm !== filterPropfirm) {
          return false
        }

        // Filtre par statut
        if (statusFilter === "active" && account.status !== "ACTIVE") {
          return false
        }
        if (statusFilter === "validated" && account.status !== "VALIDATED") {
          return false
        }
        if (statusFilter === "failed" && account.status !== "FAILED") {
          return false
        }

        // Filtre par type de compte
        if (typeFilter === "eval" && account.accountType !== "EVAL") {
          return false
        }
        if (typeFilter === "funded" && account.accountType !== "FUNDED") {
          return false
        }

        return true
      })
      .sort((a: PropfirmAccount, b: PropfirmAccount) => {
        // Trier d'abord par statut (actifs en premier)
        const statusPriority: Record<string, number> = {
          ACTIVE: 0,
          VALIDATED: 1,
          FAILED: 2,
          ARCHIVED: 3,
        }

        const aPriority = statusPriority[a.status] ?? 999
        const bPriority = statusPriority[b.status] ?? 999

        if (aPriority !== bPriority) {
          return aPriority - bPriority
        }

        // Puis trier par date
        if (sortBy === "date-desc") {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        } else {
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        }
      })
  }, [accounts, filterPropfirm, statusFilter, typeFilter, sortBy])

  const accountStats = useMemo(() => {
    const totalInvestment = accounts.reduce(
      (sum: number, acc: PropfirmAccount) => sum + (acc.pricePaid ?? 0),
      0
    )

    const lastAccount = [...accounts].sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })[0]

    const lastValidatedAccount = [...accounts]
      .filter((acc) => acc.status === "VALIDATED")
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]

    return {
      totalInvestment,
      lastAccount,
      lastValidatedAccount,
    }
  }, [accounts])

  const { totalInvestment, lastAccount, lastValidatedAccount } = accountStats

  const filteredStats = useMemo(() => {
    const count = filteredAndSortedAccounts.length
    const activeCount = filteredAndSortedAccounts.filter(
      (acc: PropfirmAccount) => acc.status === "ACTIVE"
    ).length
    const evalCount = filteredAndSortedAccounts.filter(
      (acc: PropfirmAccount) => acc.accountType === "EVAL"
    ).length
    const fundedCount = filteredAndSortedAccounts.filter(
      (acc: PropfirmAccount) => acc.accountType === "FUNDED"
    ).length

    return {
      count,
      activeCount,
      evalCount,
      fundedCount,
    }
  }, [filteredAndSortedAccounts])

  const {
    count: filteredCount,
    activeCount: filteredActiveCount,
    evalCount: filteredEvalCount,
    fundedCount: filteredFundedCount,
  } = filteredStats

  // Obtenir la liste des propfirms disponibles
  const availablePropfirms: string[] = Array.from(
    new Set(accounts.map((acc: PropfirmAccount) => acc.propfirm))
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900 dark:border-slate-50 mx-auto"></div>
          <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">
            Chargement des comptes...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 sm:space-y-8 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <section className="space-y-6">
        <PageHeader
          title="Mes comptes"
          primaryAction={{
            label: "Nouveau compte",
            onClick: handleAdd,
            icon: <Plus className="h-5 w-5" />,
          }}
          secondaryAction={{
            label: "Ajout groupé",
            onClick: handleBulkAdd,
            icon: <Plus className="h-5 w-5" />,
          }}
        />

        {/* Statistiques */}
        <AccountStatsGrid
          totalCount={filteredCount}
          activeCount={filteredActiveCount}
          evalCount={filteredEvalCount}
          fundedCount={filteredFundedCount}
          totalInvestment={totalInvestment}
          lastValidatedAccount={
            lastValidatedAccount
              ? {
                  name: lastValidatedAccount.name,
                  propfirm: lastValidatedAccount.propfirm,
                  size: lastValidatedAccount.size,
                  createdAt: lastValidatedAccount.createdAt,
                }
              : null
          }
          lastAccount={
            lastAccount
              ? {
                  name: lastAccount.name,
                  propfirm: lastAccount.propfirm,
                  accountType: lastAccount.accountType,
                  createdAt: lastAccount.createdAt,
                }
              : null
          }
          propfirmLabels={PROPFIRM_LABELS}
          accountTypeLabels={ACCOUNT_TYPE_LABELS}
          formatCurrency={formatCurrency}
          formatDate={formatDate}
        />
      </section>

      {/* Filtres */}
      <FilterSection
        statusFilter={statusFilter}
        typeFilter={typeFilter}
        filterPropfirm={filterPropfirm}
        sortBy={sortBy}
        availablePropfirms={availablePropfirms}
        propfirmLabels={PROPFIRM_LABELS}
        filteredCount={filteredCount}
        onStatusFilterChange={setStatusFilter}
        onTypeFilterChange={setTypeFilter}
        onPropfirmFilterChange={setFilterPropfirm}
        onSortChange={setSortBy}
      />

      {/* Liste des comptes ou état vide */}
      {accounts.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="Aucun compte"
          description="Ajoutez votre premier compte pour commencer à suivre vos comptes propfirm"
          action={{
            label: "Nouveau compte",
            onClick: handleAdd,
            icon: <Plus className="h-5 w-5" />,
          }}
        />
      ) : filteredAndSortedAccounts.length === 0 ? (
        <EmptyState
          icon={Filter}
          title="Aucun résultat"
          description="Changez les filtres pour voir vos comptes"
        />
      ) : (
        <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 items-start">
          {filteredAndSortedAccounts.map((account: PropfirmAccount) => (
            <AccountCard
              key={account.id}
              account={account}
              onEdit={handleEdit}
              onDelete={handleDelete}
              propfirmLabels={PROPFIRM_LABELS}
              accountTypeLabels={ACCOUNT_TYPE_LABELS}
              statusLabels={STATUS_LABELS}
              statusColors={STATUS_COLORS}
            />
          ))}
        </div>
      )}

      {/* Dialogs */}
      <AccountFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        account={selectedAccount ?? undefined}
        onSuccess={() => {
          setDialogOpen(false)
          router.refresh()
        }}
      />

      <BulkAccountFormDialog
        open={bulkDialogOpen}
        onOpenChange={setBulkDialogOpen}
        onSuccess={() => {
          setBulkDialogOpen(false)
          router.refresh()
        }}
      />
    </div>
  )
}
