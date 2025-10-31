"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, format, isSameMonth, addMonths, subMonths } from "date-fns"
import { fr } from "date-fns/locale"
import { getNetWithdrawalAmount } from "@/lib/withdrawal-utils"

interface Withdrawal {
  id: string
  date: string
  amount: number
  notes?: string
  account: {
    propfirm: string
  }
}

interface WithdrawalsCalendarProps {
  withdrawals: Withdrawal[]
}

export function WithdrawalsCalendar({ withdrawals }: WithdrawalsCalendarProps) {
  const [currentMonth, setCurrentMonth] = React.useState(new Date())

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  const formatCurrencyEUR = (amount: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
    }).format(amount)
  }

  const USD_TO_EUR = 0.92

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 }) // Week starts on Monday
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 }) // Week ends on Sunday

  // Get all days in calendar
  const allDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

  // Filter to keep only weekdays (Monday to Friday)
  const calendarDays = allDays.filter(day => {
    const dayOfWeek = day.getDay()
    return dayOfWeek >= 1 && dayOfWeek <= 5 // 1 = Monday, 5 = Friday
  })

  // Group withdrawals by day
  const dailyWithdrawals: Record<string, Withdrawal[]> = {}
  withdrawals.forEach((withdrawal) => {
    const dateKey = withdrawal.date.split('T')[0]
    if (!dailyWithdrawals[dateKey]) {
      dailyWithdrawals[dateKey] = []
    }
    dailyWithdrawals[dateKey].push(withdrawal)
  })

  // Group days into weeks (5 days per week now)
  const weekRows: Date[][] = []
  for (let i = 0; i < calendarDays.length; i += 5) {
    weekRows.push(calendarDays.slice(i, i + 5))
  }

  const previousMonth = () => setCurrentMonth(subMonths(currentMonth, 1))
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1))

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Calendrier des Retraits Nets</CardTitle>
            <CardDescription>
              Montants après taxes (20% pour TakeProfitTrader)
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={previousMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-sm font-medium min-w-[140px] text-center">
              {format(currentMonth, "MMMM yyyy", { locale: fr })}
            </div>
            <Button variant="outline" size="icon" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Header days */}
        <div className="grid grid-cols-6 gap-1 md:gap-2 mb-2"> {/* 5 days + 1 for "Semaine" */}
          {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sem."].map((day) => (
            <div
              key={day}
              className="text-center text-xs md:text-sm font-medium text-zinc-600 dark:text-zinc-400 py-1 md:py-2"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="space-y-2">
          {weekRows.map((week, weekIdx) => {
            // Calculate weekly total (net amounts)
            const weekTotal = week.reduce((sum, day) => {
              const dateKey = format(day, "yyyy-MM-dd")
              const dayWithdrawals = dailyWithdrawals[dateKey] || []
              return sum + dayWithdrawals.reduce((s, w) => s + getNetWithdrawalAmount(w.amount, w.account.propfirm), 0)
            }, 0)

            const weekNumber = Math.floor((weekIdx * 5) / 7) + 1

            return (
              <div key={weekIdx} className="grid grid-cols-6 gap-1 md:gap-2"> {/* 5 days + 1 for "Semaine" */}
                {/* The 5 weekdays */}
                {week.map((day, dayIdx) => {
                  const dateKey = format(day, "yyyy-MM-dd")
                  const dayWithdrawals = dailyWithdrawals[dateKey] || []
                  const dayTotal = dayWithdrawals.reduce((sum, w) => sum + getNetWithdrawalAmount(w.amount, w.account.propfirm), 0)
                  const isCurrentMonth = isSameMonth(day, currentMonth)

                  return (
                    <div
                      key={dayIdx}
                      className={`min-h-[80px] md:min-h-[100px] p-1.5 md:p-3 rounded-lg border ${
                        !isCurrentMonth
                          ? "bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
                          : dayTotal > 0
                          ? "border-green-300 bg-green-50 dark:border-green-900 dark:bg-green-950"
                          : "border-zinc-200 dark:border-zinc-800"
                      }`}
                    >
                      <div className="text-xs md:text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-1 md:mb-2">
                        {format(day, "d")}
                      </div>
                      {dayWithdrawals.length > 0 && (
                        <div className="space-y-0.5 md:space-y-1">
                          <div className="text-xs md:text-sm font-bold text-green-600 dark:text-green-400 truncate">
                            +{formatCurrency(dayTotal)}
                          </div>
                          <div className="text-[10px] md:text-xs text-green-600 dark:text-green-400 truncate">
                            {formatCurrencyEUR(dayTotal * USD_TO_EUR)}
                          </div>
                          <div className="text-[10px] md:text-xs text-zinc-500 hidden md:block">
                            {dayWithdrawals.length} retrait{dayWithdrawals.length > 1 ? "s" : ""}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}

                {/* Weekly summary column */}
                <div
                  className={`min-h-[80px] md:min-h-[100px] p-1.5 md:p-3 rounded-lg border-2 ${
                    weekTotal > 0
                      ? "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950"
                      : "border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1 md:mb-2">
                    <span className="text-xs md:text-sm font-medium text-zinc-600 dark:text-zinc-400">
                      S{weekNumber}
                    </span>
                  </div>
                  {weekTotal > 0 && (
                    <>
                      <div className="text-sm md:text-lg font-bold text-green-600 dark:text-green-400 mb-0.5 md:mb-1 truncate">
                        +{formatCurrency(weekTotal)}
                      </div>
                      <div className="text-[10px] md:text-xs text-green-600 dark:text-green-400 truncate">
                        {formatCurrencyEUR(weekTotal * USD_TO_EUR)}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

