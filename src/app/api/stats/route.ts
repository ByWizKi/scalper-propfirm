import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

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

    const netProfit = totalPnl - totalInvested

    // Calculer le ROI global
    const globalRoi = totalInvested > 0 ? (netProfit / totalInvested) * 100 : 0

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
      orderBy: {
        date: "asc",
      },
    })

    // Calculer le PnL mensuel (30 derniers jours)
    const monthlyPnl = recentPnl.reduce((sum, entry) => sum + entry.amount, 0)

    return NextResponse.json({
      totalAccounts,
      activeAccounts,
      fundedAccounts,
      totalInvested,
      totalPnl,
      totalWithdrawals,
      netProfit,
      globalRoi,
      evalSuccessRate,
      validatedEval,
      failedEval,
      activeEval: evalAccounts.filter((a) => a.status === "ACTIVE").length,
      avgValidationDays,
      monthlyPnl,
      recentPnl,
    })
  } catch (_error) {
    console.error("API Error:", _error)
    return NextResponse.json(
      { message: "Erreur lors de la récupération des statistiques" },
      { status: 500 }
    )
  }
}
