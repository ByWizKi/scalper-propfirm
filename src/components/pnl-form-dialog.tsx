"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Check } from "lucide-react"
import { useCreatePnlMutation, useCreateMultiplePnlMutation } from "@/hooks/use-mutation"

interface PnlEntry {
  id: string
  accountId: string
  date: string
  amount: number
  notes?: string
}

interface PropfirmAccount {
  id: string
  name: string
  propfirm: string
  accountType: string
  size: number
}

interface PnlFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  entry?: PnlEntry | null
  accounts: PropfirmAccount[]
  onSuccess: () => void
}

export function PnlFormDialog({
  open,
  onOpenChange,
  entry,
  accounts,
  onSuccess,
}: PnlFormDialogProps) {
  // Utiliser les mutations
  const { mutate: createPnl, isLoading: isCreating } = useCreatePnlMutation()
  const { mutate: createMultiplePnl, isLoading: isCreatingMultiple } = useCreateMultiplePnlMutation()

  const [multipleMode, setMultipleMode] = useState(false)
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([])
  const [filterPropfirm, setFilterPropfirm] = useState<string>("all")
  const [filterAccountType, setFilterAccountType] = useState<string>("all")
  const [formData, setFormData] = useState({
    accountId: "",
    date: new Date().toISOString().split("T")[0],
    amount: "",
    notes: "",
  })

  const isLoading = isCreating || isCreatingMultiple

  useEffect(() => {
    if (entry) {
      setFormData({
        accountId: entry.accountId,
        date: new Date(entry.date).toISOString().split("T")[0],
        amount: entry.amount.toString(),
        notes: entry.notes || "",
      })
      setMultipleMode(false)
      setSelectedAccountIds([])
    } else if (accounts.length > 0) {
      setFormData({
        accountId: accounts[0].id,
        date: new Date().toISOString().split("T")[0],
        amount: "",
        notes: "",
      })
      setMultipleMode(false)
      setSelectedAccountIds([])
      setFilterPropfirm("all")
      setFilterAccountType("all")
    }
  }, [entry, accounts, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      // Mode édition (pas encore supporté par les mutations, à faire plus tard)
      if (entry) {
        const response = await fetch(`/api/pnl/${entry.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.message)
        }
      }
      // Mode multiple
      else if (multipleMode && selectedAccountIds.length > 0) {
        await createMultiplePnl({
          accountIds: selectedAccountIds,
          date: formData.date,
          amount: formData.amount,
          notes: formData.notes,
        })
      }
      // Mode simple
      else {
        await createPnl(formData)
      }

      onSuccess()
      onOpenChange(false)
    } catch (error) {
      // Les erreurs sont déjà gérées par les mutations
      console.error(error)
    }
  }

  const toggleAccountSelection = (accountId: string) => {
    setSelectedAccountIds(prev =>
      prev.includes(accountId)
        ? prev.filter(id => id !== accountId)
        : [...prev, accountId]
    )
  }

  const selectAllFiltered = () => {
    setSelectedAccountIds(filteredAccounts.map(acc => acc.id))
  }

  const deselectAll = () => {
    setSelectedAccountIds([])
  }

  // Get unique propfirms and account types
  const uniquePropfirms = Array.from(new Set(accounts.map(acc => acc.propfirm)))
  const uniqueAccountTypes = Array.from(new Set(accounts.map(acc => acc.accountType)))

  // Filter accounts
  const filteredAccounts = accounts.filter(account => {
    if (filterPropfirm !== "all" && account.propfirm !== filterPropfirm) return false
    if (filterAccountType !== "all" && account.accountType !== filterAccountType) return false
    return true
  })

  // Group accounts by propfirm and type
  const groupedAccounts = filteredAccounts.reduce((acc, account) => {
    const key = `${account.propfirm}-${account.accountType}`
    if (!acc[key]) {
      acc[key] = []
    }
    acc[key].push(account)
    return acc
  }, {} as Record<string, PropfirmAccount[]>)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-3xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">
            {entry ? "Modifier le PnL" : "Ajouter un PnL"}
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            {entry
              ? "Modifiez l'entrée PnL"
              : "Ajoutez une nouvelle entrée de profit ou perte"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-3 sm:gap-4 py-3 sm:py-4">
            {/* Mode selector */}
            {!entry && (
              <div className="flex gap-2 p-2 sm:p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
                <Button
                  type="button"
                  variant={!multipleMode ? "default" : "outline"}
                  size="sm"
                  onClick={() => setMultipleMode(false)}
                  className="flex-1 text-xs sm:text-sm"
                >
                  Compte unique
                </Button>
                <Button
                  type="button"
                  variant={multipleMode ? "default" : "outline"}
                  size="sm"
                  onClick={() => setMultipleMode(true)}
                  className="flex-1 text-xs sm:text-sm"
                >
                  Plusieurs comptes
                </Button>
              </div>
            )}

            {/* Single account selector */}
            {!entry && !multipleMode && (
              <div className="grid gap-2">
                <Label htmlFor="accountId" className="text-xs sm:text-sm">Compte *</Label>
                <Select
                  value={formData.accountId}
                  onValueChange={(value) => setFormData({ ...formData, accountId: value })}
                  required
                >
                  <SelectTrigger id="accountId">
                    <SelectValue placeholder="Sélectionner un compte" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name} - {account.propfirm} ({account.accountType})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Multiple accounts selector */}
            {!entry && multipleMode && (
              <div className="grid gap-3">
                <div className="flex items-center justify-between">
                  <Label>Comptes sélectionnés ({selectedAccountIds.length})</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={selectAllFiltered}
                      disabled={filteredAccounts.length === 0}
                    >
                      Tout sélectionner
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={deselectAll}
                      disabled={selectedAccountIds.length === 0}
                    >
                      Tout désélectionner
                    </Button>
                  </div>
                </div>

                {/* Filters */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="grid gap-1.5">
                    <Label htmlFor="filterPropfirm" className="text-xs">Propfirm</Label>
                    <Select value={filterPropfirm} onValueChange={setFilterPropfirm}>
                      <SelectTrigger id="filterPropfirm" className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Toutes</SelectItem>
                        {uniquePropfirms.map(propfirm => (
                          <SelectItem key={propfirm} value={propfirm}>
                            {propfirm}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="filterAccountType" className="text-xs">Type</Label>
                    <Select value={filterAccountType} onValueChange={setFilterAccountType}>
                      <SelectTrigger id="filterAccountType" className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tous</SelectItem>
                        {uniqueAccountTypes.map(type => (
                          <SelectItem key={type} value={type}>
                            {type === "EVAL" ? "Évaluation" : type === "FUNDED" ? "Financé" : type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Account list */}
                <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg max-h-[200px] overflow-y-auto">
                  {filteredAccounts.length === 0 ? (
                    <div className="p-4 text-center text-sm text-zinc-500">
                      Aucun compte trouvé
                    </div>
                  ) : (
                    <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
                      {Object.entries(groupedAccounts).map(([groupKey, groupAccounts]) => {
                        const [propfirm, accountType] = groupKey.split("-")
                        return (
                          <div key={groupKey}>
                            <div className="px-3 py-2 bg-zinc-50 dark:bg-zinc-900 text-xs font-medium text-zinc-600 dark:text-zinc-400 sticky top-0">
                              {propfirm} - {accountType === "EVAL" ? "Évaluation" : "Financé"}
                            </div>
                            {groupAccounts.map(account => (
                              <div
                                key={account.id}
                                className="flex items-center gap-3 px-3 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-900 cursor-pointer"
                                onClick={() => toggleAccountSelection(account.id)}
                              >
                                <div className={`w-5 h-5 rounded border flex items-center justify-center ${
                                  selectedAccountIds.includes(account.id)
                                    ? "bg-zinc-900 dark:bg-zinc-50 border-zinc-900 dark:border-zinc-50"
                                    : "border-zinc-300 dark:border-zinc-700"
                                }`}>
                                  {selectedAccountIds.includes(account.id) && (
                                    <Check className="h-3 w-3 text-white dark:text-zinc-900" />
                                  )}
                                </div>
                                <div className="flex-1">
                                  <p className="text-sm font-medium">{account.name}</p>
                                  <p className="text-xs text-zinc-500">{formatCurrency(account.size)}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="date">Date *</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>

              <div className="grid gap-2">
                <Label htmlFor="amount" className="text-xs sm:text-sm">Montant (USD) *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="500.00 (positif pour profit, négatif pour perte)"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                required
              />
              <p className="text-xs text-zinc-500">
                Utilisez un nombre positif pour un profit, négatif pour une perte
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="notes" className="text-xs sm:text-sm">Notes</Label>
              <textarea
                id="notes"
                className="flex min-h-[80px] w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-950 dark:placeholder:text-zinc-400 dark:focus-visible:ring-zinc-300"
                placeholder="Notes supplémentaires..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={isLoading || (multipleMode && selectedAccountIds.length === 0)}
            >
              {isLoading ? "En cours..." : entry ? "Mettre à jour" : multipleMode ? `Ajouter (${selectedAccountIds.length})` : "Ajouter"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

