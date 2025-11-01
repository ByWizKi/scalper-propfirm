/**
 * Constantes de l'application
 * Centralise toutes les valeurs constantes pour éviter la duplication
 */

import { PropfirmType, AccountType, AccountStatus } from "@/types/account.types"

// Labels d'affichage
export const PROPFIRM_LABELS: Record<PropfirmType, string> = {
  [PropfirmType.TOPSTEP]: "TopStep",
  [PropfirmType.TAKEPROFITTRADER]: "Take Profit Trader",
  [PropfirmType.APEX]: "Apex",
  [PropfirmType.FTMO]: "FTMO",
  [PropfirmType.MYFUNDEDFUTURES]: "My Funded Futures",
  [PropfirmType.BULENOX]: "Bulenox",
  [PropfirmType.OTHER]: "Autre",
}

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  [AccountType.EVAL]: "Évaluation",
  [AccountType.FUNDED]: "Financé",
}

export const STATUS_LABELS: Record<AccountStatus, string> = {
  [AccountStatus.ACTIVE]: "Actif",
  [AccountStatus.VALIDATED]: "Validé",
  [AccountStatus.FAILED]: "Échoué",
  [AccountStatus.ARCHIVED]: "Archivé",
}

export const STATUS_COLORS: Record<AccountStatus, string> = {
  [AccountStatus.ACTIVE]: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  [AccountStatus.VALIDATED]: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  [AccountStatus.FAILED]: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  [AccountStatus.ARCHIVED]: "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300",
}

// Taux de change (devrait idéalement venir d'une API)
export const USD_TO_EUR = 0.92

// Tailles de compte disponibles par propfirm
export const ACCOUNT_SIZES_BY_PROPFIRM: Record<
  PropfirmType,
  Array<{ value: string; label: string }>
> = {
  [PropfirmType.TOPSTEP]: [
    { value: "50000", label: "50K" },
    { value: "100000", label: "100K" },
    { value: "150000", label: "150K" },
  ],
  [PropfirmType.TAKEPROFITTRADER]: [
    { value: "25000", label: "25K" },
    { value: "50000", label: "50K" },
    { value: "75000", label: "75K" },
    { value: "100000", label: "100K" },
    { value: "150000", label: "150K" },
  ],
  [PropfirmType.APEX]: [
    { value: "25000", label: "25K" },
    { value: "50000", label: "50K" },
    { value: "100000", label: "100K" },
    { value: "150000", label: "150K" },
    { value: "250000", label: "250K" },
    { value: "300000", label: "300K" },
  ],
  [PropfirmType.FTMO]: [],
  [PropfirmType.MYFUNDEDFUTURES]: [],
  [PropfirmType.BULENOX]: [
    { value: "25000", label: "25K" },
    { value: "50000", label: "50K" },
    { value: "100000", label: "100K" },
    { value: "150000", label: "150K" },
    { value: "250000", label: "250K" },
  ],
  [PropfirmType.OTHER]: [],
}
