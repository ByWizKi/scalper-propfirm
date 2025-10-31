"use client"

import { useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Edit, Trash2, TrendingUp, TrendingDown, DollarSign, Calendar, CheckCircle2 } from "lucide-react"
import { AccountFormDialog } from "@/components/account-form-dialog"
import { PnlFormDialog } from "@/components/pnl-form-dialog"
import { WithdrawalFormDialog } from "@/components/withdrawal-form-dialog"
import { MonthlyCalendar } from "@/components/monthly-calendar"
import { AccountRulesTracker } from "@/components/account-rules-tracker"
import { TradingCyclesTracker } from "@/components/trading-cycles-tracker"
import { useAccountCache } from "@/hooks/use-data-cache"
import { useDeleteAccountMutation, useUpdateAccountMutation } from "@/hooks/use-mutation"
import { format } from "date-fns"
import { fr } from "date-fns/locale"

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
  linkedEvalId?: string
  linkedEval?: {
    id: string
    name: string
    pricePaid: number
  }
  pnlEntries: Array<{
    id: string
    date: string
    amount: number
    notes?: string
  }>
  withdrawals: Array<{
    id: string
    date: string
    amount: number
    notes?: string
  }>
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

export default function AccountDetailPage() {
  const router = useRouter()
  const params = useParams()
  const accountId = params.id as string

  // Utiliser le cache avec invalidation automatique
  const { data: account, isLoading } = useAccountCache(accountId)

  // Utiliser les mutations
  const { mutate: deleteAccount } = useDeleteAccountMutation()
  const { mutate: updateAccount } = useUpdateAccountMutation()

  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [pnlDialogOpen, setPnlDialogOpen] = useState(false)
  const [withdrawalDialogOpen, setWithdrawalDialogOpen] = useState(false)
  const [isEligibleForValidation, setIsEligibleForValidation] = useState(false)

  const handleDelete = async () => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce compte ?")) {
      return
    }

    try {
      await deleteAccount(accountId)
      router.push("/dashboard/accounts")
    } catch (error) {
      // L'erreur est déjà gérée par la mutation
    }
  }

  const handleValidate = async () => {
    if (!confirm("Êtes-vous sûr de vouloir valider ce compte ? Il passera en statut VALIDATED.")) {
      return
    }

    if (!account) return

    try {
      await updateAccount({
        id: accountId,
        data: {
          ...account,
          status: "VALIDATED",
        },
      })
    } catch (error) {
      // L'erreur est déjà gérée par la mutation
    }
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-zinc-900 dark:border-zinc-50 mx-auto"></div>
          <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">Chargement...</p>
        </div>
      </div>
    )
  }

  if (!account) {
    return null
  }

  const totalPnl = account.pnlEntries.reduce((sum: number, entry) => sum + entry.amount, 0)
  const totalWithdrawals = account.withdrawals.reduce((sum: number, w) => sum + w.amount, 0)

  // Fonction pour obtenir le maxDrawdown selon la propfirm et la taille
  const getMaxDrawdown = (propfirm: string, size: number): number => {
    const drawdownConfig: Record<string, Record<number, number>> = {
      TOPSTEP: {
        50000: 2000,
        100000: 3000,
        150000: 4500,
      },
      TAKEPROFITTRADER: {
        25000: 1500,
        50000: 2000,
        75000: 2500,
        100000: 3000,
        150000: 4500,
      },
    }
    return drawdownConfig[propfirm]?.[size] || 0
  }

  // Calculer le total des dépenses (incluant le compte d'évaluation lié si applicable)
  const totalInvested = account.pricePaid + (account.linkedEval?.pricePaid || 0)

  // Statistiques de trading avancées
  const dailyPnlMap = account.pnlEntries.reduce((acc, entry) => {
    const dateKey = entry.date.split('T')[0]
    acc[dateKey] = (acc[dateKey] || 0) + entry.amount
    return acc
  }, {} as Record<string, number>)

  const dailyPnlValues = Object.values(dailyPnlMap)
  const tradingDays = dailyPnlValues.length
  const bestDay = dailyPnlValues.length > 0 ? Math.max(...dailyPnlValues) : 0
  const avgPerDay = tradingDays > 0 ? totalPnl / tradingDays : 0

  // Calculer le PnL par mois
  const monthlyPnl = account.pnlEntries.reduce((acc, entry) => {
    const date = new Date(entry.date)
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

    if (!acc[monthKey]) {
      acc[monthKey] = {
        month: monthKey,
        amount: 0,
        count: 0,
      }
    }

    acc[monthKey].amount += entry.amount
    acc[monthKey].count += 1

    return acc
  }, {} as Record<string, { month: string; amount: number; count: number }>)

  // Convertir en tableau et trier par date
  const monthlyPnlArray = Object.values(monthlyPnl).sort((a, b) =>
    b.month.localeCompare(a.month)
  )

  // Obtenir les 6 derniers mois
  const last6Months = monthlyPnlArray.slice(0, 6)

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/dashboard/accounts")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
              {account.name}
            </h1>
            <p className="text-zinc-600 dark:text-zinc-400 mt-1">
              {PROPFIRM_LABELS[account.propfirm]} • {formatCurrency(account.size)}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {account.accountType === "EVAL" && account.status === "ACTIVE" && isEligibleForValidation && (
            <Button onClick={handleValidate} className="bg-green-600 hover:bg-green-700">
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Valider le compte
            </Button>
          )}
          <Button variant="outline" onClick={() => setEditDialogOpen(true)}>
            <Edit className="h-4 w-4 mr-2" />
            Modifier
          </Button>
          <Button variant="destructive" onClick={handleDelete}>
            <Trash2 className="h-4 w-4 mr-2" />
            Supprimer
          </Button>
        </div>
      </div>

      {/* Informations du compte */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Informations du compte</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">Type</p>
              <p className="font-medium">{ACCOUNT_TYPE_LABELS[account.accountType]}</p>
            </div>
            <div>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">Statut</p>
              <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[account.status]}`}>
                {STATUS_LABELS[account.status]}
              </span>
            </div>
            <div>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                {account.linkedEval ? "Total investi" : "Prix payé"}
              </p>
              <p className="font-medium">{formatCurrency(totalInvested)}</p>
              <p className="text-xs text-zinc-500">{formatCurrencyEUR(totalInvested * USD_TO_EUR)}</p>
              {account.linkedEval && (
                <p className="text-xs text-zinc-500 mt-1">
                  Compte: {formatCurrency(account.pricePaid)} + Eval: {formatCurrency(account.linkedEval.pricePaid)}
                </p>
              )}
            </div>
            <div>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">Date de création</p>
              <p className="font-medium">
                {format(new Date(account.createdAt), "d MMM yyyy", { locale: fr })}
              </p>
            </div>
          </div>
          {account.linkedEval && (
            <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">Compte d'évaluation lié</p>
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{account.linkedEval.name}</p>
                <div className="text-right">
                  <p className="text-sm font-medium">{formatCurrency(account.linkedEval.pricePaid)}</p>
                  <p className="text-xs text-zinc-500">{formatCurrencyEUR(account.linkedEval.pricePaid * USD_TO_EUR)}</p>
                </div>
              </div>
            </div>
          )}
          {account.notes && (
            <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">Notes</p>
              <p className="text-sm">{account.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Statistiques */}
      <div className={`grid gap-6 mb-6 ${account.accountType === "EVAL" ? "md:grid-cols-3" : "md:grid-cols-2 lg:grid-cols-4"}`}>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">PnL Total</CardTitle>
            {totalPnl >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalPnl >= 0 ? "text-green-600" : "text-red-600"}`}>
              {formatCurrency(totalPnl)}
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              {tradingDays} jour{tradingDays > 1 ? "s" : ""} de trading
            </p>
          </CardContent>
        </Card>

        {account.accountType !== "EVAL" && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Retraits</CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(totalWithdrawals)}
              </div>
              <p className="text-xs text-green-600 mt-1">
                {formatCurrencyEUR(totalWithdrawals * USD_TO_EUR)}
              </p>
              <p className="text-xs text-zinc-500 mt-1">
                {account.withdrawals.length} retrait{account.withdrawals.length > 1 ? "s" : ""}
              </p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Meilleur Jour</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(bestDay)}
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              Plus haut PnL quotidien
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Moyenne/Jour</CardTitle>
            <Calendar className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${avgPerDay >= 0 ? "text-green-600" : "text-red-600"}`}>
              {formatCurrency(avgPerDay)}
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              PnL moyen par jour
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Règles de validation */}
      {account.accountType === "EVAL" && (
        <div className="mb-6">
          <AccountRulesTracker
            accountSize={account.size}
            accountType={account.accountType}
            propfirm={account.propfirm}
            pnlEntries={account.pnlEntries}
            onEligibilityChange={setIsEligibleForValidation}
          />
        </div>
      )}

      {/* Cycles de trading pour comptes financés */}
      {account.accountType === "FUNDED" && (
        <div className="mb-6">
          <TradingCyclesTracker
            pnlEntries={account.pnlEntries}
            withdrawals={account.withdrawals}
            accountSize={account.size}
            propfirm={account.propfirm}
            maxDrawdown={getMaxDrawdown(account.propfirm, account.size)}
          />
        </div>
      )}

      {/* Vue calendrier mensuelle */}
      {account.pnlEntries.length > 0 && (
        <div className="mb-6">
          <MonthlyCalendar pnlEntries={account.pnlEntries} />
        </div>
      )}

      {/* PnL et Retraits */}
      <div className={`grid gap-6 ${account.accountType === "EVAL" ? "md:grid-cols-1" : "md:grid-cols-2"}`}>
        {/* Historique PnL */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Historique PnL</CardTitle>
              <Button size="sm" onClick={() => setPnlDialogOpen(true)}>
                Ajouter
              </Button>
            </div>
            <CardDescription>
              Les dernières entrées de profit et perte
            </CardDescription>
          </CardHeader>
          <CardContent>
            {account.pnlEntries.length === 0 ? (
              <p className="text-sm text-zinc-500 text-center py-8">
                Aucune entrée PnL pour le moment
              </p>
            ) : (
              <div className="space-y-3">
                {account.pnlEntries.slice(0, 5).map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${entry.amount >= 0 ? "bg-green-100 dark:bg-green-900" : "bg-red-100 dark:bg-red-900"}`}>
                        {entry.amount >= 0 ? (
                          <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {format(new Date(entry.date), "d MMM yyyy", { locale: fr })}
                        </p>
                        {entry.notes && (
                          <p className="text-xs text-zinc-500">{entry.notes}</p>
                        )}
                      </div>
                    </div>
                    <span className={`font-bold ${entry.amount >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {entry.amount >= 0 ? "+" : ""}{formatCurrency(entry.amount)}
                    </span>
                  </div>
                ))}
                {account.pnlEntries.length > 5 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full"
                    onClick={() => router.push("/dashboard/pnl")}
                  >
                    Voir tout ({account.pnlEntries.length})
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Historique Retraits - Seulement pour les comptes financés */}
        {account.accountType !== "EVAL" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Historique Retraits</CardTitle>
              <Button size="sm" onClick={() => setWithdrawalDialogOpen(true)}>
                Ajouter
              </Button>
            </div>
            <CardDescription>
              Les derniers retraits effectués
            </CardDescription>
          </CardHeader>
          <CardContent>
            {account.withdrawals.length === 0 ? (
              <p className="text-sm text-zinc-500 text-center py-8">
                Aucun retrait pour le moment
              </p>
            ) : (
              <div className="space-y-3">
                {account.withdrawals.slice(0, 5).map((withdrawal) => {
                  // Calculer le montant net reçu (avec taxes pour TakeProfitTrader)
                  const isTakeProfitTrader = account.propfirm === "TAKEPROFITTRADER"
                  const netAmount = isTakeProfitTrader ? withdrawal.amount * 0.8 : withdrawal.amount

                  return (
                    <div
                      key={withdrawal.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900">
                          <DollarSign className="h-4 w-4 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            {format(new Date(withdrawal.date), "d MMM yyyy", { locale: fr })}
                          </p>
                          {withdrawal.notes && (
                            <p className="text-xs text-zinc-500">{withdrawal.notes}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-600">
                          {formatCurrency(withdrawal.amount)}
                        </p>
                        {isTakeProfitTrader && (
                          <p className="text-xs text-orange-600 dark:text-orange-400">
                            Net: {formatCurrency(netAmount)} (20% taxe)
                          </p>
                        )}
                        <p className="text-xs text-green-600">
                          {formatCurrencyEUR(netAmount * USD_TO_EUR)}
                        </p>
                      </div>
                    </div>
                  )
                })}
                {account.withdrawals.length > 5 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full"
                    onClick={() => router.push("/dashboard/withdrawals")}
                  >
                    Voir tout ({account.withdrawals.length})
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
        )}
      </div>

      {/* Dialogs */}
      <AccountFormDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        account={account}
        onSuccess={() => {}}
      />

      <PnlFormDialog
        open={pnlDialogOpen}
        onOpenChange={setPnlDialogOpen}
        accounts={[{ id: account.id, name: account.name, propfirm: account.propfirm, accountType: account.accountType, size: account.size }]}
        onSuccess={() => {}}
      />

      <WithdrawalFormDialog
        open={withdrawalDialogOpen}
        onOpenChange={setWithdrawalDialogOpen}
        accounts={[{ id: account.id, name: account.name, accountType: account.accountType, propfirm: account.propfirm, size: account.size }]}
        onSuccess={() => {}}
      />
    </div>
  )
}

