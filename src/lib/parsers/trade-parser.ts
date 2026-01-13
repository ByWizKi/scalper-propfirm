/**
 * Parsers pour les fichiers CSV de trades depuis différentes plateformes
 */

export type TradingPlatform = "PROJECT_X" | "TRADOVATE"

/**
 * Map des commissions Lucid sur Tradovate par symbole (Per Side)
 * Source: Tableau fourni par Lucid Trading
 */
const LUCID_TRADOVATE_COMMISSIONS: Record<string, number> = {
  // Equity Futures
  ES: 1.75, // E-mini S&P 500 Futures
  MES: 0.5, // Micro E-mini S&P 500 Index Futures
  NQ: 1.75, // E-mini Nasdaq-100 Futures
  MNQ: 0.5, // Micro E-mini Nasdaq-100 Index Futures
  RTY: 1.75, // E-mini Russell 2000 Index Futures
  M2K: 0.5, // Micro E-mini Russell 2000 Index Futures
  NKD: 1.75, // Nikkei/USD Futures
  YM: 1.75, // E-mini Dow ($5) Futures
  MYM: 0.5, // Micro E-mini Dow Jones Industrial Average Index Futures
  // Currency Futures
  "6A": 2.4, // Australian Dollar Futures
  "6B": 2.4, // British Pound Futures
  "6C": 2.4, // Canadian Dollar Futures
  "6E": 2.4, // Euro FX Futures
  "6J": 2.4, // Japanese Yen Futures
  "6S": 2.4, // Swiss Franc Futures
  "6N": 2.4, // New Zealand Dollar Futures
  // Energy Futures
  CL: 2.0, // Crude Oil Futures
  MCL: 0.5, // Micro Crude Oil
  QM: 2.0, // E-mini Crude Oil Futures
  QG: 1.3, // E-mini Natural Gas Futures
  NG: 2.0, // Henry Hub Natural Gas Futures
  // Metal Futures
  PL: 2.3, // Platinum Futures
  HG: 2.3, // Copper Futures
  GC: 2.3, // Gold Futures
  MGC: 0.8, // Micro Gold Futures
  SI: 2.3, // Silver
  // Agricultural Futures
  HE: 2.8, // Lean Hog Futures
  LE: 2.8, // Live Cattle Futures
  ZS: 2.8, // Soybean Futures
  ZC: 2.8, // Corn Futures
  ZL: 2.8, // Soybean Oil Futures
  ZM: 2.8, // Soybean Meal Futures
  ZW: 2.8, // Chicago SRW Wheat Futures
}

/**
 * Map des fees Tradeovate par symbole (Round Turn)
 * Source: https://apextraderfunding.com/commission-rates/
 */
const TRADOVATE_FEES: Record<string, number> = {
  // Equity Futures
  YM: 3.1, // E-Mini Dow ($5)
  ES: 3.1, // E-Mini S&P 500
  NQ: 3.1, // E-Mini NASDAQ
  RTY: 3.1, // E-Mini Russell
  EMD: 3.0, // E-Mini S&P Midcap 400
  NKD: 4.64, // Nikkei 225 (USD)
  // EUREX
  FDAX: 2.92, // DAX Index
  FDXM: 0.92, // Mini-DAX
  FESX: 1.18, // Euro Stoxx 50
  FVS: 1.36, // VSTOXX
  FXXP: 0.78, // STOXX Europe 600
  FDXS: 0.68, // Micro DAX Index
  FSXE: 0.6, // Micro Euro Stoxx 50
  FGBX: 0.9, // Euro-Buxl
  FGBS: 0.9, // Euro-Schatz
  FGBM: 0.9, // Euro-Bobl
  FGBL: 0.9, // Euro-Bund
  // Currency Futures
  "6A": 3.54, // Australian Dollar
  "6B": 3.54, // British Pound
  "6J": 3.54, // Japanese Yen
  "6C": 3.54, // Canadian Dollar
  "6S": 3.54, // Swiss Franc
  "6E": 3.54, // Euro FX
  "6N": 3.54, // New Zealand Dollar
  // Agricultural Futures
  HE: 4.54, // Lean Hogs
  LE: 4.54, // Live Cattle
  GF: 4.54, // Feeder Cattle
  ZS: 4.54, // Soybeans
  ZL: 4.54, // Soybean Oil
  ZC: 4.54, // Corn
  ZW: 4.54, // Wheat
  ZM: 4.54, // Soybean Meal
  // Energy Futures
  RB: 3.34, // RBOB Gasoline
  CL: 3.34, // Crude Oil
  NG: 3.54, // Natural Gas
  QM: 2.74, // E-Mini Crude Oil
  QG: 1.34, // E-Mini Natural Gas
  HO: 3.34, // Heating Oil
  // Metal Futures
  GC: 3.54, // Gold
  HG: 3.54, // Copper
  SI: 3.54, // Silver
  QI: 2.34, // E-Mini Silver
  QO: 2.34, // E-Mini Gold
  PL: 3.54, // Platinum
  PA: 3.54, // Palladium
  // Micro Futures
  MYM: 1.04, // Micro E-Mini Dow
  MES: 1.04, // Micro E-Mini S&P 500
  MNQ: 1.04, // Micro E-Mini NASDAQ
  M2K: 1.04, // Micro E-Mini Russell
  MGC: 1.34, // E-Micro Gold
  MCL: 1.34, // Micro Crude Oil
  M6A: 0.82, // E-Micro Australian Dollar
  M6E: 0.82, // E-Micro Euro
  // Cryptocurrencies
  MBT: 5.34, // Micro Bitcoin
  MET: 0.74, // Micro Ether
}

/**
 * Extrait le symbole de base depuis un contrat (ex: "MNQH6" -> "MNQ")
 */
function extractSymbolFromContract(contract: string, product?: string): string {
  // Si on a un Product, l'utiliser en priorité
  if (product && product.trim()) {
    const productUpper = product.trim().toUpperCase()
    // Vérifier si le product est dans la map (fees ou commissions Lucid)
    if (TRADOVATE_FEES[productUpper] || LUCID_TRADOVATE_COMMISSIONS[productUpper]) {
      return productUpper
    }
  }

  // Extraire le symbole depuis le contrat
  // Format typique: SYMBOL + mois + année (ex: "MNQH6" -> "MNQ")
  if (!contract || contract.trim() === "") {
    return ""
  }

  const contractUpper = contract.trim().toUpperCase()

  // Chercher le symbole en essayant différentes longueurs
  // Les symboles vont de 2 à 4 caractères généralement
  for (let len = 4; len >= 2; len--) {
    const potentialSymbol = contractUpper.substring(0, len)
    if (TRADOVATE_FEES[potentialSymbol] !== undefined) {
      return potentialSymbol
    }
  }

  // Si aucun symbole trouvé, retourner les premiers caractères (fallback)
  return contractUpper.substring(0, 4)
}

/**
 * Obtient les fees Tradeovate pour un symbole donné
 */
function getTradovateFees(symbol: string, size: number): number {
  if (!symbol || size === 0) {
    return 0
  }

  const symbolUpper = symbol.trim().toUpperCase()
  const feesPerContract = TRADOVATE_FEES[symbolUpper]

  if (feesPerContract === undefined) {
    // Si le symbole n'est pas trouvé, utiliser une estimation par défaut
    console.warn(
      `[Parser Tradovate] Symbole "${symbolUpper}" non trouvé dans la map des fees, utilisation de l'estimation par défaut (1.50)`
    )
    return Math.abs(size) * 1.5
  }

  return Math.abs(size) * feesPerContract
}

/**
 * Obtient les commissions Lucid sur Tradovate pour un symbole donné (Per Side)
 * Les commissions sont calculées par côté (entrée + sortie = 2x la commission)
 */
function getLucidTradovateCommissions(symbol: string, size: number): number {
  if (!symbol || size === 0) {
    return 0
  }

  const symbolUpper = symbol.trim().toUpperCase()
  const commissionPerSide = LUCID_TRADOVATE_COMMISSIONS[symbolUpper]

  if (commissionPerSide === undefined) {
    // Si le symbole n'est pas trouvé, utiliser une estimation par défaut
    console.warn(
      `[Parser Lucid Tradovate] Symbole "${symbolUpper}" non trouvé dans la map des commissions, utilisation de l'estimation par défaut (1.00)`
    )
    // Round turn = 2x per side
    return Math.abs(size) * 1.0 * 2
  }

  // Round turn = 2x per side (entrée + sortie)
  return Math.abs(size) * commissionPerSide * 2
}

export interface ParsedTrade {
  id: string
  contractName: string
  enteredAt: Date
  exitedAt: Date
  entryPrice: number
  exitPrice: number
  fees: number
  pnl: number
  size: number
  type: string
  tradeDay: Date
  tradeDuration?: number
  commissions?: number
}

export interface DailyPnlSummary {
  date: string // Format YYYY-MM-DD
  totalPnl: number
  totalFees: number
  totalCommissions: number
  tradeCount: number
  trades: ParsedTrade[]
}

/**
 * Parser pour Project X
 * Format attendu: Id,ContractName,EnteredAt,ExitedAt,EntryPrice,ExitPrice,Fees,PnL,Size,Type,TradeDay,TradeDuration,Commissions
 */
export function parseProjectXCsv(csvContent: string): ParsedTrade[] {
  // Normaliser les retours à la ligne (gérer Windows \r\n, Unix \n, et Mac \r)
  const normalizedContent = csvContent.replace(/\r\n/g, "\n").replace(/\r/g, "\n")
  const allLines = normalizedContent.split("\n")
  const lines = allLines.map((line) => line.trim()).filter((line) => line.length > 0)

  // Log pour déboguer
  console.info(
    `[Parser] Total lignes brutes: ${allLines.length}, Lignes non vides: ${lines.length}`
  )

  if (lines.length < 2) {
    const preview = allLines
      .slice(0, 3)
      .map((l, i) => `Ligne ${i + 1}: "${l}"`)
      .join("\n")
    const errorMessage =
      `Le fichier CSV ne contient que l'en-tête, aucune donnée de trade trouvée.\n\n` +
      `Détails:\n` +
      `- Lignes non vides: ${lines.length}\n` +
      `- Lignes brutes totales: ${allLines.length}\n\n` +
      `Aperçu du fichier:\n${preview}\n\n` +
      `Vérifiez que votre fichier d'export depuis Project X contient bien des trades. ` +
      `Le fichier doit contenir au moins une ligne de données après l'en-tête avec les colonnes: `
    throw new Error(errorMessage + `Id, EnteredAt, ExitedAt, PnL, TradeDay.`)
  }

  // Parser l'en-tête pour trouver les indices des colonnes
  const header = lines[0].split(",").map((h) => h.trim())
  const columnIndices: Record<string, number> = {}
  header.forEach((col, index) => {
    columnIndices[col] = index
  })

  // Vérifier que les colonnes requises sont présentes
  const requiredColumns = ["Id", "EnteredAt", "ExitedAt", "PnL", "TradeDay"]
  for (const col of requiredColumns) {
    if (columnIndices[col] === undefined) {
      throw new Error(`Colonne requise manquante: ${col}. Colonnes trouvées: ${header.join(", ")}`)
    }
  }

  const trades: ParsedTrade[] = []
  let skippedLines = 0

  // Parser chaque ligne (sauf l'en-tête)
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    if (!line || line.trim() === "") {
      skippedLines++
      continue // Ignorer les lignes vides
    }

    // Vérifier si la ligne contient au moins une valeur non vide
    const values = parseCsvLine(line)
    const hasValidData = values.some((val) => val && val.trim().length > 0)

    if (!hasValidData) {
      console.warn(`[Parser] Ligne ${i + 1} ignorée: toutes les valeurs sont vides`)
      skippedLines++
      continue
    }

    try {
      const id = values[columnIndices["Id"]] || `trade-${i}`
      const enteredAt = parseDate(values[columnIndices["EnteredAt"]])
      const exitedAt = parseDate(values[columnIndices["ExitedAt"]])
      const tradeDay = parseDate(values[columnIndices["TradeDay"]])
      const pnl = parseFloat(values[columnIndices["PnL"]] || "0")
      const entryPrice = parseFloat(values[columnIndices["EntryPrice"]] || "0")
      const exitPrice = parseFloat(values[columnIndices["ExitPrice"]] || "0")
      const fees = parseFloat(values[columnIndices["Fees"]] || "0")
      const size = parseFloat(values[columnIndices["Size"]] || "0")
      const type = values[columnIndices["Type"]] || ""
      const contractName = values[columnIndices["ContractName"]] || ""
      // Calculer la durée à partir du CSV si disponible, sinon la calculer depuis enteredAt/exitedAt
      let tradeDuration: number | undefined
      if (columnIndices["TradeDuration"] !== undefined) {
        const csvDuration = parseFloat(values[columnIndices["TradeDuration"]] || "0")
        // Si la durée du CSV est valide (> 0), l'utiliser, sinon calculer depuis les dates
        tradeDuration = csvDuration > 0 ? csvDuration : undefined
      }

      // Si la durée n'a pas été trouvée dans le CSV ou est invalide, la calculer depuis les dates
      if (tradeDuration === undefined && enteredAt && exitedAt) {
        const durationMs = exitedAt.getTime() - enteredAt.getTime()
        if (durationMs > 0) {
          tradeDuration = durationMs / 1000 // Convertir en secondes
        }
      }

      const commissions =
        columnIndices["Commissions"] !== undefined
          ? parseFloat(values[columnIndices["Commissions"]] || "0")
          : undefined

      trades.push({
        id,
        contractName,
        enteredAt,
        exitedAt,
        entryPrice,
        exitPrice,
        fees,
        pnl,
        size,
        type,
        tradeDay,
        tradeDuration,
        commissions,
      })
    } catch (error) {
      console.warn(`Erreur lors du parsing de la ligne ${i + 1}:`, error)
      skippedLines++
      // Continuer avec les autres lignes
    }
  }

  // Log pour déboguer
  console.info(`[Parser] Trades parsés: ${trades.length}, Lignes ignorées: ${skippedLines}`)

  // Vérifier qu'on a trouvé au moins un trade
  if (trades.length === 0) {
    const totalDataLines = lines.length - 1 // Exclure l'en-tête
    if (totalDataLines === 0) {
      throw new Error("Le fichier CSV ne contient que l'en-tête, aucune donnée de trade trouvée")
    } else {
      // Afficher un exemple de ligne qui a échoué
      const firstDataLine = lines[1] || "Aucune ligne de données"
      throw new Error(
        `Aucun trade valide trouvé dans le fichier.\n` +
          `- ${totalDataLines} ligne(s) de données analysée(s)\n` +
          `- ${skippedLines} ligne(s) ignorée(s) ou invalide(s)\n` +
          `- Exemple de première ligne de données: "${firstDataLine.substring(0, 100)}"\n` +
          `Vérifiez que les colonnes requises (Id, EnteredAt, ExitedAt, PnL, TradeDay) sont présentes et que les dates sont au bon format.`
      )
    }
  }

  return trades
}

/**
 * Parser pour Tradovate - Format "Position History"
 * Format attendu: Position ID,Timestamp,Trade Date,Net Pos,Net Price,Bought,Avg. Buy,Sold,Avg. Sell,Account,Contract,Product,Product Description,Buy Price,Sell Price,P/L,Currency,Bought Timestamp,Sold Timestamp,Paired Qty
 */
export function parseTradovateCsv(csvContent: string, propfirm?: string): ParsedTrade[] {
  // Normaliser les retours à la ligne
  const normalizedContent = csvContent.replace(/\r\n/g, "\n").replace(/\r/g, "\n")
  const allLines = normalizedContent.split("\n")
  const lines = allLines.map((line) => line.trim()).filter((line) => line.length > 0)

  console.info(
    `[Parser Tradovate] Total lignes brutes: ${allLines.length}, Lignes non vides: ${lines.length}`
  )

  if (lines.length < 2) {
    const preview = allLines
      .slice(0, 3)
      .map((l, i) => `Ligne ${i + 1}: "${l}"`)
      .join("\n")
    throw new Error(
      `Le fichier CSV ne contient que l'en-tête, aucune donnée de trade trouvée.\n\n` +
        `Détails:\n` +
        `- Lignes non vides: ${lines.length}\n` +
        `- Lignes brutes totales: ${allLines.length}\n\n` +
        `Aperçu du fichier:\n${preview}\n\n` +
        `Vérifiez que votre fichier d'export depuis Tradeovate contient bien des trades. ` +
        `Le fichier doit contenir au moins une ligne de données après l'en-tête.`
    )
  }

  // Parser l'en-tête
  const header = parseCsvLine(lines[0])
  const columnIndices: Record<string, number> = {}
  header.forEach((col, index) => {
    const trimmedCol = col.trim()
    // Stocker la version originale
    columnIndices[trimmedCol] = index
    // Stocker la version en minuscules avec espaces normalisés
    const normalizedCol = trimmedCol.toLowerCase().replace(/\s+/g, " ")
    columnIndices[normalizedCol] = index
    // Stocker aussi sans espaces pour compatibilité
    columnIndices[trimmedCol.toLowerCase().replace(/\s+/g, "")] = index
  })

  // Vérifier que les colonnes requises sont présentes (avec différentes variantes)
  const findRequiredColumn = (variants: string[]): number | undefined => {
    for (const variant of variants) {
      if (columnIndices[variant] !== undefined) {
        return columnIndices[variant]
      }
    }
    return undefined
  }

  const tradeDateCol = findRequiredColumn(["Trade Date", "trade date", "tradedate", "TradeDate"])
  const pnlCol = findRequiredColumn(["P/L", "p/l", "pnl", "profit/loss", "Profit/Loss"])
  const boughtTimestampCol = findRequiredColumn([
    "Bought Timestamp",
    "bought timestamp",
    "boughttimestamp",
    "BoughtTimestamp",
  ])
  const soldTimestampCol = findRequiredColumn([
    "Sold Timestamp",
    "sold timestamp",
    "soldtimestamp",
    "SoldTimestamp",
  ])

  // Vérifier la présence de Pair ID (optionnel mais recommandé pour l'unicité)
  findRequiredColumn(["Pair ID", "pair id", "pairid", "PairID"])

  const missingColumns: string[] = []
  if (tradeDateCol === undefined) missingColumns.push("Trade Date")
  if (pnlCol === undefined) missingColumns.push("P/L")
  if (boughtTimestampCol === undefined) missingColumns.push("Bought Timestamp")
  if (soldTimestampCol === undefined) missingColumns.push("Sold Timestamp")

  if (missingColumns.length > 0) {
    throw new Error(
      `Colonnes requises manquantes: ${missingColumns.join(", ")}. ` +
        `Colonnes trouvées: ${header.join(", ")}`
    )
  }

  const trades: ParsedTrade[] = []
  let skippedLines = 0

  // Parser chaque ligne (sauf l'en-tête)
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    if (!line || line.trim() === "") {
      skippedLines++
      continue
    }

    const values = parseCsvLine(line)
    const hasValidData = values.some((val) => val && val.trim().length > 0)

    if (!hasValidData) {
      console.warn(`[Parser Tradovate] Ligne ${i + 1} ignorée: toutes les valeurs sont vides`)
      skippedLines++
      continue
    }

    try {
      // Récupérer les valeurs des colonnes avec différentes variantes
      const getValue = (variants: string[]): string => {
        for (const variant of variants) {
          // Essayer différentes variantes de la colonne
          const possibleKeys = [
            variant,
            variant.toLowerCase(),
            variant.toLowerCase().replace(/\s+/g, " "),
            variant.toLowerCase().replace(/\s+/g, ""),
          ]
          for (const key of possibleKeys) {
            const index = columnIndices[key]
            if (index !== undefined && values[index] !== undefined && values[index] !== null) {
              return values[index] || ""
            }
          }
        }
        return ""
      }

      const tradeDateStr = getValue(["Trade Date", "trade date", "tradedate"])
      const pnlStr = getValue(["P/L", "p/l", "pnl", "profit/loss"]) || "0"
      const boughtTimestampStr = getValue([
        "Bought Timestamp",
        "bought timestamp",
        "boughttimestamp",
      ])
      const soldTimestampStr = getValue(["Sold Timestamp", "sold timestamp", "soldtimestamp"])
      const buyPriceStr = getValue(["Buy Price", "buy price", "buyprice"]) || "0"
      const sellPriceStr = getValue(["Sell Price", "sell price", "sellprice"]) || "0"
      const pairedQtyStr = getValue(["Paired Qty", "paired qty", "pairedqty"]) || "0"
      const contractStr = getValue(["Contract", "contract"])
      const productStr = getValue(["Product", "product"])
      const positionIdStr = getValue(["Position ID", "position id", "positionid"]) || ""
      // Pair ID est l'identifiant unique de chaque trade (différent du Position ID qui est le même pour tous les trades d'une position)
      const pairIdStr = getValue(["Pair ID", "pair id", "pairid"]) || ""
      // Buy Fill ID et Sell Fill ID peuvent aussi être utilisés comme identifiants uniques
      const buyFillIdStr = getValue(["Buy Fill ID", "buy fill id", "buyfillid"]) || ""
      const sellFillIdStr = getValue(["Sell Fill ID", "sell fill id", "sellfillid"]) || ""

      // Parser les dates
      const tradeDate = parseDate(tradeDateStr)
      const enteredAt = boughtTimestampStr ? parseDate(boughtTimestampStr) : tradeDate
      const exitedAt = soldTimestampStr ? parseDate(soldTimestampStr) : tradeDate

      // Parser les valeurs numériques
      const pnl = parseFloat(pnlStr || "0")
      const buyPrice = parseFloat(buyPriceStr || "0")
      const sellPrice = parseFloat(sellPriceStr || "0")
      const size = parseFloat(pairedQtyStr || "0")

      // Déterminer le nom du contrat
      const contractName = contractStr || productStr || "Unknown"

      // Calculer la durée du trade en secondes
      let tradeDuration: number | undefined
      if (enteredAt && exitedAt) {
        const durationMs = exitedAt.getTime() - enteredAt.getTime()
        if (durationMs > 0) {
          tradeDuration = durationMs / 1000 // Convertir en secondes
        }
      }

      // Calculer les fees pour Tradeovate
      // Chercher des colonnes de fees dans le CSV (si disponibles)
      const feesStr = getValue([
        "Fees",
        "fees",
        "Commission",
        "commission",
        "Total Fees",
        "total fees",
        "Fee",
        "fee",
      ])
      const commissionsStr = getValue([
        "Commissions",
        "commissions",
        "Exchange Fees",
        "exchange fees",
        "Exchange Fee",
        "exchange fee",
      ])

      // Utiliser les fees du CSV si disponibles, sinon calculer basé sur le symbole et le nombre de contrats
      let fees = 0
      let commissions = 0

      // Pour les comptes Lucid, on utilise uniquement les commissions Lucid, pas les fees Tradovate standards
      if (propfirm === "LUCID") {
        // Pour Lucid, calculer uniquement les commissions selon les tarifs Lucid
        if (commissionsStr && commissionsStr.trim() !== "") {
          // Commissions explicites dans le CSV
          commissions = parseFloat(commissionsStr || "0")
        } else if (Math.abs(size) > 0) {
          const symbol = extractSymbolFromContract(contractStr, productStr)
          if (symbol) {
            commissions = getLucidTradovateCommissions(symbol, size)
          }
        }
        // Pas de fees pour Lucid (les commissions remplacent les fees)
      } else {
        // Pour les autres propfirms, calculer les fees Tradovate standards
        if (feesStr && feesStr.trim() !== "") {
          // Fees explicites dans le CSV
          fees = parseFloat(feesStr || "0")
        } else if (Math.abs(size) > 0) {
          // Extraire le symbole depuis le contrat ou le product
          const symbol = extractSymbolFromContract(contractStr, productStr)

          if (symbol) {
            // Calculer les fees basées sur le symbole et le nombre de contrats (round turn)
            fees = getTradovateFees(symbol, size)
          } else {
            // Fallback: estimation par défaut si le symbole n'est pas trouvé
            console.warn(
              `[Parser Tradovate] Impossible d'extraire le symbole depuis "${contractStr}" / "${productStr}", utilisation de l'estimation par défaut`
            )
            fees = Math.abs(size) * 1.5
          }
        }

        if (commissionsStr && commissionsStr.trim() !== "") {
          // Commissions explicites dans le CSV
          commissions = parseFloat(commissionsStr || "0")
        }
      }

      // Déterminer le type de trade (Long ou Short basé sur le P/L et les prix)
      const type =
        buyPrice > 0 && sellPrice > 0 ? (sellPrice > buyPrice ? "Long" : "Short") : "Unknown"

      // Générer un ID unique basé sur les identifiants du trade pour éviter les doublons
      // Priorité: Pair ID > Buy Fill ID + Sell Fill ID > Position ID > Hash basé sur les données
      let tradeId: string

      // 1. Utiliser Pair ID en priorité (identifiant unique de chaque trade dans Tradovate)
      if (pairIdStr && pairIdStr.trim() !== "") {
        tradeId = `tradovate-pair-${pairIdStr.trim()}`
        console.info(`[Parser Tradovate] Utilisation du Pair ID: ${tradeId}`)
      }
      // 2. Sinon, utiliser la combinaison Buy Fill ID + Sell Fill ID
      else if (
        buyFillIdStr &&
        sellFillIdStr &&
        buyFillIdStr.trim() !== "" &&
        sellFillIdStr.trim() !== ""
      ) {
        tradeId = `tradovate-fills-${buyFillIdStr.trim()}-${sellFillIdStr.trim()}`
        console.info(`[Parser Tradovate] Utilisation des Fill IDs: ${tradeId}`)
      }
      // 3. Sinon, utiliser Position ID (mais attention, il peut être le même pour plusieurs trades)
      else if (
        positionIdStr &&
        positionIdStr.trim() !== "" &&
        positionIdStr !== `trade-${i}` &&
        !positionIdStr.startsWith("trade-")
      ) {
        // Si on utilise Position ID, on doit le combiner avec d'autres données pour le rendre unique
        // Utiliser Position ID + Buy Fill ID + Sell Fill ID ou timestamps
        const uniqueSuffix =
          buyFillIdStr && sellFillIdStr
            ? `${buyFillIdStr.trim()}-${sellFillIdStr.trim()}`
            : `${enteredAt.getTime()}-${exitedAt.getTime()}`
        tradeId = `tradovate-pos-${positionIdStr.trim()}-${uniqueSuffix}`
        console.info(`[Parser Tradovate] Utilisation du Position ID avec suffixe: ${tradeId}`)
      }
      // 4. Fallback: créer un hash basé sur les caractéristiques du trade
      else {
        // Utiliser: contract + enteredAt + exitedAt + size + entryPrice + exitPrice + pnl
        const tradeSignature = `${contractName}-${enteredAt.getTime()}-${exitedAt.getTime()}-${size}-${buyPrice}-${sellPrice}-${pnl}`
        try {
          const hash = Buffer.from(tradeSignature)
            .toString("base64")
            .replace(/[+/=]/g, "")
            .substring(0, 32)
          tradeId = `tradovate-hash-${hash}`
          console.info(`[Parser Tradovate] Utilisation d'un hash généré: ${tradeId}`)
        } catch (_error) {
          // Fallback si Buffer n'est pas disponible
          const simpleHash = tradeSignature.split("").reduce((acc, char) => {
            const hash = (acc << 5) - acc + char.charCodeAt(0)
            return hash & hash
          }, 0)
          tradeId = `tradovate-hash-${Math.abs(simpleHash).toString(36)}`
          console.info(`[Parser Tradovate] Utilisation d'un hash simple: ${tradeId}`)
        }
      }

      trades.push({
        id: tradeId,
        contractName,
        enteredAt,
        exitedAt,
        entryPrice: buyPrice,
        exitPrice: sellPrice,
        fees,
        pnl,
        size: Math.abs(size),
        type,
        tradeDay: tradeDate,
        tradeDuration,
        commissions,
      })
    } catch (error) {
      console.warn(`[Parser Tradovate] Erreur lors du parsing de la ligne ${i + 1}:`, error)
      skippedLines++
    }
  }

  console.info(
    `[Parser Tradovate] Trades parsés: ${trades.length}, Lignes ignorées: ${skippedLines}`
  )

  // Vérifier qu'on a trouvé au moins un trade
  if (trades.length === 0) {
    const totalDataLines = lines.length - 1
    if (totalDataLines === 0) {
      throw new Error("Le fichier CSV ne contient que l'en-tête, aucune donnée de trade trouvée")
    } else {
      const firstDataLine = lines[1] || "Aucune ligne de données"
      throw new Error(
        `Aucun trade valide trouvé dans le fichier Tradeovate.\n` +
          `- ${totalDataLines} ligne(s) de données analysée(s)\n` +
          `- ${skippedLines} ligne(s) ignorée(s) ou invalide(s)\n` +
          `- Exemple de première ligne de données: "${firstDataLine.substring(0, 100)}"\n` +
          `Vérifiez que les colonnes requises (Trade Date, P/L, Bought Timestamp, Sold Timestamp) sont présentes et que les dates sont au bon format.`
      )
    }
  }

  return trades
}

/**
 * Grouper les trades par jour et calculer le PnL journalier
 */
export function groupTradesByDay(trades: ParsedTrade[]): DailyPnlSummary[] {
  const dailyMap = new Map<string, DailyPnlSummary>()

  for (const trade of trades) {
    const dateKey = formatDateKey(trade.tradeDay)

    if (!dailyMap.has(dateKey)) {
      dailyMap.set(dateKey, {
        date: dateKey,
        totalPnl: 0,
        totalFees: 0,
        totalCommissions: 0,
        tradeCount: 0,
        trades: [],
      })
    }

    const daily = dailyMap.get(dateKey)!
    // Le P/L dans le CSV Tradeovate est généralement BRUT (avant fees)
    // On doit soustraire les fees pour obtenir le PnL net
    daily.totalPnl += trade.pnl
    daily.totalFees += trade.fees
    daily.totalCommissions += trade.commissions || 0
    daily.tradeCount += 1
    daily.trades.push(trade)
  }

  // Calculer le PnL net (PnL brut - fees - commissions) pour chaque jour
  const dailySummaries = Array.from(dailyMap.values())
  for (const day of dailySummaries) {
    // Le PnL net = PnL brut - fees - commissions
    day.totalPnl = day.totalPnl - day.totalFees - day.totalCommissions
  }

  // Trier par date (du plus ancien au plus récent)
  return dailySummaries.sort((a, b) => a.date.localeCompare(b.date))
}

/**
 * Helper pour parser une ligne CSV en gérant les virgules dans les valeurs entre guillemets
 */
function parseCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ""
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === "," && !inQuotes) {
      result.push(current.trim())
      current = ""
    } else {
      current += char
    }
  }

  result.push(current.trim())
  return result
}

/**
 * Helper pour parser une date depuis différents formats
 */
function parseDate(dateStr: string): Date {
  if (!dateStr || dateStr.trim() === "") {
    throw new Error("Date vide")
  }

  // Nettoyer la chaîne (enlever les guillemets, espaces en trop)
  const cleaned = dateStr.trim().replace(/['"]/g, "")

  // Essayer de parser directement avec Date
  let parsed = new Date(cleaned)
  if (!isNaN(parsed.getTime())) {
    return parsed
  }

  // Essayer différents formats manuellement
  // Format: YYYY-MM-DD HH:MM:SS
  const isoMatch = cleaned.match(/^(\d{4})-(\d{2})-(\d{2})(?:\s+(\d{2}):(\d{2}):(\d{2}))?/)
  if (isoMatch) {
    const [, year, month, day, hour = "0", minute = "0", second = "0"] = isoMatch
    parsed = new Date(
      parseInt(year, 10),
      parseInt(month, 10) - 1,
      parseInt(day, 10),
      parseInt(hour, 10),
      parseInt(minute, 10),
      parseInt(second, 10)
    )
    if (!isNaN(parsed.getTime())) {
      return parsed
    }
  }

  // Format: MM/DD/YYYY HH:MM:SS
  const usMatch = cleaned.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}):(\d{2}))?/)
  if (usMatch) {
    const [, month, day, year, hour = "0", minute = "0", second = "0"] = usMatch
    parsed = new Date(
      parseInt(year, 10),
      parseInt(month, 10) - 1,
      parseInt(day, 10),
      parseInt(hour, 10),
      parseInt(minute, 10),
      parseInt(second, 10)
    )
    if (!isNaN(parsed.getTime())) {
      return parsed
    }
  }

  // Format: DD/MM/YYYY HH:MM:SS
  const euMatch = cleaned.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}):(\d{2}))?/)
  if (euMatch) {
    const [, day, month, year, hour = "0", minute = "0", second = "0"] = euMatch
    parsed = new Date(
      parseInt(year, 10),
      parseInt(month, 10) - 1,
      parseInt(day, 10),
      parseInt(hour, 10),
      parseInt(minute, 10),
      parseInt(second, 10)
    )
    if (!isNaN(parsed.getTime())) {
      return parsed
    }
  }

  throw new Error(`Format de date non reconnu: ${dateStr}`)
}

/**
 * Helper pour formater une date en clé YYYY-MM-DD
 */
function formatDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

/**
 * Helper pour trouver une colonne par plusieurs noms possibles
 */
function _findColumn(columnIndices: Record<string, number>, names: string[]): number | undefined {
  for (const name of names) {
    if (columnIndices[name] !== undefined) {
      return columnIndices[name]
    }
  }
  return undefined
}
