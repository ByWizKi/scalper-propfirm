import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

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
    const activeAccounts = accounts.filter(a => a.status === "ACTIVE").length
    const fundedAccounts = accounts.filter(a => a.accountType === "FUNDED").length

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

    return NextResponse.json({
      totalAccounts,
      activeAccounts,
      fundedAccounts,
      totalInvested,
      totalPnl,
      totalWithdrawals,
      netProfit,
      recentPnl,
    })
  } catch (error) {
    console.error("Erreur lors de la récupération des statistiques:", error)
    return NextResponse.json(
      { message: "Erreur lors de la récupération des statistiques" },
      { status: 500 }
    )
  }
}

