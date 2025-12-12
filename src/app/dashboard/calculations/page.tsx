"use client"

import { useState, useMemo, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Calculator,
  TrendingUp,
  Wallet,
  Clock,
  Percent,
  Coins,
  Target,
  Info,
  BarChart3,
  type LucideIcon,
} from "lucide-react"
import { StatCard } from "@/components/stat-card"
import { USD_TO_EUR, PROPFIRM_LABELS, ACCOUNT_TYPE_LABELS } from "@/lib/constants"
import { PropfirmType, AccountType } from "@/types/account.types"
import { PropfirmStrategyFactory } from "@/lib/strategies/propfirm-strategy.factory"

interface CalculationResult {
  label: string
  value: string | number
  unit?: string
  description?: string
  icon?: LucideIcon
  variant?: "default" | "success" | "danger" | "warning" | "neutral"
  secondaryText?: string
}

export default function CalculationsPage() {
  const [selectedCalculation, setSelectedCalculation] = useState<string>("net-amount-target")
  const [propfirm, setPropfirm] = useState<PropfirmType>(PropfirmType.TAKEPROFITTRADER)
  const [accountType, setAccountType] = useState<AccountType>(AccountType.EVAL)
  const [accountSize, setAccountSize] = useState<number>(25000)

  // Variables pour "Combien pour avoir X€ net"
  const [netAmountTarget, setNetAmountTarget] = useState<string>("10000")
  const [numberOfAccounts, setNumberOfAccounts] = useState<string>("1")

  // Variables pour "Combien de jours pour valider"
  const [dailyPnl, setDailyPnl] = useState<string>("300")

  // Pour le calcul "Combien pour avoir X€ net", forcer le type de compte à FUNDED
  // Utiliser une valeur dérivée au lieu d'un effet pour éviter les problèmes de rendu en cascade
  const effectiveAccountType = useMemo(() => {
    return selectedCalculation === "net-amount-target" ? AccountType.FUNDED : accountType
  }, [selectedCalculation, accountType])

  // Synchroniser accountType avec effectiveAccountType uniquement si nécessaire
  useEffect(() => {
    if (selectedCalculation === "net-amount-target" && accountType !== AccountType.FUNDED) {
      // Utiliser requestAnimationFrame pour différer la mise à jour
      requestAnimationFrame(() => {
        setAccountType(AccountType.FUNDED)
      })
    }
  }, [selectedCalculation, accountType])

  // Obtenir les règles de la propfirm sélectionnée
  const propfirmRules = useMemo(() => {
    const strategy = PropfirmStrategyFactory.getStrategy(propfirm)
    const withdrawalRules = strategy.getWithdrawalRules(accountSize)
    const accountRules = strategy.getAccountRules(accountSize)

    // Récupérer toutes les tailles disponibles pour cette propfirm
    const availableSizes: number[] = []
    const profitTargets: Record<number, number> = {}
    const maxDrawdowns: Record<number, number> = {}

    // Tester les tailles communes
    const commonSizes = [25000, 50000, 75000, 100000, 150000, 250000, 300000]
    commonSizes.forEach((size) => {
      const rules = strategy.getAccountRules(size)
      if (rules) {
        availableSizes.push(size)
        profitTargets[size] = rules.profitTarget
        maxDrawdowns[size] = rules.maxDrawdown
      }
    })

    return {
      taxRate: withdrawalRules.taxRate,
      requiresCycles: withdrawalRules.requiresCycles,
      cycleRequirements: withdrawalRules.cycleRequirements,
      hasBuffer: withdrawalRules.hasBuffer,
      profitTargets,
      maxDrawdowns,
      profitTarget: accountRules?.profitTarget || 0,
      maxDrawdown: accountRules?.maxDrawdown || 0,
      availableSizes,
    }
  }, [propfirm, accountSize])

  // Calcul : Combien pour avoir X€ net dans la poche
  const netAmountTargetCalculation = useMemo((): CalculationResult[] => {
    const targetEur = parseFloat(netAmountTarget) || 0
    const numAccounts = parseFloat(numberOfAccounts) || 1

    if (targetEur === 0) return []

    const totalNetUsd = targetEur / USD_TO_EUR
    const netPerAccount = totalNetUsd / numAccounts

    // Calcul selon la propfirm
    let totalPnlNeeded: number
    let grossPerAccount: number
    let grossPerAccountWithoutBuffer: number | undefined

    if (propfirm === PropfirmType.TOPSTEP && propfirmRules.requiresCycles) {
      const withdrawalPercentage = propfirmRules.cycleRequirements?.withdrawalPercentage || 0.5
      grossPerAccount = netPerAccount / withdrawalPercentage
      totalPnlNeeded = grossPerAccount * numAccounts
    } else if (propfirm === PropfirmType.TAKEPROFITTRADER && propfirmRules.hasBuffer) {
      // Pour TakeProfitTrader : calcul correct avec buffer et taxes
      const strategy = PropfirmStrategyFactory.getStrategy(propfirm)
      const buffer = strategy.calculateBuffer(accountSize)
      // Montant net souhaité en USD (netPerAccount est déjà en USD)
      const netUsd = netPerAccount
      // Montant brut à retirer en USD (avant taxes de 20%)
      // net = brut * 0.8, donc brut = net / 0.8
      const grossUsd = netUsd / (1 - propfirmRules.taxRate)
      // PnL nécessaire = montant brut + buffer - accountSize
      grossPerAccount = grossUsd + buffer - accountSize
      // PnL sans buffer = montant brut (PnL pur, pas la balance)
      grossPerAccountWithoutBuffer = grossUsd
      totalPnlNeeded = grossPerAccount * numAccounts
    } else {
      grossPerAccount = netPerAccount / (1 - propfirmRules.taxRate)
      totalPnlNeeded = grossPerAccount * numAccounts
    }

    // Retourner uniquement 5 statistiques essentielles
    let pnlTotalDescription = `Total pour ${numAccounts} compte${numAccounts > 1 ? "s" : ""}`
    let pnlPerAccountDescription = "Par compte"

    // Ajouter une note sur le buffer pour TakeProfitTrader
    if (propfirm === PropfirmType.TAKEPROFITTRADER && propfirmRules.hasBuffer) {
      const strategy = PropfirmStrategyFactory.getStrategy(propfirm)
      const buffer = strategy.calculateBuffer(accountSize)
      pnlTotalDescription = `Total pour ${numAccounts} compte${numAccounts > 1 ? "s" : ""} (buffer ${buffer.toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} $US inclus)`
      pnlPerAccountDescription = `Par compte (buffer inclus)`
    } else if (propfirm === PropfirmType.TOPSTEP && propfirmRules.requiresCycles) {
      pnlPerAccountDescription = "Par compte (50% retirable)"
    } else {
      pnlPerAccountDescription = "Par compte (avant taxes)"
    }

    return [
      {
        label: "PnL total nécessaire",
        value: `$${totalPnlNeeded.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        description: pnlTotalDescription,
        icon: TrendingUp,
        variant: "default",
        secondaryText: `${(totalPnlNeeded * USD_TO_EUR).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`,
      },
      {
        label: "PnL par compte",
        value: `$${grossPerAccount.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        description: pnlPerAccountDescription,
        icon: Wallet,
        variant: "neutral",
        secondaryText:
          grossPerAccountWithoutBuffer !== undefined
            ? `Sans buffer: $${grossPerAccountWithoutBuffer.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            : undefined,
      },
      {
        label: "Montant net total",
        value: `${targetEur.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`,
        description: `Objectif net total`,
        icon: Coins,
        variant: "success",
        secondaryText: `${totalNetUsd.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $US`,
      },
      {
        label: "Montant net par compte",
        value: `${(netPerAccount * USD_TO_EUR).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`,
        description: `Objectif net par compte`,
        icon: Wallet,
        variant: "success",
        secondaryText: `${netPerAccount.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $US`,
      },
      {
        label: "Nombre de comptes",
        value: `${numAccounts}`,
        description: numAccounts > 1 ? `Répartition sur ${numAccounts} comptes` : "Compte unique",
        icon: Target,
        variant: "neutral",
      },
      {
        label: "Pourcentage de profit",
        value: `${((grossPerAccount / accountSize) * 100).toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`,
        description: `Profit nécessaire par rapport à la taille du compte`,
        icon: Percent,
        variant: "neutral",
        secondaryText: `${((totalPnlNeeded / (accountSize * numAccounts)) * 100).toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}% total`,
      },
    ]
  }, [netAmountTarget, numberOfAccounts, propfirmRules, propfirm, accountSize])

  // Calcul : Combien de jours pour valider une eval
  const evalDaysCalculation = useMemo((): CalculationResult[] => {
    const dailyPnlAmount = parseFloat(dailyPnl) || 0
    const profitTarget = propfirmRules.profitTarget

    if (dailyPnlAmount === 0 || profitTarget === 0) {
      return [
        {
          label: "Information",
          value: "Données insuffisantes",
          description: "Veuillez entrer un PnL journalier et sélectionner une taille de compte",
          icon: Target,
          variant: "neutral",
        },
      ]
    }

    // Nombre de jours nécessaires (arrondi à l'entier supérieur)
    const daysNeeded = Math.ceil(profitTarget / dailyPnlAmount)

    // PnL total généré
    const totalPnl = daysNeeded * dailyPnlAmount

    // Marge de sécurité (PnL supplémentaire)
    const safetyMargin = totalPnl - profitTarget

    return [
      {
        label: "Jours nécessaires",
        value: `${daysNeeded} jour${daysNeeded > 1 ? "s" : ""}`,
        description: `Avec ${dailyPnlAmount.toLocaleString("fr-FR")} $US/jour`,
        icon: Clock,
        variant: daysNeeded <= 30 ? "success" : daysNeeded <= 60 ? "warning" : "neutral",
        secondaryText: `≈ ${Math.ceil(daysNeeded / 7)} semaine${Math.ceil(daysNeeded / 7) > 1 ? "s" : ""}`,
      },
      {
        label: "Profit target",
        value: `$${profitTarget.toLocaleString("fr-FR")}`,
        description: "Objectif à atteindre",
        icon: Target,
        variant: "default",
      },
      {
        label: "PnL total généré",
        value: `$${totalPnl.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        description: `Sur ${daysNeeded} jour${daysNeeded > 1 ? "s" : ""}`,
        icon: TrendingUp,
        variant: "success",
        secondaryText: `${(totalPnl * USD_TO_EUR).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`,
      },
      {
        label: "Marge de sécurité",
        value: `$${safetyMargin.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        description: "PnL supplémentaire au-dessus du target",
        icon: Coins,
        variant: safetyMargin > 0 ? "success" : "neutral",
      },
      {
        label: "PnL journalier (EUR)",
        value: `${(dailyPnlAmount * USD_TO_EUR).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`,
        description: "Équivalent en euros",
        icon: Wallet,
        variant: "neutral",
        secondaryText: `${dailyPnlAmount.toLocaleString("fr-FR")} $US`,
      },
      {
        label: "Progression journalière",
        value: `${((dailyPnlAmount / profitTarget) * 100).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`,
        description: "Pourcentage du target par jour",
        icon: BarChart3,
        variant: "neutral",
        secondaryText: `${(100 / daysNeeded).toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}% moyen/jour`,
      },
    ]
  }, [dailyPnl, propfirmRules])

  const currentResults = useMemo(() => {
    switch (selectedCalculation) {
      case "net-amount-target":
        return netAmountTargetCalculation
      case "eval-days":
        return evalDaysCalculation
      default:
        return []
    }
  }, [selectedCalculation, netAmountTargetCalculation, evalDaysCalculation])

  const accountSizes = useMemo(() => {
    return propfirmRules.availableSizes.sort((a, b) => a - b)
  }, [propfirmRules])

  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8 space-y-4 sm:space-y-6">
      {/* Header */}
      <section className="rounded-2xl border border-zinc-200/70 dark:border-zinc-800/70 bg-white/85 dark:bg-zinc-950/70 backdrop-blur-sm p-3 sm:p-4 md:p-5 shadow-sm">
        <div className="flex items-center gap-3 mb-2">
          <Calculator className="h-6 w-6 sm:h-8 sm:w-8 text-zinc-900 dark:text-zinc-50" />
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-zinc-900 dark:text-zinc-50">
            Calculateurs
          </h1>
        </div>
        <p className="text-xs sm:text-sm md:text-base text-zinc-600 dark:text-zinc-400">
          Effectuez des calculs personnalisés pour vos comptes propfirm
        </p>
      </section>

      {/* Sélection du type de calcul */}
      <Card className="rounded-2xl border border-zinc-200/70 dark:border-zinc-800/70 bg-white/85 dark:bg-zinc-950/70 backdrop-blur-sm shadow-sm">
        <CardHeader className="p-3 sm:p-4 md:p-6">
          <CardTitle className="text-base sm:text-lg md:text-xl">Type de calcul</CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Choisissez le calcul à effectuer
          </CardDescription>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 md:p-6 space-y-4">
          <Select value={selectedCalculation} onValueChange={setSelectedCalculation}>
            <SelectTrigger className="h-10 sm:h-11 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="net-amount-target">
                <div className="flex items-center gap-2">
                  <Coins className="h-4 w-4 flex-shrink-0" />
                  <span className="break-words">Combien pour avoir X€ net</span>
                </div>
              </SelectItem>
              <SelectItem value="eval-days">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 flex-shrink-0" />
                  <span className="break-words">Combien de jours pour valider</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>

          {/* Paramètres communs */}
          <div
            className={`grid gap-3 sm:gap-4 ${selectedCalculation === "net-amount-target" ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"}`}
          >
            <div className="space-y-2">
              <Label htmlFor="propfirm" className="text-xs sm:text-sm font-semibold">
                Propfirm
              </Label>
              <Select
                value={propfirm}
                onValueChange={(value) => {
                  setPropfirm(value as PropfirmType)
                  // Réinitialiser la taille de compte si elle n'est plus disponible
                  const strategy = PropfirmStrategyFactory.getStrategy(value as PropfirmType)
                  const commonSizes = [25000, 50000, 75000, 100000, 150000, 250000, 300000]
                  const firstAvailableSize = commonSizes.find(
                    (size) => strategy.getAccountRules(size) !== null
                  )
                  if (firstAvailableSize) {
                    setAccountSize(firstAvailableSize)
                  }
                }}
              >
                <SelectTrigger id="propfirm" className="h-10 sm:h-11 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PROPFIRM_LABELS)
                    .filter(
                      ([key]) =>
                        key === PropfirmType.TOPSTEP || key === PropfirmType.TAKEPROFITTRADER
                    )
                    .map(([key, label]) => (
                      <SelectItem key={key} value={key} className="break-words">
                        {label}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 break-words">
                Les calculs s&apos;adaptent automatiquement aux règles de cette propfirm
              </p>
            </div>

            {/* Type de compte - uniquement pour le calcul "Combien de jours pour valider" */}
            {selectedCalculation === "eval-days" && (
              <div className="space-y-2">
                <Label htmlFor="account-type" className="text-xs sm:text-sm font-semibold">
                  Type de compte
                </Label>
                <Select
                  value={effectiveAccountType}
                  onValueChange={(value) => setAccountType(value as AccountType)}
                >
                  <SelectTrigger id="account-type" className="h-10 sm:h-11 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ACCOUNT_TYPE_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 w-full">
            {accountSizes.length > 0 ? (
              <div className="space-y-2">
                <Label htmlFor="account-size" className="text-xs sm:text-sm font-semibold">
                  Taille de compte
                </Label>
                <Select
                  value={accountSize.toString()}
                  onValueChange={(value) => setAccountSize(parseInt(value))}
                >
                  <SelectTrigger id="account-size" className="h-10 sm:h-11 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {accountSizes.map((size) => (
                      <SelectItem key={size} value={size.toString()} className="break-words">
                        <span className="block break-words">
                          {size.toLocaleString()} $US
                          {propfirmRules.profitTargets[size] && (
                            <span className="text-xs text-zinc-500 ml-2 break-words">
                              (Target: {propfirmRules.profitTargets[size].toLocaleString()} $US)
                            </span>
                          )}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="account-size" className="text-xs sm:text-sm font-semibold">
                  Taille de compte
                </Label>
                <Input
                  id="account-size"
                  type="number"
                  value={accountSize}
                  onChange={(e) => setAccountSize(parseInt(e.target.value) || 0)}
                  placeholder="25000"
                  className="h-10 sm:h-11 w-full"
                />
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Cette propfirm n&apos;a pas de tailles prédéfinies. Entrez une taille
                  personnalisée.
                </p>
              </div>
            )}
          </div>

          {/* Paramètres spécifiques au calcul */}
          {selectedCalculation === "net-amount-target" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="net-amount-target" className="text-xs sm:text-sm font-semibold">
                  Montant net souhaité (EUR)
                </Label>
                <Input
                  id="net-amount-target"
                  type="number"
                  value={netAmountTarget}
                  onChange={(e) => setNetAmountTarget(e.target.value)}
                  placeholder="10000"
                  className="h-10 sm:h-11 w-full"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="number-of-accounts" className="text-xs sm:text-sm font-semibold">
                  Nombre de comptes
                </Label>
                <Input
                  id="number-of-accounts"
                  type="number"
                  value={numberOfAccounts}
                  onChange={(e) => setNumberOfAccounts(e.target.value)}
                  placeholder="1"
                  className="h-10 sm:h-11 w-full"
                />
              </div>
            </div>
          )}

          {selectedCalculation === "eval-days" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="daily-pnl" className="text-xs sm:text-sm font-semibold">
                  PnL journalier moyen (USD)
                </Label>
                <Input
                  id="daily-pnl"
                  type="number"
                  value={dailyPnl}
                  onChange={(e) => setDailyPnl(e.target.value)}
                  placeholder="300"
                  className="h-10 sm:h-11 w-full"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs sm:text-sm font-semibold text-zinc-500 dark:text-zinc-400">
                  Profit target
                </Label>
                <div className="min-h-10 sm:min-h-11 flex flex-col sm:flex-row items-start sm:items-center justify-start sm:justify-start px-3 py-2.5 sm:py-0 rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
                  <span className="text-sm font-semibold whitespace-nowrap">
                    ${propfirmRules.profitTarget.toLocaleString("fr-FR")}
                  </span>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 sm:ml-2 mt-0.5 sm:mt-0 break-words">
                    (selon la taille de compte)
                  </span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Affichage du taux de conversion */}
      <Card className="rounded-2xl border border-zinc-200/70 dark:border-zinc-800/70 bg-white/85 dark:bg-zinc-950/70 backdrop-blur-sm shadow-sm">
        <CardContent className="p-3 sm:p-4 md:p-6">
          <div className="flex items-center sm:items-start gap-2 sm:gap-3">
            <Info className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 text-zinc-500 dark:text-zinc-400" />
            <p className="flex-1 min-w-0 text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 text-center sm:text-left">
              <span className="block sm:inline">Taux de conversion utilisé : </span>
              <strong className="text-zinc-900 dark:text-zinc-50 font-semibold block sm:inline break-all sm:break-normal">
                1 USD = {USD_TO_EUR.toFixed(4)} EUR
              </strong>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Résultats */}
      {currentResults.length > 0 && (
        <section className="rounded-2xl border border-zinc-200/70 dark:border-zinc-800/70 bg-white/85 dark:bg-zinc-950/70 backdrop-blur-sm p-3 sm:p-4 md:p-5 lg:p-6 shadow-sm">
          <h2 className="text-base sm:text-lg md:text-xl font-bold text-zinc-900 dark:text-zinc-50 mb-3 sm:mb-4 md:mb-5">
            Résultats
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {currentResults.map((result, index) => (
              <StatCard
                key={index}
                title={result.label}
                value={typeof result.value === "number" ? result.value.toString() : result.value}
                icon={result.icon || Calculator}
                variant={result.variant || "default"}
                description={result.description}
                secondaryText={result.secondaryText}
                size="md"
                className="min-w-0 w-full break-words"
              />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
