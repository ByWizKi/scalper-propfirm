"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  CheckCircle2,
  TrendingUp,
  Shield,
  Info,
  Scale,
  Crosshair,
  AlertTriangle,
} from "lucide-react"

interface PnlEntry {
  id: string
  date: string
  amount: number
  notes?: string
}

interface ApexPaRulesTrackerProps {
  accountSize: number
  pnlEntries: PnlEntry[]
}

/**
 * Composant pour tracker les règles des comptes PA (Performance Accounts) Apex
 *
 * Règles principales:
 * 1. Contract Scaling Rule (moitié des contrats jusqu'au threshold)
 * 2. 30% Negative P&L Rule (MAE) - Maximum Adverse Excursion
 * 3. 5:1 Risk-Reward Ratio Rule
 * 4. Hedging Rule (interdit)
 * 5. One Direction Rule (une seule direction)
 */
export function ApexPaRulesTracker({ accountSize, pnlEntries }: ApexPaRulesTrackerProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  // Configuration selon la taille du compte
  const getMaxDrawdown = (size: number): number => {
    const drawdownConfig: Record<number, number> = {
      25000: 1500,
      50000: 2500,
      100000: 3000,
      150000: 5000,
      250000: 6500,
      300000: 7500,
    }
    return drawdownConfig[size] || 0
  }

  const getMaxContracts = (size: number): { mini: number; micro: number } => {
    const contractsConfig: Record<number, { mini: number; micro: number }> = {
      25000: { mini: 4, micro: 40 },
      50000: { mini: 10, micro: 100 },
      100000: { mini: 14, micro: 140 },
      150000: { mini: 17, micro: 170 },
      250000: { mini: 27, micro: 270 },
      300000: { mini: 35, micro: 350 },
    }
    return contractsConfig[size] || { mini: 0, micro: 0 }
  }

  const maxDrawdown = getMaxDrawdown(accountSize)
  const maxContracts = getMaxContracts(accountSize)
  const isStaticAccount = accountSize === 100000 // 100K Static

  // Calculer le PnL total
  const totalPnl = pnlEntries.reduce((sum, entry) => sum + entry.amount, 0)

  // Calculer le solde actuel
  const currentBalance = accountSize + totalPnl

  // Calculer le trailing threshold (initial balance + trailing drawdown + $100)
  const trailingThreshold = accountSize + maxDrawdown + 100

  // Vérifier si le compte a dépassé le threshold (pour Contract Scaling)
  const hasReachedThreshold = currentBalance >= trailingThreshold

  // Pour 100K Static, le seuil est de $2,600 de profit
  const staticThreshold = 2600
  const hasReachedStaticThreshold = isStaticAccount && totalPnl >= staticThreshold

  // Calculer le PnL du début de journée (pour la règle 30%)
  // Utiliser useMemo pour éviter de recalculer à chaque render
  const yesterdayPnl = React.useMemo(() => {
    const today = new Date()
    const yesterday = new Date(today.getTime() - 86400000)
    const yesterdayStr = yesterday.toISOString().split("T")[0]

    return pnlEntries
      .filter((entry) => entry.date.split("T")[0] <= yesterdayStr)
      .reduce((sum, entry) => sum + entry.amount, 0)
  }, [pnlEntries])

  const startOfDayProfit = Math.max(0, yesterdayPnl)

  // Calculer la limite de perte par trade (30% du profit de début de journée)
  const maxLossPerTrade = startOfDayProfit * 0.3

  // Si le profit EOD double le safety net, la limite passe à 50%
  const safetyNet = maxDrawdown
  const canUse50Percent = totalPnl >= safetyNet * 2
  const adjustedMaxLossPerTrade = canUse50Percent ? startOfDayProfit * 0.5 : maxLossPerTrade

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Règles PA (Performance Account) - Apex</CardTitle>
            <CardDescription>Règles de trading pour les comptes financés Apex</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 1. Contract Scaling Rule */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Scale
                className={`h-4 w-4 ${hasReachedThreshold || hasReachedStaticThreshold ? "text-green-600" : "text-yellow-600"}`}
              />
              <span className="text-sm font-medium">1. Contract Scaling Rule</span>
              {(hasReachedThreshold || hasReachedStaticThreshold) && (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              )}
            </div>
          </div>
          <div className="bg-zinc-50 dark:bg-zinc-900 p-3 sm:p-4 rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-600 dark:text-zinc-400">Contrats autorisés :</span>
              <span className="font-medium">
                {hasReachedThreshold || hasReachedStaticThreshold
                  ? `${maxContracts.mini} mini / ${maxContracts.micro} micro (100%)`
                  : `${Math.floor(maxContracts.mini / 2)} mini / ${Math.floor(maxContracts.micro / 2)} micro (50%)`}
              </span>
            </div>
            {!isStaticAccount && (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-600 dark:text-zinc-400">Seuil à atteindre :</span>
                  <span className="font-medium">{formatCurrency(trailingThreshold)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-600 dark:text-zinc-400">Solde actuel :</span>
                  <span
                    className={`font-medium ${currentBalance >= trailingThreshold ? "text-green-600" : "text-zinc-900 dark:text-zinc-100"}`}
                  >
                    {formatCurrency(currentBalance)}
                  </span>
                </div>
              </>
            )}
            {isStaticAccount && (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-600 dark:text-zinc-400">Seuil (100K Static) :</span>
                  <span className="font-medium">{formatCurrency(staticThreshold)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-600 dark:text-zinc-400">Profit actuel :</span>
                  <span
                    className={`font-medium ${totalPnl >= staticThreshold ? "text-green-600" : "text-zinc-900 dark:text-zinc-100"}`}
                  >
                    {formatCurrency(totalPnl)}
                  </span>
                </div>
              </>
            )}
            <p className="text-xs text-zinc-500 mt-2">
              {hasReachedThreshold || hasReachedStaticThreshold
                ? "✅ Vous pouvez trader avec tous vos contrats"
                : "⚠️ Vous devez trader avec la moitié de vos contrats max jusqu'à atteindre le seuil"}
            </p>
          </div>
        </div>

        {/* 2. 30% Negative P&L Rule (MAE) */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">
                2. {canUse50Percent ? "50%" : "30%"} Negative P&L Rule (MAE)
              </span>
              <Info className="h-3 w-3 text-zinc-400" />
            </div>
          </div>
          <div className="bg-zinc-50 dark:bg-zinc-900 p-3 sm:p-4 rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-600 dark:text-zinc-400">Profit début de journée :</span>
              <span className="font-medium">{formatCurrency(startOfDayProfit)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-600 dark:text-zinc-400">
                Perte max par trade ({canUse50Percent ? "50%" : "30%"}) :
              </span>
              <span className="font-medium text-red-600">
                {formatCurrency(adjustedMaxLossPerTrade)}
              </span>
            </div>
            {canUse50Percent && (
              <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/20 rounded text-xs text-green-700 dark:text-green-400">
                <CheckCircle2 className="h-3 w-3 flex-shrink-0" />
                <span>
                  Votre profit EOD a doublé le safety net ! Vous pouvez utiliser 50% au lieu de 30%
                </span>
              </div>
            )}
            <p className="text-xs text-zinc-500 mt-2">
              La perte non réalisée (open negative P&L) d&apos;un trade ne doit jamais dépasser{" "}
              {canUse50Percent ? "50%" : "30%"} du profit de début de journée. Ce n&apos;est PAS une
              limite journalière.
            </p>
          </div>
        </div>

        {/* 3. 5:1 Risk-Reward Ratio Rule */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Crosshair className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium">3. 5:1 Risk-Reward Ratio Rule</span>
            </div>
          </div>
          <div className="bg-zinc-50 dark:bg-zinc-900 p-3 sm:p-4 rounded-lg space-y-2">
            <p className="text-sm text-zinc-700 dark:text-zinc-300">
              Votre <strong>stop loss</strong> ne doit jamais dépasser{" "}
              <strong>5 fois votre profit target</strong>.
            </p>
            <div className="text-xs text-zinc-500 space-y-1">
              <p>
                Exemple : Si votre profit target est de $100, votre stop loss maximum est de $500.
              </p>
              <p className="text-orange-600 dark:text-orange-400 font-medium">
                ⚠️ Assurez-vous de définir des stop loss cohérents pour chaque trade.
              </p>
            </div>
          </div>
        </div>

        {/* 4. Hedging Rule */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <span className="text-sm font-medium">4. Hedging Rule</span>
            </div>
          </div>
          <div className="bg-red-50 dark:bg-red-900/20 p-3 sm:p-4 rounded-lg">
            <p className="text-sm text-red-700 dark:text-red-400 font-medium">
              ❌ Interdit : Tenir des positions longues ET courtes simultanément sur le même
              instrument ou des instruments corrélés.
            </p>
            <p className="text-xs text-red-600 dark:text-red-500 mt-2">
              Le hedging (couverture) est strictement prohibé pour garantir que vos trades sont
              basés sur une analyse stratégique.
            </p>
          </div>
        </div>

        {/* 5. One Direction Rule */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-indigo-600" />
              <span className="text-sm font-medium">5. One Direction Rule</span>
            </div>
          </div>
          <div className="bg-indigo-50 dark:bg-indigo-900/20 p-3 sm:p-4 rounded-lg">
            <p className="text-sm text-indigo-700 dark:text-indigo-400 font-medium">
              ➡️ Vous ne pouvez tenir qu&apos;une position dans UNE direction à la fois : soit long
              (achat), soit short (vente).
            </p>
            <p className="text-xs text-indigo-600 dark:text-indigo-500 mt-2">
              Vous ne pouvez pas avoir d&apos;ordres en attente pour les deux côtés du marché
              (stratégie non directionnelle interdite).
            </p>
          </div>
        </div>

        {/* Résumé */}
        <div className="border-t pt-4 mt-4">
          <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <Info className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-blue-700 dark:text-blue-400">
              <p className="font-medium mb-1">Note importante :</p>
              <p>
                Ces règles sont conçues pour créer un environnement de trading professionnel et
                équitable. Respectez-les scrupuleusement pour maintenir votre compte PA actif et
                recevoir vos payouts régulièrement.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
