/**
 * Types et interfaces centralisés pour les comptes
 */

export enum PropfirmType {
  TOPSTEP = "TOPSTEP",
  TAKEPROFITTRADER = "TAKEPROFITTRADER",
  APEX = "APEX",
  FTMO = "FTMO",
  MYFUNDEDFUTURES = "MYFUNDEDFUTURES",
  BULENOX = "BULENOX",
  PHIDIAS = "PHIDIAS",
  OTHER = "OTHER",
}

export enum AccountType {
  EVAL = "EVAL",
  FUNDED = "FUNDED",
}

export enum AccountStatus {
  ACTIVE = "ACTIVE",
  VALIDATED = "VALIDATED",
  FAILED = "FAILED",
  ARCHIVED = "ARCHIVED",
}

export interface AccountRules {
  profitTarget: number
  maxDrawdown: number
  dailyLossLimit: number
  consistencyRule: number // Pourcentage
  minTradingDays?: number
  maxContracts?: {
    mini: number
    micro: number
  }
}

export interface WithdrawalRules {
  taxRate: number
  requiresCycles: boolean
  cycleRequirements?: {
    daysPerCycle: number
    minDailyProfit: number
    withdrawalPercentage: number
  }
  hasBuffer: boolean
}

// DTO pour la création de compte
export interface CreateAccountDTO {
  name: string
  propfirm: PropfirmType
  size: number
  accountType: AccountType
  pricePaid: number
  linkedEvalId?: string
  notes?: string
}

// DTO pour la mise à jour de compte
export interface UpdateAccountDTO extends Partial<CreateAccountDTO> {
  status?: AccountStatus
}

// DTO pour les statistiques de compte
export interface AccountStatsDTO {
  totalPnl: number
  totalWithdrawals: number
  currentBalance: number
  netProfit: number
  roi: number
  totalInvested: number
  buffer?: number
  availableForWithdrawal?: number
}
