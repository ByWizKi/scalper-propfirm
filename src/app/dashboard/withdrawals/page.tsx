"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { WithdrawalFormDialog } from "@/components/withdrawal-form-dialog"
import { Plus, Edit, Trash2, DollarSign } from "lucide-react"
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
  const withdrawalsByAccount = withdrawals.reduce((acc, withdrawal) => {
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
    acc[accountId].totalNet += getNetWithdrawalAmount(withdrawal.amount, withdrawal.account.propfirm)
    return acc
  }, {} as Record<string, { accountName: string; propfirm: string; withdrawals: Withdrawal[]; totalGross: number; totalNet: number }>)

  // Trier les retraits dans chaque compte par date (plus récent en premier)
  Object.values(withdrawalsByAccount).forEach(account => {
    account.withdrawals.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-zinc-900 dark:border-zinc-50 mx-auto"></div>
          <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">Chargement des retraits...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">Retraits</h1>
          <p className="text-zinc-600 dark:text-zinc-400 mt-2">
            Suivez vos retraits de fonds
          </p>
        </div>
        <Button onClick={handleAdd} disabled={accounts.length === 0}>
          <Plus className="h-4 w-4 mr-2" />
          Ajouter un retrait
        </Button>
      </div>

      {accounts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Vous devez d'abord créer un compte avant d'ajouter des retraits
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">Total des retraits</p>
                  <div className="flex items-baseline gap-3">
                    <div>
                      <p className="text-3xl font-bold text-green-600">
                        {formatCurrency(totalWithdrawals)}
                      </p>
                      <p className="text-sm text-green-600 mt-1">
                        {formatCurrencyEUR(totalWithdrawals * USD_TO_EUR)}
                      </p>
                    </div>
                    {totalNetWithdrawals !== totalWithdrawals && (
                      <div className="border-l border-zinc-300 dark:border-zinc-700 pl-3">
                        <p className="text-xs text-zinc-500 mb-1">Net reçu</p>
                        <p className="text-xl font-bold text-orange-600">
                          {formatCurrency(totalNetWithdrawals)}
                        </p>
                        <p className="text-xs text-orange-600 mt-1">
                          {formatCurrencyEUR(totalNetWithdrawals * USD_TO_EUR)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                <DollarSign className="h-12 w-12 text-green-600" />
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
            <div className="space-y-4">
              {Object.entries(withdrawalsByAccount).map(([accountId, accountData]) => (
                <Card key={accountId}>
                  <CardContent className="p-0">
                    {/* En-tête du compte */}
                    <div className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
                      <div>
                        <h3 className="font-semibold text-lg">{accountData.accountName}</h3>
                        <p className="text-sm text-zinc-500">
                          {accountData.withdrawals.length} retrait{accountData.withdrawals.length > 1 ? "s" : ""}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-zinc-500 mb-1">Total du compte</p>
                        <p className="text-xl font-bold text-green-600">
                          +{formatCurrency(accountData.totalGross)}
                        </p>
                        {accountData.totalNet !== accountData.totalGross && (
                          <p className="text-sm text-orange-600">
                            Net: {formatCurrency(accountData.totalNet)}
                          </p>
                        )}
                        <p className="text-xs text-green-600">
                          {formatCurrencyEUR(accountData.totalNet * USD_TO_EUR)}
                        </p>
                      </div>
                    </div>

                    {/* Retraits du compte */}
                    <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
                      {accountData.withdrawals.map((withdrawal) => {
                        const taxInfo = calculateWithdrawalTax(withdrawal.amount, accountData.propfirm)

                        return (
                          <div
                            key={withdrawal.id}
                            className="flex items-center justify-between p-4 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900">
                                  <DollarSign className="h-4 w-4 text-green-600 dark:text-green-400" />
                                </div>
                                <div className="flex-1">
                                  <p className="text-sm text-zinc-500">
                                    {format(new Date(withdrawal.date), "d MMMM yyyy", { locale: fr })}
                                  </p>
                                  {withdrawal.notes && (
                                    <p className="text-xs text-zinc-500 mt-1">{withdrawal.notes}</p>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <p className="text-lg font-bold text-green-600">
                                  {formatCurrency(withdrawal.amount)}
                                </p>
                                {taxInfo.hasTax && (
                                  <p className="text-xs text-orange-600 dark:text-orange-400">
                                    Net: {formatCurrency(taxInfo.netAmount)} ({(taxInfo.taxRate * 100).toFixed(0)}% taxe)
                                  </p>
                                )}
                                <p className="text-xs text-green-600">
                                  {formatCurrencyEUR(taxInfo.netAmount * USD_TO_EUR)}
                                </p>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEdit(withdrawal)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDelete(withdrawal.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
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
    </div>
  )
}

