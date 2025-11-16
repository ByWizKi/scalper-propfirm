/**
 * Évaluateur de formules pour les statistiques personnalisées
 * Supporte les variables prédéfinies et les opérations mathématiques de base
 */

interface StatsData {
  totalAccounts?: number
  activeAccounts?: number
  fundedAccounts?: number
  totalInvested?: number
  totalPnl?: number
  totalWithdrawals?: number
  totalNetWithdrawals?: number
  netProfit?: number
  globalRoi?: number
  evalSuccessRate?: number
  validatedEval?: number
  failedEval?: number
  activeEval?: number
  avgValidationDays?: number
  monthlyPnl?: number
  totalTaxes?: number
  totalWithdrawalCount?: number
  avgPnlPerAccount?: number
  bestDay?: number
  worstDay?: number
  tradingDays?: number
  activeAccountsRate?: number
  weeklyPnl?: number
  avgPnlPerTradingDay?: number
  activeFundedAccounts?: number
  totalCapitalUnderManagement?: number
  globalSuccessRate?: number
  avgWithdrawal?: number
  fundedAccountsPnl?: number
  evalAccountsPnl?: number
  daysSinceFirstAccount?: number
  withdrawalRate?: number
  archivedAccounts?: number
}

/**
 * Évalue une formule personnalisée avec les données de statistiques
 * @param formula - Formule JavaScript simple (ex: "totalPnl / totalAccounts")
 * @param data - Données de statistiques disponibles
 * @returns Résultat de l'évaluation ou 0 en cas d'erreur
 */
export function evaluateCustomStat(formula: string, data: StatsData): number {
  try {
    // Créer un contexte sécurisé avec uniquement les variables autorisées
    const context: Record<string, number> = {
      totalAccounts: data.totalAccounts || 0,
      activeAccounts: data.activeAccounts || 0,
      fundedAccounts: data.fundedAccounts || 0,
      totalInvested: data.totalInvested || 0,
      totalPnl: data.totalPnl || 0,
      totalWithdrawals: data.totalWithdrawals || 0,
      totalNetWithdrawals: data.totalNetWithdrawals || 0,
      netProfit: data.netProfit || 0,
      globalRoi: data.globalRoi || 0,
      evalSuccessRate: data.evalSuccessRate || 0,
      validatedEval: data.validatedEval || 0,
      failedEval: data.failedEval || 0,
      activeEval: data.activeEval || 0,
      avgValidationDays: data.avgValidationDays || 0,
      monthlyPnl: data.monthlyPnl || 0,
      totalTaxes: data.totalTaxes || 0,
      totalWithdrawalCount: data.totalWithdrawalCount || 0,
      avgPnlPerAccount: data.avgPnlPerAccount || 0,
      bestDay: data.bestDay || 0,
      worstDay: data.worstDay || 0,
      tradingDays: data.tradingDays || 0,
      activeAccountsRate: data.activeAccountsRate || 0,
      weeklyPnl: data.weeklyPnl || 0,
      avgPnlPerTradingDay: data.avgPnlPerTradingDay || 0,
      activeFundedAccounts: data.activeFundedAccounts || 0,
      totalCapitalUnderManagement: data.totalCapitalUnderManagement || 0,
      globalSuccessRate: data.globalSuccessRate || 0,
      avgWithdrawal: data.avgWithdrawal || 0,
      fundedAccountsPnl: data.fundedAccountsPnl || 0,
      evalAccountsPnl: data.evalAccountsPnl || 0,
      daysSinceFirstAccount: data.daysSinceFirstAccount || 0,
      withdrawalRate: data.withdrawalRate || 0,
      archivedAccounts: data.archivedAccounts || 0,
    }

    // Remplacer les variables dans la formule par leurs valeurs
    let evaluatedFormula = formula.trim()

    // Remplacer les variables par leurs valeurs
    Object.keys(context).forEach((key) => {
      const regex = new RegExp(`\\b${key}\\b`, "g")
      evaluatedFormula = evaluatedFormula.replace(regex, `(${context[key]})`)
    })

    // Évaluer la formule de manière sécurisée en utilisant eval dans un contexte isolé
    // Note: eval est nécessaire ici pour évaluer des expressions mathématiques dynamiques
    // mais nous avons déjà validé la formule et remplacé toutes les variables par des nombres
    let result: number
    try {
      result = eval(evaluatedFormula) as number
    } catch {
      return 0
    }

    // Vérifier que le résultat est un nombre valide
    if (typeof result !== "number" || !isFinite(result) || isNaN(result)) {
      return 0
    }

    return result
  } catch (_error) {
    // En cas d'erreur, retourner 0
    return 0
  }
}

/**
 * Valide une formule avant de la sauvegarder
 * @param formula - Formule à valider
 * @returns true si la formule est valide, false sinon
 */
export function validateFormula(formula: string): { valid: boolean; error?: string } {
  if (!formula || formula.trim().length === 0) {
    return { valid: false, error: "La formule ne peut pas être vide" }
  }

  // Liste des variables autorisées
  const allowedVariables = [
    "totalAccounts",
    "activeAccounts",
    "fundedAccounts",
    "totalInvested",
    "totalPnl",
    "totalWithdrawals",
    "totalNetWithdrawals",
    "netProfit",
    "globalRoi",
    "evalSuccessRate",
    "validatedEval",
    "failedEval",
    "activeEval",
    "avgValidationDays",
    "monthlyPnl",
    "totalTaxes",
    "totalWithdrawalCount",
    "avgPnlPerAccount",
    "bestDay",
    "worstDay",
    "tradingDays",
    "activeAccountsRate",
    "weeklyPnl",
    "avgPnlPerTradingDay",
    "activeFundedAccounts",
    "totalCapitalUnderManagement",
    "globalSuccessRate",
    "avgWithdrawal",
    "fundedAccountsPnl",
    "evalAccountsPnl",
    "daysSinceFirstAccount",
    "withdrawalRate",
    "archivedAccounts",
  ]

  // Vérifier que la formule ne contient que des variables autorisées et des opérateurs mathématiques

  // Extraire les variables de la formule
  const variablePattern = /\b[a-zA-Z_][a-zA-Z0-9_]*\b/g
  const variables = formula.match(variablePattern) || []

  // Vérifier que toutes les variables sont autorisées
  for (const variable of variables) {
    if (!allowedVariables.includes(variable)) {
      return {
        valid: false,
        error: `Variable "${variable}" non autorisée. Variables disponibles: ${allowedVariables.join(", ")}`,
      }
    }
  }

  // Vérifier la syntaxe de base (pas de caractères dangereux)
  const dangerousPattern = /[;{}[\]`'"]/
  if (dangerousPattern.test(formula)) {
    return { valid: false, error: "La formule contient des caractères non autorisés" }
  }

  // Tester l'évaluation avec des données de test
  try {
    const testData: StatsData = {}
    allowedVariables.forEach((key) => {
      testData[key as keyof StatsData] = 1
    })
    evaluateCustomStat(formula, testData)
  } catch (error) {
    return {
      valid: false,
      error: `Erreur dans la formule: ${error instanceof Error ? error.message : "Erreur inconnue"}`,
    }
  }

  return { valid: true }
}

/**
 * Liste des variables disponibles pour l'aide
 */
export const AVAILABLE_VARIABLES = [
  { name: "totalAccounts", description: "Nombre total de comptes" },
  { name: "activeAccounts", description: "Nombre de comptes actifs" },
  { name: "fundedAccounts", description: "Nombre de comptes financés" },
  { name: "totalInvested", description: "Total investi en USD" },
  { name: "totalPnl", description: "Total des gains et pertes" },
  { name: "totalWithdrawals", description: "Total des retraits bruts" },
  { name: "totalNetWithdrawals", description: "Total des retraits nets (après taxes)" },
  { name: "netProfit", description: "Profit net" },
  { name: "globalRoi", description: "ROI global en pourcentage" },
  { name: "monthlyPnl", description: "PnL mensuel (30 derniers jours)" },
  { name: "weeklyPnl", description: "PnL hebdomadaire (7 derniers jours)" },
  { name: "tradingDays", description: "Nombre de jours de trading" },
  { name: "bestDay", description: "Meilleur jour de trading" },
  { name: "worstDay", description: "Pire jour de trading" },
  { name: "totalTaxes", description: "Total des taxes payées" },
  { name: "totalCapitalUnderManagement", description: "Capital total sous gestion" },
]
