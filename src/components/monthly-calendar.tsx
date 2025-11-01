"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown } from "lucide-react"
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, startOfWeek, endOfWeek, addMonths, subMonths } from "date-fns"
import { fr } from "date-fns/locale"
import { useCalendarModal } from "@/hooks/use-calendar-modal"
import { CalendarDayDetailsDialog } from "@/components/calendar-day-details-dialog"

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
  const { selectedDay, isOpen, openModal, closeModal } = useCalendarModal<PnlEntry>()

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  // Grouper les entrées PnL par date
  const entriesByDate = pnlEntries.reduce((acc, entry) => {
    const dateKey = format(new Date(entry.date), "yyyy-MM-dd")
    if (!acc[dateKey]) {
      acc[dateKey] = []
    }
    acc[dateKey].push(entry)
    return acc
  }, {} as Record<string, PnlEntry[]>)

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
      <CardHeader className="p-4 sm:p-6">
        <div className="flex flex-col gap-4">
          {/* Navigation et titre */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1 sm:gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={goToPreviousMonth}
                className="h-7 w-7 sm:h-9 sm:w-9"
              >
                <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
              <CardTitle className="text-sm sm:text-base md:text-xl min-w-[120px] sm:min-w-[160px] text-center">
                {format(currentMonth, "MMMM yyyy", { locale: fr })}
              </CardTitle>
              <Button
                variant="outline"
                size="icon"
                onClick={goToNextMonth}
                className="h-7 w-7 sm:h-9 sm:w-9"
              >
                <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
            </div>

            <Button
              variant="outline"
              onClick={goToToday}
              className="text-xs sm:text-sm h-7 sm:h-9 px-2 sm:px-4"
            >
              <span className="hidden sm:inline">Aujourd&apos;hui</span>
              <span className="sm:hidden">Auj.</span>
            </Button>
          </div>

          {/* Stats mensuelles */}
          <div className="flex items-center justify-between sm:justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
            <div className="text-left sm:text-right">
              <p className="text-[10px] sm:text-xs text-zinc-600 dark:text-zinc-400">P/L Mensuel</p>
              <p className={`text-base sm:text-xl md:text-2xl font-bold break-words leading-tight ${monthlyTotal >= 0 ? "text-green-600" : "text-red-600"}`}>
                {monthlyTotal >= 0 ? "+" : ""}{formatCurrency(monthlyTotal)}
              </p>
              <p className="text-[10px] sm:text-xs text-zinc-500">{monthlyTrades} trade{monthlyTrades > 1 ? "s" : ""}</p>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-2 sm:p-4 md:p-6">
        {/* Jours de la semaine */}
        <div className="grid grid-cols-6 gap-1 sm:gap-2 mb-2">
          {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sem."].map((day) => (
            <div
              key={day}
              className="text-center text-[10px] sm:text-xs md:text-sm font-medium text-zinc-600 dark:text-zinc-400 py-1 sm:py-2"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Grille du calendrier par semaine */}
        <div className="space-y-1 sm:space-y-2">
          {weekRows.map((week, weekIdx) => {
            // Calculer le numéro de semaine
            const firstDayOfWeek = week[0]
            const weekNumber = Math.ceil((firstDayOfWeek.getDate() + startOfMonth(firstDayOfWeek).getDay()) / 7)
            const weekData = weeklyPnl[weekNumber] || { amount: 0, count: 0, days: [] }

            return (
              <div key={weekIdx} className="grid grid-cols-6 gap-1 sm:gap-2">
                {/* Les 5 jours de la semaine */}
                {week.map((day, dayIdx) => {
                  const dateKey = format(day, "yyyy-MM-dd")
                  const dayPnl = dailyPnl[dateKey]
                  const isCurrentMonth = isSameMonth(day, currentMonth)
                  const isCurrentDay = isToday(day)

                  return (
                    <div
                      key={dayIdx}
                      className={`min-h-[70px] sm:min-h-[80px] md:min-h-[100px] p-1.5 sm:p-2 md:p-3 rounded-lg border-2 transition-all ${
                        !isCurrentMonth
                          ? "border-zinc-100 bg-zinc-50 dark:border-zinc-900 dark:bg-zinc-950 opacity-40"
                          : dayPnl
                          ? dayPnl.amount >= 0
                            ? "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950 cursor-pointer hover:bg-green-100 dark:hover:bg-green-900"
                            : "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950 cursor-pointer hover:bg-red-100 dark:hover:bg-red-900"
                          : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
                      } ${
                        isCurrentDay ? "ring-2 ring-blue-500 dark:ring-blue-400" : ""
                      }`}
                      onClick={() => {
                        if (dayPnl && isCurrentMonth) {
                          const dayEntries = entriesByDate[dateKey] || []
                          openModal(day, dayEntries, dayPnl.amount)
                        }
                      }}
                    >
                      <div className="flex items-center justify-between mb-1 sm:mb-2">
                        <span
                          className={`text-xs sm:text-sm font-medium ${
                            isCurrentDay
                              ? "flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-full bg-blue-500 text-white text-[10px] sm:text-sm"
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
                            className={`text-xs sm:text-sm md:text-lg font-bold mb-0.5 sm:mb-1 truncate ${
                              dayPnl.amount >= 0
                                ? "text-green-600 dark:text-green-400"
                                : "text-red-600 dark:text-red-400"
                            }`}
                          >
                            {dayPnl.amount >= 0 ? "+" : ""}
                            {formatCurrency(dayPnl.amount)}
                          </div>
                          <div className="text-[9px] sm:text-[10px] md:text-xs text-zinc-500">
                            {dayPnl.count} trade{dayPnl.count > 1 ? "s" : ""}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}

                {/* Colonne résumé de la semaine */}
                <div
                  className={`min-h-[70px] sm:min-h-[80px] md:min-h-[100px] p-1.5 sm:p-2 md:p-3 rounded-lg border-2 ${
                    weekData.amount > 0
                      ? "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950"
                      : weekData.amount < 0
                      ? "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950"
                      : "border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1 sm:mb-2">
                    <span className="text-[10px] sm:text-xs md:text-sm font-medium text-zinc-600 dark:text-zinc-400">
                      S{weekNumber}
                    </span>
                  </div>
                  <div className={`text-xs sm:text-sm md:text-lg font-bold mb-0.5 sm:mb-1 truncate ${
                    weekData.amount >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                  }`}>
                    {weekData.amount >= 0 ? "+" : ""}{formatCurrency(weekData.amount)}
                  </div>
                  <div className="text-[9px] sm:text-[10px] md:text-xs text-zinc-500">
                    {weekData.count} trade{weekData.count > 1 ? "s" : ""}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>

      {/* Modal de détails */}
      <CalendarDayDetailsDialog
        open={isOpen}
        onOpenChange={closeModal}
        selectedDate={selectedDay?.date || null}
        data={selectedDay?.items || null}
        formatTitle={(date) => `PnL du ${format(date, "d MMMM yyyy", { locale: fr })}`}
        formatDescription={(items) => {
          const total = items.reduce((sum, item) => sum + item.amount, 0)
          return `Total: ${total >= 0 ? "+" : ""}${formatCurrency(total)} (${items.length} trade${items.length > 1 ? "s" : ""})`
        }}
        renderItem={(entry, index) => (
          <div
            key={entry.id}
            className={`flex items-center justify-between p-2 sm:p-3 rounded-lg border ${
              entry.amount >= 0
                ? "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-900"
                : "bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-900"
            }`}
          >
            <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0 mr-2 sm:mr-3">
              <div
                className={`p-1.5 sm:p-2 rounded-lg flex-shrink-0 ${
                  entry.amount >= 0
                    ? "bg-green-100 dark:bg-green-900"
                    : "bg-red-100 dark:bg-red-900"
                }`}
              >
                {entry.amount >= 0 ? (
                  <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-green-600 dark:text-green-400" />
                ) : (
                  <TrendingDown className="h-3 w-3 sm:h-4 sm:w-4 text-red-600 dark:text-red-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] sm:text-xs text-zinc-500 dark:text-zinc-400">
                  {format(new Date(entry.date), "HH:mm", { locale: fr })}
                </p>
                {entry.notes && (
                  <p className="text-[10px] sm:text-xs text-zinc-600 dark:text-zinc-300 mt-0.5 sm:mt-1 line-clamp-2 break-words">
                    {entry.notes}
                  </p>
                )}
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <p
                className={`text-sm sm:text-base font-bold break-words leading-tight ${
                  entry.amount >= 0
                    ? "text-green-600 dark:text-green-400"
                    : "text-red-600 dark:text-red-400"
                }`}
              >
                {entry.amount >= 0 ? "+" : ""}
                {formatCurrency(entry.amount)}
              </p>
            </div>
          </div>
        )}
      />
    </Card>
  )
}

