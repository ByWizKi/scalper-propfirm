import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getNetWithdrawalAmount } from "@/lib/withdrawal-utils"

export async function GET() {
  try {
    const session = (await getServerSession(authOptions)) as { user?: { id?: string } } | null

    if (!session?.user?.id) {
      return NextResponse.json({ message: "Non authentifié" }, { status: 401 })
    }

    // Récupérer tous les comptes
    const accounts = await prisma.propfirmAccount.findMany({
      where: {
        userId: session.user.id,
      },
      include: {
        pnlEntries: true,
        withdrawals: true,
      },
    })

    // Calculer les statistiques
    const totalAccounts = accounts.length
    const activeAccounts = accounts.filter((a) => a.status === "ACTIVE").length
    const fundedAccounts = accounts.filter((a) => a.accountType === "FUNDED").length

    const totalInvested = accounts.reduce((sum, acc) => sum + acc.pricePaid, 0)

    const totalPnl = accounts.reduce((sum, acc) => {
      const accountPnl = acc.pnlEntries.reduce((pnlSum, entry) => pnlSum + entry.amount, 0)
      return sum + accountPnl
    }, 0)

    const totalWithdrawals = accounts.reduce((sum, acc) => {
      const accountWithdrawals = acc.withdrawals.reduce((wSum, w) => wSum + w.amount, 0)
      return sum + accountWithdrawals
    }, 0)

    // Calculer les retraits nets (après taxes)
    const totalNetWithdrawals = accounts.reduce((sum, acc) => {
      const accountNetWithdrawals = acc.withdrawals.reduce((wSum, w) => {
        return wSum + getNetWithdrawalAmount(w.amount, acc.propfirm)
      }, 0)
      return sum + accountNetWithdrawals
    }, 0)

    const netProfit = totalPnl - totalInvested

    // Calculer le ROI global basé sur les retraits nets
    const globalRoi =
      totalInvested > 0 ? ((totalNetWithdrawals - totalInvested) / totalInvested) * 100 : 0

    // Calculer le taux de réussite des évaluations
    const evalAccounts = accounts.filter((a) => a.accountType === "EVAL")
    const validatedEval = evalAccounts.filter((a) => a.status === "VALIDATED").length
    const failedEval = evalAccounts.filter((a) => a.status === "FAILED").length
    const totalEvalCompleted = validatedEval + failedEval
    const evalSuccessRate = totalEvalCompleted > 0 ? (validatedEval / totalEvalCompleted) * 100 : 0

    // Calculer la durée moyenne de validation (en jours)
    const validatedAccounts = accounts.filter((a) => a.status === "VALIDATED")
    let avgValidationDays = 0
    if (validatedAccounts.length > 0) {
      const totalDays = validatedAccounts.reduce((sum, acc) => {
        const createdAt = new Date(acc.createdAt)
        const updatedAt = new Date(acc.updatedAt)
        const daysDiff = Math.ceil(
          (updatedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
        )
        return sum + daysDiff
      }, 0)
      avgValidationDays = Math.round(totalDays / validatedAccounts.length)
    }

    // Récupérer les PnL récentes pour le graphique (30 derniers jours)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const recentPnl = await prisma.pnlEntry.findMany({
      where: {
        userId: session.user.id,
        date: {
          gte: thirtyDaysAgo,
        },
      },
      include: {
        account: true,
      },
      orderBy: {
        date: "asc",
      },
    })

    // Calculer le PnL mensuel (30 derniers jours) - uniquement comptes actifs financés hors buffer
    const monthlyPnl = recentPnl.reduce((sum, entry) => {
      const account = accounts.find((acc) => acc.id === entry.accountId)
      if (!account) return sum

      // Uniquement les comptes ACTIVE et FUNDED
      if (account.status !== "ACTIVE" || account.accountType !== "FUNDED") {
        return sum
      }

      // Exclure les entrées buffer pour les comptes financés
      const isFundedBufferEntry =
        account.accountType === "FUNDED" && entry.notes?.toLowerCase().includes("buffer")
      if (isFundedBufferEntry) {
        return sum
      }

      return sum + entry.amount
    }, 0)

    // Nouvelles statistiques
    // 1. Total taxes payées
    const totalTaxes = totalWithdrawals - totalNetWithdrawals

    // 2. Nombre de retraits effectués
    const totalWithdrawalCount = accounts.reduce((sum, acc) => sum + acc.withdrawals.length, 0)

    // 3. PnL moyen par compte
    const avgPnlPerAccount = totalAccounts > 0 ? totalPnl / totalAccounts : 0

    // 4. Meilleur jour de trading
    const dailyPnl: Record<string, number> = {}
    accounts.forEach((acc) => {
      acc.pnlEntries.forEach((entry) => {
        const dateKey = new Date(entry.date).toISOString().split("T")[0]
        dailyPnl[dateKey] = (dailyPnl[dateKey] || 0) + entry.amount
      })
    })
    const bestDay = Object.entries(dailyPnl).reduce(
      (best, [date, amount]) => (amount > best.amount ? { date, amount } : best),
      { date: "", amount: -Infinity }
    )

    // 5. Pire jour de trading
    const worstDay = Object.entries(dailyPnl).reduce(
      (worst, [date, amount]) => (amount < worst.amount ? { date, amount } : worst),
      { date: "", amount: Infinity }
    )

    // 6. Nombre de jours de trading
    const tradingDays = Object.keys(dailyPnl).length

    // 7. Taux de comptes actifs
    const activeAccountsRate = totalAccounts > 0 ? (activeAccounts / totalAccounts) * 100 : 0

    // 8. PnL hebdomadaire (7 derniers jours)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const weeklyPnl = recentPnl
      .filter((entry) => new Date(entry.date) >= sevenDaysAgo)
      .reduce((sum, entry) => {
        const account = accounts.find((acc) => acc.id === entry.accountId)
        if (!account) return sum
        if (account.status !== "ACTIVE" || account.accountType !== "FUNDED") {
          return sum
        }
        const isFundedBufferEntry =
          account.accountType === "FUNDED" && entry.notes?.toLowerCase().includes("buffer")
        if (isFundedBufferEntry) {
          return sum
        }
        return sum + entry.amount
      }, 0)

    // 9. Retraits bruts (avant taxes)
    // Déjà calculé : totalWithdrawals

    // 10. Nombre de comptes évaluation actifs
    const activeEvalCount = evalAccounts.filter((a) => a.status === "ACTIVE").length

    // 11. PnL moyen par jour de trading
    const avgPnlPerTradingDay = tradingDays > 0 ? totalPnl / tradingDays : 0

    // 12. Nombre de comptes financés actifs
    const activeFundedAccounts = accounts.filter(
      (a) => a.status === "ACTIVE" && a.accountType === "FUNDED"
    ).length

    // 13. Total capital sous gestion
    const totalCapitalUnderManagement = accounts
      .filter((a) => a.status === "ACTIVE")
      .reduce((sum, acc) => sum + acc.size, 0)

    // 14. Taux de réussite global (tous comptes)
    const totalCompletedAccounts = accounts.filter(
      (a) => a.status === "VALIDATED" || a.status === "FAILED"
    ).length
    const totalValidatedAccounts = accounts.filter((a) => a.status === "VALIDATED").length
    const globalSuccessRate =
      totalCompletedAccounts > 0 ? (totalValidatedAccounts / totalCompletedAccounts) * 100 : 0

    // 15. Retrait moyen
    const avgWithdrawal = totalWithdrawalCount > 0 ? totalWithdrawals / totalWithdrawalCount : 0

    // 16. PnL total des comptes financés uniquement
    const fundedAccountsPnl = accounts
      .filter((a) => a.accountType === "FUNDED")
      .reduce((sum, acc) => {
        const accountPnl = acc.pnlEntries.reduce((pnlSum, entry) => pnlSum + entry.amount, 0)
        return sum + accountPnl
      }, 0)

    // 17. PnL total des comptes d'évaluation uniquement
    const evalAccountsPnl = accounts
      .filter((a) => a.accountType === "EVAL")
      .reduce((sum, acc) => {
        const accountPnl = acc.pnlEntries.reduce((pnlSum, entry) => pnlSum + entry.amount, 0)
        return sum + accountPnl
      }, 0)

    // 18. Nombre de jours depuis le premier compte
    let daysSinceFirstAccount = 0
    if (accounts.length > 0) {
      const firstAccountDate = new Date(
        Math.min(...accounts.map((a) => new Date(a.createdAt).getTime()))
      )
      const today = new Date()
      daysSinceFirstAccount = Math.ceil(
        (today.getTime() - firstAccountDate.getTime()) / (1000 * 60 * 60 * 24)
      )
    }

    // 19. Taux de retrait moyen (retraits / capital total)
    const withdrawalRate =
      totalCapitalUnderManagement > 0
        ? (totalNetWithdrawals / totalCapitalUnderManagement) * 100
        : 0

    // 20. Nombre de comptes archivés
    const archivedAccounts = accounts.filter((a) => a.status === "ARCHIVED").length

    return NextResponse.json({
      totalAccounts,
      activeAccounts,
      fundedAccounts,
      totalInvested,
      totalPnl,
      totalWithdrawals,
      totalNetWithdrawals,
      netProfit,
      globalRoi,
      evalSuccessRate,
      validatedEval,
      failedEval,
      activeEval: activeEvalCount,
      avgValidationDays,
      monthlyPnl,
      recentPnl,
      // Nouvelles statistiques
      totalTaxes,
      totalWithdrawalCount,
      avgPnlPerAccount,
      bestDay: bestDay.amount !== -Infinity ? bestDay.amount : 0,
      bestDayDate: bestDay.date,
      worstDay: worstDay.amount !== Infinity ? worstDay.amount : 0,
      worstDayDate: worstDay.date,
      tradingDays,
      activeAccountsRate,
      weeklyPnl,
      // Statistiques supplémentaires
      avgPnlPerTradingDay,
      activeFundedAccounts,
      totalCapitalUnderManagement,
      globalSuccessRate,
      avgWithdrawal,
      fundedAccountsPnl,
      evalAccountsPnl,
      daysSinceFirstAccount,
      withdrawalRate,
      archivedAccounts,
    })
  } catch (_error) {
    console.error("API Error:", _error)
    return NextResponse.json(
      { message: "Erreur lors de la récupération des statistiques" },
      { status: 500 }
    )
  }
}
