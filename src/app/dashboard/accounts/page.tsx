"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AccountFormDialog } from "@/components/account-form-dialog"
import { Plus, Edit, Trash2, Wallet } from "lucide-react"
import { useAccountsListCache } from "@/hooks/use-data-cache"
import { useDeleteAccountMutation } from "@/hooks/use-mutation"

interface PropfirmAccount {
  id: string
  name: string
  propfirm: string
  size: number
  accountType: string
  status: string
  pricePaid: number
  notes?: string
  createdAt: string
}

const PROPFIRM_LABELS: Record<string, string> = {
  TOPSTEP: "TopStep",
  TAKEPROFITTRADER: "Take Profit Trader",
  APEX: "Apex",
  FTMO: "FTMO",
  MYFUNDEDFUTURES: "My Funded Futures",
  OTHER: "Autre",
}

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  EVAL: "Évaluation",
  FUNDED: "Financé",
}

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Actif",
  VALIDATED: "Validé",
  FAILED: "Échoué",
  ARCHIVED: "Archivé",
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  VALIDATED: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  FAILED: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  ARCHIVED: "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300",
}

export default function AccountsPage() {
  const router = useRouter()

  // Utiliser le cache avec invalidation automatique
  const { data: accounts = [], isLoading } = useAccountsListCache()

  // Utiliser la mutation de suppression
  const { mutate: deleteAccount } = useDeleteAccountMutation()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<PropfirmAccount | null>(null)
  const [sortBy, setSortBy] = useState<"date-desc" | "date-asc">("date-desc")
  const [filterPropfirm, setFilterPropfirm] = useState<string>("all")

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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  // Filtrer et trier les comptes
  const filteredAndSortedAccounts = accounts
    .filter((account: { propfirm: string }) => {
      if (filterPropfirm === "all") return true
      return account.propfirm === filterPropfirm
    })
    .sort((a: { createdAt: string }, b: { createdAt: string }) => {
      if (sortBy === "date-desc") {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      } else {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      }
    })

  // Obtenir la liste des propfirms disponibles
  const availablePropfirms = Array.from(new Set(accounts.map((acc: { propfirm: string }) => acc.propfirm)))

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-zinc-900 dark:border-zinc-50 mx-auto"></div>
          <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">Chargement des comptes...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">Mes Comptes</h1>
          <p className="text-zinc-600 dark:text-zinc-400 mt-2">
            Gérez vos comptes propfirm
          </p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="h-4 w-4 mr-2" />
          Ajouter un compte
        </Button>
      </div>

      {/* Filtres et tri */}
      {accounts.length > 0 && (
        <div className="flex gap-4 mb-6">
          <div className="flex-1">
            <Select value={filterPropfirm} onValueChange={setFilterPropfirm}>
              <SelectTrigger>
                <SelectValue placeholder="Toutes les propfirms" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les propfirms</SelectItem>
                {availablePropfirms.map((propfirm: string) => (
                  <SelectItem key={propfirm} value={propfirm}>
                    {PROPFIRM_LABELS[propfirm as keyof typeof PROPFIRM_LABELS]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <Select value={sortBy} onValueChange={(value) => setSortBy(value as "date-desc" | "date-asc")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date-desc">Plus récents d'abord</SelectItem>
                <SelectItem value="date-asc">Plus anciens d'abord</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {accounts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Wallet className="h-12 w-12 text-zinc-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Aucun compte pour le moment</h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
              Commencez par ajouter votre premier compte propfirm
            </p>
            <Button onClick={handleAdd}>
              <Plus className="h-4 w-4 mr-2" />
              Ajouter un compte
            </Button>
          </CardContent>
        </Card>
      ) : filteredAndSortedAccounts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Wallet className="h-12 w-12 text-zinc-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Aucun compte trouvé</h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
              Aucun compte ne correspond aux filtres sélectionnés
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredAndSortedAccounts.map((account: { id: string; name: string; propfirm: string; size: number; accountType: string; status: string; pricePaid: number; notes?: string | null }) => (
            <Card
              key={account.id}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => router.push(`/dashboard/accounts/${account.id}`)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{account.name}</CardTitle>
                    <CardDescription className="mt-1">
                      {PROPFIRM_LABELS[account.propfirm]} • {formatCurrency(account.size)}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleEdit(account)
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(account.id)
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-600 dark:text-zinc-400">Type</span>
                    <span className="font-medium">
                      {ACCOUNT_TYPE_LABELS[account.accountType]}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-600 dark:text-zinc-400">Statut</span>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        STATUS_COLORS[account.status]
                      }`}
                    >
                      {STATUS_LABELS[account.status]}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-600 dark:text-zinc-400">Prix payé</span>
                    <span className="font-medium">{formatCurrency(account.pricePaid)}</span>
                  </div>
                  {account.notes && (
                    <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800">
                      <p className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2">
                        {account.notes}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AccountFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        account={selectedAccount}
        onSuccess={() => {}}
      />
    </div>
  )
}

