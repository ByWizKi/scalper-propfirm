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
import { Check, Maximize2, AlertCircle } from "lucide-react"
import {
  useCreateWithdrawalMutation,
  useCreateMultipleWithdrawalsMutation,
} from "@/hooks/use-mutation"
import { PropfirmStrategyFactory } from "@/lib/strategies/propfirm-strategy.factory"

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
  status?: string
  notes?: string | null
}

interface AccountData {
  id: string
  name: string
  accountType: string
  propfirm: string
  size: number
  notes?: string | null
  pnlEntries: Array<{ date: string; amount: number }>
  withdrawals: Array<{ amount: number }>
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
  const { mutate: createMultipleWithdrawals, isLoading: isCreatingMultiple } =
    useCreateMultipleWithdrawalsMutation()

  const [multipleMode, setMultipleMode] = useState(false)
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([])
  const [filterPropfirm, setFilterPropfirm] = useState<string>("all")
  const [includeTax, setIncludeTax] = useState(true) // Par défaut, le montant inclut les taxes (comportement actuel)
  const [multipleIncludeTax, setMultipleIncludeTax] = useState(true) // Pour le mode multiple
  const [formData, setFormData] = useState({
    accountId: "", // Pas de présélection par défaut
    date: new Date().toISOString().split("T")[0],
    amount: "",
    notes: "",
  })
  const [accountData, setAccountData] = useState<AccountData | null>(null)
  const [isLoadingAccount, setIsLoadingAccount] = useState(false)
  const [maxAvailableAmount, setMaxAvailableAmount] = useState<number | null>(null)

  const isLoading = isCreating || isCreatingMultiple || isLoadingAccount

  // Filtrer uniquement les comptes financés (FUNDED) et actifs (ACTIVE) avec useMemo pour éviter les recalculs
  const eligibleAccounts = useMemo(
    () =>
      accounts.filter(
        (account) => account.accountType === "FUNDED" && account.status === "ACTIVE"
      ),
    [accounts]
  )

  // Fonction pour charger les données du compte et calculer le montant maximum disponible
  const loadAccountData = async (accountId: string) => {
    if (!accountId) {
      setAccountData(null)
      setMaxAvailableAmount(null)
      return
    }

    setIsLoadingAccount(true)
    try {
      const response = await fetch(`/api/accounts/${accountId}`)
      if (response.ok) {
        const data: AccountData = await response.json()
        setAccountData(data)

        // Calculer le montant maximum disponible avec la stratégie
        const strategy = PropfirmStrategyFactory.getStrategy(data.propfirm)
        const totalPnl = data.pnlEntries.reduce((sum, entry) => sum + entry.amount, 0)
        const totalWithdrawals = data.withdrawals.reduce((sum, w) => sum + w.amount, 0)
        const normalizedPnlEntries = data.pnlEntries.map((entry) => ({
          date: new Date(entry.date),
          amount: entry.amount,
        }))

        const available = strategy.calculateAvailableForWithdrawal(
          data.size,
          totalPnl,
          totalWithdrawals,
          normalizedPnlEntries,
          data.accountType,
          data.name,
          data.notes
        )

        setMaxAvailableAmount(available)
      } else {
        setAccountData(null)
        setMaxAvailableAmount(null)
      }
    } catch (error) {
      console.error("Erreur lors du chargement des données du compte:", error)
      setAccountData(null)
      setMaxAvailableAmount(null)
    } finally {
      setIsLoadingAccount(false)
    }
  }

  useEffect(() => {
    if (!open) {
      setAccountData(null)
      setMaxAvailableAmount(null)
      return
    }

    if (withdrawal) {
      setFormData({
        accountId: withdrawal.accountId,
        date: new Date(withdrawal.date).toISOString().split("T")[0],
        amount: withdrawal.amount.toString(),
        notes: withdrawal.notes || "",
      })
      setMultipleMode(false)
      setSelectedAccountIds([])
      setIncludeTax(true) // Par défaut, on suppose que les montants existants incluent les taxes
      loadAccountData(withdrawal.accountId)
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
      setIncludeTax(true)
      setMultipleIncludeTax(true)
      loadAccountData(eligibleAccounts[0].id)
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
      setIncludeTax(true)
      setMultipleIncludeTax(true)
      setAccountData(null)
      setMaxAvailableAmount(null)
    }
  }, [open, withdrawal, eligibleAccounts])

  // Recharger les données quand le compte sélectionné change
  useEffect(() => {
    if (!multipleMode && formData.accountId && open) {
      loadAccountData(formData.accountId)
    }
  }, [formData.accountId, multipleMode, open])

  // Fonction pour calculer le montant brut à enregistrer
  const calculateGrossAmount = (
    amount: string,
    propfirm: string,
    includeTaxes: boolean
  ): number => {
    const amountNum = parseFloat(amount)
    if (isNaN(amountNum) || amountNum <= 0) return parseFloat(amount) || 0

    // Pour TakeProfitTrader uniquement
    if (propfirm === "TAKEPROFITTRADER") {
      // Si includeTaxes = false, le montant entré est net, on doit convertir en brut
      if (!includeTaxes) {
        // net = brut * 0.8, donc brut = net / 0.8
        return amountNum / 0.8
      }
      // Si includeTaxes = true, le montant entré est déjà brut
    }
    // Pour les autres propfirms, pas de conversion
    return amountNum
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      // Mode édition (pas encore supporté par les mutations, à faire plus tard)
      if (withdrawal) {
        const account = accounts.find((acc) => acc.id === formData.accountId)
        const grossAmount = calculateGrossAmount(
          formData.amount,
          account?.propfirm || "",
          includeTax
        )

        const response = await fetch(`/api/withdrawals/${withdrawal.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...formData,
            amount: grossAmount,
          }),
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.message)
        }
      }
      // Mode multiple
      else if (multipleMode && selectedAccountIds.length > 0) {
        // Pour le mode multiple, on applique le même calcul à tous les comptes TakeProfitTrader
        const selectedAccounts = eligibleAccounts.filter((acc) =>
          selectedAccountIds.includes(acc.id)
        )
        const hasTakeProfitTrader = selectedAccounts.some(
          (acc) => acc.propfirm === "TAKEPROFITTRADER"
        )

        let amountToSend: number = parseFloat(formData.amount) || 0
        if (hasTakeProfitTrader && !multipleIncludeTax) {
          // Si au moins un compte est TakeProfitTrader et que le montant est net, convertir en brut
          amountToSend = calculateGrossAmount(formData.amount, "TAKEPROFITTRADER", false)
        }

        await createMultipleWithdrawals({
          accountIds: selectedAccountIds,
          date: formData.date,
          amount: amountToSend.toString(),
          notes: formData.notes,
        })
      }
      // Mode simple
      else {
        const account = eligibleAccounts.find((acc) => acc.id === formData.accountId)
        const grossAmount = calculateGrossAmount(
          formData.amount,
          account?.propfirm || "",
          includeTax
        )

        await createWithdrawal({
          ...formData,
          amount: grossAmount,
        })
      }

      onSuccess()
      onOpenChange(false)
    } catch (_error) {
      // Les erreurs sont déjà gérées par les mutations
      console.error(_error)
    }
  }

  const toggleAccountSelection = (accountId: string) => {
    setSelectedAccountIds((prev) =>
      prev.includes(accountId) ? prev.filter((id) => id !== accountId) : [...prev, accountId]
    )
  }

  const selectAllFiltered = () => {
    setSelectedAccountIds(filteredAccounts.map((acc) => acc.id))
  }

  const deselectAll = () => {
    setSelectedAccountIds([])
  }

  // Get unique propfirms for FUNDED accounts
  const uniquePropfirms = Array.from(new Set(eligibleAccounts.map((acc) => acc.propfirm)))

  // Filter eligible accounts by propfirm
  const filteredAccounts = eligibleAccounts.filter((account) => {
    if (filterPropfirm !== "all" && account.propfirm !== filterPropfirm) return false
    return true
  })

  // Group accounts by propfirm
  const groupedAccounts = filteredAccounts.reduce(
    (acc, account) => {
      const key = account.propfirm
      if (!acc[key]) {
        acc[key] = []
      }
      acc[key].push(account)
      return acc
    },
    {} as Record<string, PropfirmAccount[]>
  )

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
            {withdrawal ? "Modifiez le retrait" : "Ajoutez un nouveau retrait de fonds"}
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
                <Label htmlFor="accountId" className="text-xs sm:text-sm">
                  Compte *
                </Label>
                <Select
                  value={formData.accountId}
                  onValueChange={(value) => {
                    setFormData({ ...formData, accountId: value, amount: "" })
                    loadAccountData(value)
                  }}
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
                  <Label htmlFor="filterPropfirm" className="text-xs">
                    Propfirm
                  </Label>
                  <Select value={filterPropfirm} onValueChange={setFilterPropfirm}>
                    <SelectTrigger id="filterPropfirm" className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toutes</SelectItem>
                      {uniquePropfirms.map((propfirm) => (
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
                    <div className="p-4 text-center text-sm text-zinc-500">Aucun compte trouvé</div>
                  ) : (
                    <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
                      {Object.entries(groupedAccounts).map(([propfirm, groupAccounts]) => {
                        return (
                          <div key={propfirm}>
                            <div className="px-3 py-2 bg-zinc-50 dark:bg-zinc-900 text-xs font-medium text-zinc-600 dark:text-zinc-400 sticky top-0">
                              {propfirm} - Financé
                            </div>
                            {groupAccounts.map((account) => (
                              <div
                                key={account.id}
                                className="flex items-center gap-3 px-3 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-900 cursor-pointer"
                                onClick={() => toggleAccountSelection(account.id)}
                              >
                                <div
                                  className={`w-5 h-5 rounded border flex items-center justify-center ${
                                    selectedAccountIds.includes(account.id)
                                      ? "bg-zinc-900 dark:bg-zinc-50 border-zinc-900 dark:border-zinc-50"
                                      : "border-zinc-300 dark:border-zinc-700"
                                  }`}
                                >
                                  {selectedAccountIds.includes(account.id) && (
                                    <Check className="h-3 w-3 text-white dark:text-zinc-900" />
                                  )}
                                </div>
                                <div className="flex-1">
                                  <p className="text-sm font-medium">{account.name}</p>
                                  <p className="text-xs text-zinc-500">
                                    {formatCurrency(account.size)}
                                  </p>
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
                  Aucun compte financé et actif disponible. Les retraits ne sont possibles que sur
                  les comptes financés avec le statut ACTIVE.
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
              <div className="flex items-center justify-between">
                <Label htmlFor="amount" className="text-xs sm:text-sm">
                  Montant (USD) *
                </Label>
                {!multipleMode && maxAvailableAmount !== null && maxAvailableAmount > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const account = eligibleAccounts.find((acc) => acc.id === formData.accountId)
                      if (account && maxAvailableAmount > 0) {
                        // Pour TakeProfitTrader, si includeTax est false, on doit convertir le montant net en brut
                        let amountToSet = maxAvailableAmount.toString()
                        if (account.propfirm === "TAKEPROFITTRADER" && !includeTax) {
                          // Le montant disponible est brut, on doit le convertir en net pour l'affichage
                          amountToSet = (maxAvailableAmount * 0.8).toString()
                        }
                        setFormData({ ...formData, amount: amountToSet })
                      }
                    }}
                    className="h-7 text-xs gap-1"
                    title={`Définir le montant maximum disponible: ${formatCurrency(maxAvailableAmount)}`}
                  >
                    <Maximize2 className="h-3 w-3" />
                    Max ({formatCurrency(maxAvailableAmount)})
                  </Button>
                )}
              </div>
              <div className="relative">
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  placeholder="1000.00"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  required
                  className={(() => {
                    if (!multipleMode && maxAvailableAmount !== null && formData.amount) {
                      const amountNum = parseFloat(formData.amount)
                      const account = eligibleAccounts.find((acc) => acc.id === formData.accountId)
                      if (account) {
                        // Pour TakeProfitTrader, convertir en brut pour la comparaison
                        let amountToCompare = amountNum
                        if (account.propfirm === "TAKEPROFITTRADER" && !includeTax) {
                          amountToCompare = amountNum / 0.8
                        }
                        if (amountToCompare > maxAvailableAmount) {
                          return "border-red-500 focus-visible:ring-red-500"
                        }
                      }
                    }
                    return ""
                  })()}
                />
                {!multipleMode && maxAvailableAmount !== null && formData.amount && (() => {
                  const amountNum = parseFloat(formData.amount)
                  if (isNaN(amountNum)) return null
                  const account = eligibleAccounts.find((acc) => acc.id === formData.accountId)
                  if (!account) return null

                  // Pour TakeProfitTrader, convertir en brut pour la comparaison
                  let amountToCompare = amountNum
                  if (account.propfirm === "TAKEPROFITTRADER" && !includeTax) {
                    amountToCompare = amountNum / 0.8
                  }

                  if (amountToCompare > maxAvailableAmount) {
                    return (
                      <div className="flex items-center gap-1 mt-1 text-xs text-red-600 dark:text-red-400">
                        <AlertCircle className="h-3 w-3" />
                        <span>
                          Montant maximum disponible : {formatCurrency(maxAvailableAmount)}
                        </span>
                      </div>
                    )
                  }
                  return null
                })()}
              </div>
              {!multipleMode && maxAvailableAmount !== null && (
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Disponible : {formatCurrency(maxAvailableAmount)}
                </p>
              )}
              {/* Option pour TakeProfitTrader : inclure ou non les 20% */}
              {!withdrawal &&
                (() => {
                  // Mode simple : vérifier le compte sélectionné
                  if (!multipleMode) {
                    const selectedAccount = eligibleAccounts.find(
                      (acc) => acc.id === formData.accountId
                    )
                    if (selectedAccount?.propfirm === "TAKEPROFITTRADER") {
                      const amountNum = parseFloat(formData.amount) || 0
                      const netAmount = includeTax ? amountNum * 0.8 : amountNum
                      const grossAmount = includeTax ? amountNum : amountNum / 0.8

                      return (
                        <div className="space-y-2 p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id="includeTax"
                              checked={includeTax}
                              onChange={(e) => setIncludeTax(e.target.checked)}
                              className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-700"
                            />
                            <Label
                              htmlFor="includeTax"
                              className="text-xs sm:text-sm font-normal cursor-pointer"
                            >
                              Montant inclut les 20% de taxes
                            </Label>
                          </div>
                          {formData.amount && !isNaN(amountNum) && amountNum > 0 && (
                            <div className="text-xs text-zinc-600 dark:text-zinc-400 pl-6">
                              {includeTax ? (
                                <>
                                  Montant brut (déduit du compte) :{" "}
                                  <span className="font-medium">{formatCurrency(grossAmount)}</span>
                                  <br />
                                  Montant net (reçu) :{" "}
                                  <span className="font-medium">{formatCurrency(netAmount)}</span>
                                </>
                              ) : (
                                <>
                                  Montant net (entré) :{" "}
                                  <span className="font-medium">{formatCurrency(netAmount)}</span>
                                  <br />
                                  Montant brut (déduit du compte) :{" "}
                                  <span className="font-medium">{formatCurrency(grossAmount)}</span>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    }
                  }
                  // Mode multiple : vérifier si au moins un compte TakeProfitTrader est sélectionné
                  else if (multipleMode && selectedAccountIds.length > 0) {
                    const selectedAccounts = eligibleAccounts.filter((acc) =>
                      selectedAccountIds.includes(acc.id)
                    )
                    const hasTakeProfitTrader = selectedAccounts.some(
                      (acc) => acc.propfirm === "TAKEPROFITTRADER"
                    )

                    if (hasTakeProfitTrader) {
                      const amountNum = parseFloat(formData.amount) || 0
                      const netAmount = multipleIncludeTax ? amountNum * 0.8 : amountNum
                      const grossAmount = multipleIncludeTax ? amountNum : amountNum / 0.8

                      return (
                        <div className="space-y-2 p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id="multipleIncludeTax"
                              checked={multipleIncludeTax}
                              onChange={(e) => setMultipleIncludeTax(e.target.checked)}
                              className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-700"
                            />
                            <Label
                              htmlFor="multipleIncludeTax"
                              className="text-xs sm:text-sm font-normal cursor-pointer"
                            >
                              Montant inclut les 20% de taxes (pour les comptes TakeProfitTrader)
                            </Label>
                          </div>
                          {formData.amount && !isNaN(amountNum) && amountNum > 0 && (
                            <div className="text-xs text-zinc-600 dark:text-zinc-400 pl-6">
                              {multipleIncludeTax ? (
                                <>
                                  Montant brut (déduit du compte) :{" "}
                                  <span className="font-medium">{formatCurrency(grossAmount)}</span>
                                  <br />
                                  Montant net (reçu) :{" "}
                                  <span className="font-medium">{formatCurrency(netAmount)}</span>
                                </>
                              ) : (
                                <>
                                  Montant net (entré) :{" "}
                                  <span className="font-medium">{formatCurrency(netAmount)}</span>
                                  <br />
                                  Montant brut (déduit du compte) :{" "}
                                  <span className="font-medium">{formatCurrency(grossAmount)}</span>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    }
                  }
                  return null
                })()}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="notes" className="text-xs sm:text-sm">
                Notes
              </Label>
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
              disabled={
                isLoading ||
                (multipleMode && selectedAccountIds.length === 0) ||
                (eligibleAccounts.length === 0 && !withdrawal)
              }
            >
              {isLoading
                ? "En cours..."
                : withdrawal
                  ? "Mettre à jour"
                  : multipleMode
                    ? `Ajouter (${selectedAccountIds.length})`
                    : "Ajouter"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
