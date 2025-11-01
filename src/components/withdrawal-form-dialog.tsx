"use client"

import { useState, useEffect, useMemo } from "react"
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
import { useCreateWithdrawalMutation, useCreateMultipleWithdrawalsMutation } from "@/hooks/use-mutation"

interface Withdrawal {
  id: string
  accountId: string
  date: string
  amount: number
  notes?: string
}

interface PropfirmAccount {
  id: string
  name: string
  accountType: string
  propfirm: string
  size: number
}

interface WithdrawalFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  withdrawal?: Withdrawal | null
  accounts: PropfirmAccount[]
  onSuccess: () => void
}

export function WithdrawalFormDialog({
  open,
  onOpenChange,
  withdrawal,
  accounts,
  onSuccess,
}: WithdrawalFormDialogProps) {
  // Utiliser les mutations
  const { mutate: createWithdrawal, isLoading: isCreating } = useCreateWithdrawalMutation()
  const { mutate: createMultipleWithdrawals, isLoading: isCreatingMultiple } = useCreateMultipleWithdrawalsMutation()

  const [multipleMode, setMultipleMode] = useState(false)
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([])
  const [filterPropfirm, setFilterPropfirm] = useState<string>("all")
  const [formData, setFormData] = useState({
    accountId: "", // Pas de présélection par défaut
    date: new Date().toISOString().split("T")[0],
    amount: "",
    notes: "",
  })

  const isLoading = isCreating || isCreatingMultiple

  // Filtrer uniquement les comptes financés (FUNDED) avec useMemo pour éviter les recalculs
  const eligibleAccounts = useMemo(() =>
    accounts.filter(account => account.accountType === "FUNDED"),
    [accounts]
  )

  useEffect(() => {
    if (!open) return

    if (withdrawal) {
      setFormData({
        accountId: withdrawal.accountId,
        date: new Date(withdrawal.date).toISOString().split("T")[0],
        amount: withdrawal.amount.toString(),
        notes: withdrawal.notes || "",
      })
      setMultipleMode(false)
      setSelectedAccountIds([])
    } else if (eligibleAccounts.length > 0) {
      setFormData({
        accountId: eligibleAccounts[0].id,
        date: new Date().toISOString().split("T")[0],
        amount: "",
        notes: "",
      })
      setMultipleMode(false)
      setSelectedAccountIds([])
      setFilterPropfirm("all")
    } else {
      setFormData({
        accountId: "",
        date: new Date().toISOString().split("T")[0],
        amount: "",
        notes: "",
      })
      setMultipleMode(false)
      setSelectedAccountIds([])
      setFilterPropfirm("all")
    }
  }, [open, withdrawal, eligibleAccounts])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      // Mode édition (pas encore supporté par les mutations, à faire plus tard)
      if (withdrawal) {
        const response = await fetch(`/api/withdrawals/${withdrawal.id}`, {
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
        await createMultipleWithdrawals({
          accountIds: selectedAccountIds,
          date: formData.date,
          amount: formData.amount,
          notes: formData.notes,
        })
      }
      // Mode simple
      else {
        await createWithdrawal(formData)
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

  // Get unique propfirms for FUNDED accounts
  const uniquePropfirms = Array.from(new Set(eligibleAccounts.map(acc => acc.propfirm)))

  // Filter eligible accounts by propfirm
  const filteredAccounts = eligibleAccounts.filter(account => {
    if (filterPropfirm !== "all" && account.propfirm !== filterPropfirm) return false
    return true
  })

  // Group accounts by propfirm
  const groupedAccounts = filteredAccounts.reduce((acc, account) => {
    const key = account.propfirm
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
            {withdrawal ? "Modifier le retrait" : "Ajouter un retrait"}
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            {withdrawal
              ? "Modifiez le retrait"
              : "Ajoutez un nouveau retrait de fonds"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-3 sm:gap-4 py-3 sm:py-4">
            {/* Mode selector */}
            {!withdrawal && eligibleAccounts.length > 0 && (
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
            {!withdrawal && !multipleMode && (
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
                    {eligibleAccounts.length > 0 ? (
                      eligibleAccounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.name} - {account.propfirm}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="none" disabled>
                        Aucun compte financé disponible
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Multiple accounts selector */}
            {!withdrawal && multipleMode && (
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

                {/* Filter by propfirm */}
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

                {/* Account list */}
                <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg max-h-[200px] overflow-y-auto">
                  {filteredAccounts.length === 0 ? (
                    <div className="p-4 text-center text-sm text-zinc-500">
                      Aucun compte trouvé
                    </div>
                  ) : (
                    <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
                      {Object.entries(groupedAccounts).map(([propfirm, groupAccounts]) => {
                        return (
                          <div key={propfirm}>
                            <div className="px-3 py-2 bg-zinc-50 dark:bg-zinc-900 text-xs font-medium text-zinc-600 dark:text-zinc-400 sticky top-0">
                              {propfirm} - Financé
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

            {eligibleAccounts.length === 0 && !withdrawal && (
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-900 rounded-lg">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  Aucun compte financé disponible. Les retraits ne sont possibles que sur les comptes financés.
                </p>
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
                placeholder="1000.00"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                required
              />
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
              disabled={isLoading || (multipleMode && selectedAccountIds.length === 0) || (eligibleAccounts.length === 0 && !withdrawal)}
            >
              {isLoading ? "En cours..." : withdrawal ? "Mettre à jour" : multipleMode ? `Ajouter (${selectedAccountIds.length})` : "Ajouter"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

