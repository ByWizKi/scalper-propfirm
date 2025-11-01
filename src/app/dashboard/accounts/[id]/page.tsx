/* eslint-disable */
"use client"

import { useState, useMemo, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import dynamic from "next/dynamic"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ArrowLeft,
  Edit,
  Trash2,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  CheckCircle2,
} from "lucide-react"
import { StatCard, useStatVariant } from "@/components/stat-card"
import { useAccountCache } from "@/hooks/use-data-cache"
import { useDeleteAccountMutation, useUpdateAccountMutation } from "@/hooks/use-mutation"
import { format } from "date-fns"
import { fr } from "date-fns/locale"

// ⚡ CODE SPLITTING: Lazy load dialogs (opened on user action)
const AccountFormDialog = dynamic(() =>
  import("@/components/account-form-dialog").then((m) => ({ default: m.AccountFormDialog }))
)
const PnlFormDialog = dynamic(() =>
  import("@/components/pnl-form-dialog").then((m) => ({ default: m.PnlFormDialog }))
)
const WithdrawalFormDialog = dynamic(() =>
  import("@/components/withdrawal-form-dialog").then((m) => ({ default: m.WithdrawalFormDialog }))
)

// ⚡ CODE SPLITTING: Lazy load heavy components
const MonthlyCalendar = dynamic(() =>
  import("@/components/monthly-calendar").then((m) => ({ default: m.MonthlyCalendar }))
)
const AccountRulesTracker = dynamic(() =>
  import("@/components/account-rules-tracker").then((m) => ({ default: m.AccountRulesTracker }))
)
const TradingCyclesTracker = dynamic(() =>
  import("@/components/trading-cycles-tracker").then((m) => ({ default: m.TradingCyclesTracker }))
)

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
  const [selectedPnl, setSelectedPnl] = useState<{
    id: string
    date: string
    amount: number
    notes?: string
    accountId: string
  } | null>(null)
  const [withdrawalDialogOpen, setWithdrawalDialogOpen] = useState(false)
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<{
    id: string
    date: string
    amount: number
    notes?: string
    accountId: string
  } | null>(null)
  const [isEligibleForValidation, setIsEligibleForValidation] = useState(false)

  const handleDelete = async () => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce compte ?")) {
      return
    }

    try {
      await deleteAccount(accountId)
      router.push("/dashboard/accounts")
    } catch (_error) {
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
    } catch (_error) {
      // L'erreur est déjà gérée par la mutation
    }
  }

  // ⚡ MEMOIZATION: Format functions
  const formatCurrency = useCallback((amount: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }, [])

  const formatCurrencyEUR = useCallback((amount: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
    }).format(amount)
  }, [])

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

  // ⚡ MEMOIZATION: Heavy calculations
  const totalPnl = useMemo(
    () =>
      account.pnlEntries.reduce((sum: number, entry: { amount: number }) => sum + entry.amount, 0),
    [account.pnlEntries]
  )

  const totalWithdrawals = useMemo(
    () => account.withdrawals.reduce((sum: number, w: { amount: number }) => sum + w.amount, 0),
    [account.withdrawals]
  )

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
  const dailyPnlMap = account.pnlEntries.reduce(
    (acc: Record<string, number>, entry: { date: string; amount: number }) => {
      const dateKey = entry.date.split("T")[0]
      acc[dateKey] = (acc[dateKey] || 0) + entry.amount
      return acc
    },
    {} as Record<string, number>
  )

  const dailyPnlValues = Object.values(dailyPnlMap) as number[]
  const tradingDays = dailyPnlValues.length
  const bestDay = dailyPnlValues.length > 0 ? Math.max(...dailyPnlValues) : 0
  const avgPerDay = tradingDays > 0 ? totalPnl / tradingDays : 0

  // Calculer le PnL par mois
  const monthlyPnl = account.pnlEntries.reduce(
    (
      acc: Record<string, { month: string; amount: number; count: number }>,
      entry: { date: string; amount: number }
    ) => {
      const date = new Date(entry.date)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`

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
    },
    {} as Record<string, { month: string; amount: number; count: number }>
  )

  // Convertir en tableau et trier par date
  const monthlyPnlArray = (
    Object.values(monthlyPnl) as Array<{ month: string; amount: number; count: number }>
  ).sort((a, b) => b.month.localeCompare(a.month))

  // Obtenir les 6 derniers mois
  const _last6Months = monthlyPnlArray.slice(0, 6)

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/dashboard/accounts")}
            className="flex-shrink-0"
          >
            <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-zinc-900 dark:text-zinc-50 truncate">
              {account.name}
            </h1>
            <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 mt-1 truncate">
              {PROPFIRM_LABELS[account.propfirm]} • {formatCurrency(account.size)}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {account.accountType === "EVAL" &&
            account.status === "ACTIVE" &&
            isEligibleForValidation && (
              <Button onClick={handleValidate} className="bg-green-600 hover:bg-green-700 text-sm">
                <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2" />
                <span className="hidden sm:inline">Valider le compte</span>
                <span className="sm:hidden">Valider</span>
              </Button>
            )}
          <Button variant="outline" onClick={() => setEditDialogOpen(true)} className="text-sm">
            <Edit className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2" />
            <span className="hidden sm:inline">Modifier</span>
            <span className="sm:hidden">Éditer</span>
          </Button>
          <Button variant="destructive" onClick={handleDelete} className="text-sm">
            <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2" />
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
              <span
                className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[account.status]}`}
              >
                {STATUS_LABELS[account.status]}
              </span>
            </div>
            <div>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                {account.linkedEval ? "Total investi" : "Prix payé"}
              </p>
              <p className="font-medium">{formatCurrency(totalInvested)}</p>
              <p className="text-xs text-zinc-500">
                {formatCurrencyEUR(totalInvested * USD_TO_EUR)}
              </p>
              {account.linkedEval && (
                <p className="text-xs text-zinc-500 mt-1">
                  Compte: {formatCurrency(account.pricePaid)} + Eval:{" "}
                  {formatCurrency(account.linkedEval.pricePaid)}
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
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">
                Compte d&apos;évaluation lié
              </p>
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{account.linkedEval.name}</p>
                <div className="text-right">
                  <p className="text-sm font-medium">
                    {formatCurrency(account.linkedEval.pricePaid)}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {formatCurrencyEUR(account.linkedEval.pricePaid * USD_TO_EUR)}
                  </p>
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
      <div
        className={`grid gap-4 sm:gap-6 mb-4 sm:mb-6 ${account.accountType === "EVAL" ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"}`}
      >
        <StatCard
          title="PnL Total"
          value={formatCurrency(totalPnl)}
          icon={totalPnl >= 0 ? TrendingUp : TrendingDown}
          variant={useStatVariant(totalPnl)}
          description={`${tradingDays} jour${tradingDays > 1 ? "s" : ""} de trading`}
        />

        {account.accountType !== "EVAL" && (
          <StatCard
            title="Retraits"
            value={formatCurrency(totalWithdrawals)}
            icon={DollarSign}
            variant="success"
            secondaryText={formatCurrencyEUR(totalWithdrawals * USD_TO_EUR)}
            description={`${account.withdrawals.length} retrait${account.withdrawals.length > 1 ? "s" : ""}`}
          />
        )}

        <StatCard
          title="Meilleur Jour"
          value={formatCurrency(bestDay)}
          icon={TrendingUp}
          variant="success"
          description="Plus haut PnL quotidien"
        />

        <StatCard
          title="Moyenne/Jour"
          value={formatCurrency(avgPerDay)}
          icon={Calendar}
          variant={useStatVariant(avgPerDay)}
          description="PnL moyen par jour"
        />
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
      <div
        className={`grid gap-6 ${account.accountType === "EVAL" ? "md:grid-cols-1" : "md:grid-cols-2"}`}
      >
        {/* Historique PnL */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Historique PnL</CardTitle>
              <Button size="sm" onClick={() => setPnlDialogOpen(true)}>
                Ajouter
              </Button>
            </div>
            <CardDescription>Les dernières entrées de profit et perte</CardDescription>
          </CardHeader>
          <CardContent>
            {account.pnlEntries.length === 0 ? (
              <p className="text-sm text-zinc-500 text-center py-8">
                Aucune entrée PnL pour le moment
              </p>
            ) : (
              <div className="space-y-3">
                {account.pnlEntries
                  .slice(0, 5)
                  .map(
                    (entry: {
                      id: string
                      date: string
                      amount: number
                      notes?: string | null
                    }) => (
                      <div
                        key={entry.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`p-2 rounded-lg ${entry.amount >= 0 ? "bg-green-100 dark:bg-green-900" : "bg-red-100 dark:bg-red-900"}`}
                          >
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
                            {entry.notes && <p className="text-xs text-zinc-500">{entry.notes}</p>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-bold ${entry.amount >= 0 ? "text-green-600" : "text-red-600"}`}
                          >
                            {entry.amount >= 0 ? "+" : ""}
                            {formatCurrency(entry.amount)}
                          </span>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedPnl({
                                  id: entry.id,
                                  date: entry.date,
                                  amount: entry.amount,
                                  notes: entry.notes || undefined,
                                  accountId: account.id || "",
                                })
                                setPnlDialogOpen(true)
                              }}
                              className="h-8 w-8"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={async () => {
                                if (confirm("Êtes-vous sûr de vouloir supprimer cette entrée ?")) {
                                  try {
                                    const res = await fetch(`/api/pnl/${entry.id}`, {
                                      method: "DELETE",
                                    })
                                    if (!res.ok) throw new Error("Erreur lors de la suppression")
                                    window.location.reload()
                                  } catch (_error) {
                                    alert("Erreur lors de la suppression de l'entrée PnL")
                                  }
                                }
                              }}
                              className="h-8 w-8"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    )
                  )}
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
              <CardDescription>Les derniers retraits effectués</CardDescription>
            </CardHeader>
            <CardContent>
              {account.withdrawals.length === 0 ? (
                <p className="text-sm text-zinc-500 text-center py-8">
                  Aucun retrait pour le moment
                </p>
              ) : (
                <div className="space-y-3">
                  {account.withdrawals
                    .slice(0, 5)
                    .map(
                      (withdrawal: {
                        id: string
                        date: string
                        amount: number
                        notes?: string | null
                      }) => {
                        // Calculer le montant net reçu (avec taxes pour TakeProfitTrader)
                        const isTakeProfitTrader = account.propfirm === "TAKEPROFITTRADER"
                        const netAmount = isTakeProfitTrader
                          ? withdrawal.amount * 0.8
                          : withdrawal.amount

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
                            <div className="flex items-center gap-3">
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
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    setSelectedWithdrawal({
                                      id: withdrawal.id,
                                      date: withdrawal.date,
                                      amount: withdrawal.amount,
                                      notes: withdrawal.notes || undefined,
                                      accountId: account.id || "",
                                    })
                                    setWithdrawalDialogOpen(true)
                                  }}
                                  className="h-8 w-8"
                                >
                                  <Edit className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={async () => {
                                    if (
                                      confirm("Êtes-vous sûr de vouloir supprimer ce retrait ?")
                                    ) {
                                      try {
                                        const res = await fetch(
                                          `/api/withdrawals/${withdrawal.id}`,
                                          {
                                            method: "DELETE",
                                          }
                                        )
                                        if (!res.ok)
                                          throw new Error("Erreur lors de la suppression")
                                        window.location.reload()
                                      } catch (_error) {
                                        alert("Erreur lors de la suppression du retrait")
                                      }
                                    }
                                  }}
                                  className="h-8 w-8"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        )
                      }
                    )}
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
        accounts={[
          {
            id: account.id,
            name: account.name,
            propfirm: account.propfirm,
            accountType: account.accountType,
            size: account.size,
          },
        ]}
        onSuccess={() => {}}
      />

      <PnlFormDialog
        open={pnlDialogOpen}
        onOpenChange={(open) => {
          setPnlDialogOpen(open)
          if (!open) setSelectedPnl(null)
        }}
        entry={selectedPnl}
        accounts={[
          {
            id: account.id,
            name: account.name,
            accountType: account.accountType,
            propfirm: account.propfirm,
            size: account.size,
          },
        ]}
        onSuccess={() => {}}
      />

      <WithdrawalFormDialog
        open={withdrawalDialogOpen}
        onOpenChange={(open) => {
          setWithdrawalDialogOpen(open)
          if (!open) setSelectedWithdrawal(null)
        }}
        withdrawal={selectedWithdrawal}
        accounts={[
          {
            id: account.id,
            name: account.name,
            accountType: account.accountType,
            propfirm: account.propfirm,
            size: account.size,
          },
        ]}
        onSuccess={() => {}}
      />
    </div>
  )
}
