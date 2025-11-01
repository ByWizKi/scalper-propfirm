"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { WithdrawalFormDialog } from "@/components/withdrawal-form-dialog"
import { BulkWithdrawalFormDialog } from "@/components/bulk-withdrawal-form-dialog"
import { Plus, Edit, Trash2, DollarSign, Table } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { calculateWithdrawalTax, getNetWithdrawalAmount } from "@/lib/withdrawal-utils"

interface Withdrawal {
  id: string
  accountId: string
  date: string
  amount: number
  notes?: string
  account: {
    name: string
    propfirm: string
  }
}

interface PropfirmAccount {
  id: string
  name: string
  accountType: string
  propfirm: string
  size: number
}

export default function WithdrawalsPage() {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([])
  const [accounts, setAccounts] = useState<PropfirmAccount[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false)
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<Withdrawal | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setIsLoading(true)
      const [withdrawalsRes, accountsRes] = await Promise.all([
        fetch("/api/withdrawals", { cache: "no-store" }),
        fetch("/api/accounts", { cache: "no-store" }),
      ])

      if (withdrawalsRes.ok && accountsRes.ok) {
        const withdrawalsData = await withdrawalsRes.json()
        const accountsData = await accountsRes.json()
        setWithdrawals(withdrawalsData)
        setAccounts(accountsData)
      }
    } catch (error) {
      console.error("Erreur lors du chargement des données:", error)
      toast({
        title: "Erreur",
        description: "Impossible de charger les données",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce retrait ?")) {
      return
    }

    try {
      const response = await fetch(`/api/withdrawals/${id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast({
          title: "Retrait supprimé",
          description: "Le retrait a été supprimé avec succès",
        })
        fetchData()
      } else {
        throw new Error("Erreur lors de la suppression")
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le retrait",
        variant: "destructive",
      })
    }
  }

  const handleEdit = (withdrawal: Withdrawal) => {
    setSelectedWithdrawal(withdrawal)
    setDialogOpen(true)
  }

  const handleAdd = () => {
    setSelectedWithdrawal(null)
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

  const formatCurrencyEUR = (amount: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
    }).format(amount)
  }

  // Taux de change USD vers EUR (à ajuster selon vos besoins)
  const USD_TO_EUR = 0.92

  // Calculer le total brut et net des retraits
  const totalWithdrawals = withdrawals.reduce((sum, w) => sum + w.amount, 0)
  const totalNetWithdrawals = withdrawals.reduce((sum, w) => {
    return sum + getNetWithdrawalAmount(w.amount, w.account.propfirm)
  }, 0)

  // Regrouper les retraits par compte
  const withdrawalsByAccount = withdrawals.reduce(
    (acc, withdrawal) => {
      const accountId = withdrawal.accountId
      if (!acc[accountId]) {
        acc[accountId] = {
          accountName: withdrawal.account.name,
          propfirm: withdrawal.account.propfirm,
          withdrawals: [],
          totalGross: 0,
          totalNet: 0,
        }
      }
      acc[accountId].withdrawals.push(withdrawal)
      acc[accountId].totalGross += withdrawal.amount
      acc[accountId].totalNet += getNetWithdrawalAmount(
        withdrawal.amount,
        withdrawal.account.propfirm
      )
      return acc
    },
    {} as Record<
      string,
      {
        accountName: string
        propfirm: string
        withdrawals: Withdrawal[]
        totalGross: number
        totalNet: number
      }
    >
  )

  // Trier les retraits dans chaque compte par date (plus récent en premier)
  Object.values(withdrawalsByAccount).forEach((account) => {
    account.withdrawals.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-zinc-900 dark:border-zinc-50 mx-auto"></div>
          <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
            Chargement des retraits...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-50">
            Retraits
          </h1>
          <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 mt-1 sm:mt-2">
            Suivez vos retraits de fonds
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button onClick={handleAdd} disabled={accounts.length === 0} className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            <span>Ajouter un retrait</span>
          </Button>
          <Button
            onClick={handleBulkAdd}
            disabled={accounts.length === 0}
            variant="outline"
            className="w-full sm:w-auto"
          >
            <Table className="h-4 w-4 mr-2" />
            <span>Ajout groupé</span>
          </Button>
        </div>
      </div>

      {accounts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Vous devez d&apos;abord créer un compte avant d&apos;ajouter des retraits
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="mb-4 sm:mb-6">
            <CardContent className="pt-4 sm:pt-6">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mb-1">
                    Total des retraits
                  </p>
                  <div className="flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-3">
                    <div className="min-w-0">
                      <p className="text-2xl sm:text-3xl font-bold text-green-600 truncate">
                        {formatCurrency(totalWithdrawals)}
                      </p>
                      <p className="text-xs sm:text-sm text-green-600 mt-1">
                        {formatCurrencyEUR(totalWithdrawals * USD_TO_EUR)}
                      </p>
                    </div>
                    {totalNetWithdrawals !== totalWithdrawals && (
                      <div className="border-t sm:border-t-0 sm:border-l border-zinc-300 dark:border-zinc-700 pt-2 sm:pt-0 sm:pl-3">
                        <p className="text-[10px] sm:text-xs text-zinc-500 mb-1">Net reçu</p>
                        <p className="text-lg sm:text-xl font-bold text-orange-600 truncate">
                          {formatCurrency(totalNetWithdrawals)}
                        </p>
                        <p className="text-[10px] sm:text-xs text-orange-600 mt-1">
                          {formatCurrencyEUR(totalNetWithdrawals * USD_TO_EUR)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                <DollarSign className="h-8 w-8 sm:h-12 sm:w-12 text-green-600 flex-shrink-0" />
              </div>
            </CardContent>
          </Card>

          {withdrawals.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <DollarSign className="h-12 w-12 text-zinc-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Aucun retrait</h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
                  Commencez par ajouter votre premier retrait
                </p>
                <Button onClick={handleAdd}>
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter un retrait
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {Object.entries(withdrawalsByAccount).map(([accountId, accountData]) => (
                <Card key={accountId}>
                  <CardContent className="p-0">
                    {/* En-tête du compte */}
                    <div className="flex items-center justify-between gap-3 p-3 sm:p-4 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-base sm:text-lg truncate">
                          {accountData.accountName}
                        </h3>
                        <p className="text-xs sm:text-sm text-zinc-500">
                          {accountData.withdrawals.length} retrait
                          {accountData.withdrawals.length > 1 ? "s" : ""}
                        </p>
                      </div>
                      <div className="text-right min-w-0">
                        <p className="text-[10px] sm:text-xs text-zinc-500 mb-1">Total</p>
                        <p className="text-base sm:text-xl font-bold text-green-600 truncate">
                          +{formatCurrency(accountData.totalGross)}
                        </p>
                        {accountData.totalNet !== accountData.totalGross && (
                          <p className="text-xs sm:text-sm text-orange-600 truncate">
                            Net: {formatCurrency(accountData.totalNet)}
                          </p>
                        )}
                        <p className="text-[10px] sm:text-xs text-green-600 truncate">
                          {formatCurrencyEUR(accountData.totalNet * USD_TO_EUR)}
                        </p>
                      </div>
                    </div>

                    {/* Retraits du compte */}
                    <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
                      {accountData.withdrawals.map((withdrawal) => {
                        const taxInfo = calculateWithdrawalTax(
                          withdrawal.amount,
                          accountData.propfirm
                        )

                        return (
                          <div
                            key={withdrawal.id}
                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-4 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
                          >
                            <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                              <div className="p-1.5 sm:p-2 rounded-lg bg-green-100 dark:bg-green-900 flex-shrink-0">
                                <DollarSign className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-600 dark:text-green-400" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs sm:text-sm text-zinc-500 truncate">
                                  {format(new Date(withdrawal.date), "d MMMM yyyy", { locale: fr })}
                                </p>
                                {withdrawal.notes && (
                                  <p className="text-[10px] sm:text-xs text-zinc-500 mt-1 line-clamp-1">
                                    {withdrawal.notes}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-4">
                              <div className="text-right min-w-0">
                                <p className="text-base sm:text-lg font-bold text-green-600 truncate">
                                  {formatCurrency(withdrawal.amount)}
                                </p>
                                {taxInfo.hasTax && (
                                  <p className="text-[10px] sm:text-xs text-orange-600 dark:text-orange-400 truncate">
                                    Net: {formatCurrency(taxInfo.netAmount)} (
                                    {(taxInfo.taxRate * 100).toFixed(0)}% taxe)
                                  </p>
                                )}
                                <p className="text-[10px] sm:text-xs text-green-600 truncate">
                                  {formatCurrencyEUR(taxInfo.netAmount * USD_TO_EUR)}
                                </p>
                              </div>
                              <div className="flex gap-1 flex-shrink-0">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleEdit(withdrawal)}
                                >
                                  <Edit className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleDelete(withdrawal.id)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      <WithdrawalFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        withdrawal={selectedWithdrawal}
        accounts={accounts}
        onSuccess={fetchData}
      />

      <BulkWithdrawalFormDialog
        open={bulkDialogOpen}
        onOpenChange={setBulkDialogOpen}
        accounts={accounts}
        onSuccess={fetchData}
      />
    </div>
  )
}
