"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, startOfWeek, endOfWeek, addMonths, subMonths } from "date-fns"
import { fr } from "date-fns/locale"

interface PnlEntry {
  id: string
  date: string
  amount: number
  notes?: string
}

interface MonthlyCalendarProps {
  pnlEntries: PnlEntry[]
}

export function MonthlyCalendar({ pnlEntries }: MonthlyCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  // Calculer le P/L par jour
  const dailyPnl = pnlEntries.reduce((acc, entry) => {
    const dateKey = format(new Date(entry.date), "yyyy-MM-dd")

    if (!acc[dateKey]) {
      acc[dateKey] = {
        amount: 0,
        count: 0,
      }
    }

    acc[dateKey].amount += entry.amount
    acc[dateKey].count += 1

    return acc
  }, {} as Record<string, { amount: number; count: number }>)

  // Calculer le P/L mensuel
  const monthlyTotal = pnlEntries
    .filter(entry => {
      const entryDate = new Date(entry.date)
      return entryDate.getMonth() === currentMonth.getMonth() &&
             entryDate.getFullYear() === currentMonth.getFullYear()
    })
    .reduce((sum, entry) => sum + entry.amount, 0)

  const monthlyTrades = pnlEntries
    .filter(entry => {
      const entryDate = new Date(entry.date)
      return entryDate.getMonth() === currentMonth.getMonth() &&
             entryDate.getFullYear() === currentMonth.getFullYear()
    }).length

  // Obtenir tous les jours à afficher (incluant les jours des mois précédent/suivant)
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })

  const allDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

  // Filtrer pour garder uniquement les jours de semaine (lundi à vendredi)
  const calendarDays = allDays.filter(day => {
    const dayOfWeek = day.getDay()
    return dayOfWeek >= 1 && dayOfWeek <= 5 // 1 = lundi, 5 = vendredi
  })

  // Calculer le P/L par semaine (tous les jours, pas seulement les jours de semaine)
  const weeklyPnl: Record<number, { amount: number; count: number; days: Date[] }> = {}

  allDays.forEach((day) => {
    if (isSameMonth(day, currentMonth)) {
      const weekNumber = Math.ceil((day.getDate() + startOfMonth(day).getDay()) / 7)
      const dateKey = format(day, "yyyy-MM-dd")

      if (!weeklyPnl[weekNumber]) {
        weeklyPnl[weekNumber] = { amount: 0, count: 0, days: [] }
      }

      weeklyPnl[weekNumber].days.push(day)

      if (dailyPnl[dateKey]) {
        weeklyPnl[weekNumber].amount += dailyPnl[dateKey].amount
        weeklyPnl[weekNumber].count += dailyPnl[dateKey].count
      }
    }
  })

  // Grouper les jours par semaine
  const weekRows: Date[][] = []
  let currentWeek: Date[] = []

  calendarDays.forEach((day, index) => {
    currentWeek.push(day)

    // Si c'est vendredi ou le dernier jour, commencer une nouvelle semaine
    if (day.getDay() === 5 || index === calendarDays.length - 1) {
      weekRows.push([...currentWeek])
      currentWeek = []
    }
  })

  const goToPreviousMonth = () => setCurrentMonth(subMonths(currentMonth, 1))
  const goToNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1))
  const goToToday = () => setCurrentMonth(new Date())

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={goToPreviousMonth}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <CardTitle className="text-xl">
              {format(currentMonth, "MMMM yyyy", { locale: fr })}
            </CardTitle>
            <Button
              variant="outline"
              size="icon"
              onClick={goToNextMonth}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm text-zinc-600 dark:text-zinc-400">P/L Mensuel</p>
              <p className={`text-2xl font-bold ${monthlyTotal >= 0 ? "text-green-600" : "text-red-600"}`}>
                {monthlyTotal >= 0 ? "+" : ""}{formatCurrency(monthlyTotal)}
              </p>
              <p className="text-xs text-zinc-500">{monthlyTrades} trade{monthlyTrades > 1 ? "s" : ""}</p>
            </div>
            <Button
              variant="outline"
              onClick={goToToday}
            >
              Aujourd'hui
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Jours de la semaine */}
        <div className="grid grid-cols-6 gap-2 mb-2">
          {["Lun", "Mar", "Mer", "Jeu", "Ven", "Semaine"].map((day) => (
            <div
              key={day}
              className="text-center text-sm font-medium text-zinc-600 dark:text-zinc-400 py-2"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Grille du calendrier par semaine */}
        <div className="space-y-2">
          {weekRows.map((week, weekIdx) => {
            // Calculer le numéro de semaine
            const firstDayOfWeek = week[0]
            const weekNumber = Math.ceil((firstDayOfWeek.getDate() + startOfMonth(firstDayOfWeek).getDay()) / 7)
            const weekData = weeklyPnl[weekNumber] || { amount: 0, count: 0, days: [] }

            return (
              <div key={weekIdx} className="grid grid-cols-6 gap-2">
                {/* Les 5 jours de la semaine */}
                {week.map((day, dayIdx) => {
                  const dateKey = format(day, "yyyy-MM-dd")
                  const dayPnl = dailyPnl[dateKey]
                  const isCurrentMonth = isSameMonth(day, currentMonth)
                  const isCurrentDay = isToday(day)

                  return (
                    <div
                      key={dayIdx}
                      className={`min-h-[100px] p-3 rounded-lg border-2 transition-all ${
                        !isCurrentMonth
                          ? "border-zinc-100 bg-zinc-50 dark:border-zinc-900 dark:bg-zinc-950 opacity-40"
                          : dayPnl
                          ? dayPnl.amount >= 0
                            ? "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950"
                            : "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950"
                          : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
                      } ${
                        isCurrentDay ? "ring-2 ring-blue-500 dark:ring-blue-400" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span
                          className={`text-sm font-medium ${
                            isCurrentDay
                              ? "flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 text-white"
                              : !isCurrentMonth
                              ? "text-zinc-400"
                              : "text-zinc-900 dark:text-zinc-50"
                          }`}
                        >
                          {format(day, "d")}
                        </span>
                      </div>

                      {dayPnl && isCurrentMonth && (
                        <div>
                          <div
                            className={`text-lg font-bold mb-1 ${
                              dayPnl.amount >= 0
                                ? "text-green-600 dark:text-green-400"
                                : "text-red-600 dark:text-red-400"
                            }`}
                          >
                            {dayPnl.amount >= 0 ? "+" : ""}
                            {formatCurrency(dayPnl.amount)}
                          </div>
                          <div className="text-xs text-zinc-500">
                            {dayPnl.count} trade{dayPnl.count > 1 ? "s" : ""}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}

                {/* Colonne résumé de la semaine */}
                <div
                  className={`min-h-[100px] p-3 rounded-lg border-2 ${
                    weekData.amount > 0
                      ? "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950"
                      : weekData.amount < 0
                      ? "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950"
                      : "border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                      Sem. {weekNumber}
                    </span>
                  </div>
                  <div className={`text-lg font-bold mb-1 ${
                    weekData.amount >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                  }`}>
                    {weekData.amount >= 0 ? "+" : ""}{formatCurrency(weekData.amount)}
                  </div>
                  <div className="text-xs text-zinc-500">
                    {weekData.count} trade{weekData.count > 1 ? "s" : ""}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

