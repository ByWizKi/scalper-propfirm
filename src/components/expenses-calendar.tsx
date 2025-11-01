"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, format, isSameMonth, addMonths, subMonths } from "date-fns"
import { fr } from "date-fns/locale"
import { useCalendarModal } from "@/hooks/use-calendar-modal"
import { CalendarDayDetailsDialog } from "@/components/calendar-day-details-dialog"

interface ExpenseEntry {
  id: string
  createdAt: string
  pricePaid: number
  name: string
}

interface ExpensesCalendarProps {
  expenses: ExpenseEntry[]
}

export function ExpensesCalendar({ expenses }: ExpensesCalendarProps) {
  const [currentMonth, setCurrentMonth] = React.useState(new Date())
  const { selectedDay, isOpen, openModal, closeModal } = useCalendarModal<ExpenseEntry>()

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

  // Group expenses by day
  const dailyExpenses: Record<string, ExpenseEntry[]> = {}
  expenses.forEach((expense) => {
    const dateKey = expense.createdAt.split('T')[0]
    if (!dailyExpenses[dateKey]) {
      dailyExpenses[dateKey] = []
    }
    dailyExpenses[dateKey].push(expense)
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
      <CardHeader className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base sm:text-lg truncate">Calendrier des Dépenses</CardTitle>
            <CardDescription className="text-xs sm:text-sm truncate">
              Suivez vos dépenses mensuelles
            </CardDescription>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 justify-center sm:justify-end">
            <Button
              variant="outline"
              size="icon"
              onClick={previousMonth}
              className="h-7 w-7 sm:h-9 sm:w-9"
            >
              <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
            <div className="text-xs sm:text-sm font-medium min-w-[100px] sm:min-w-[140px] text-center px-2">
              {format(currentMonth, "MMMM yyyy", { locale: fr })}
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={nextMonth}
              className="h-7 w-7 sm:h-9 sm:w-9"
            >
              <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
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
            // Calculate weekly total
            const weekTotal = week.reduce((sum, day) => {
              const dateKey = format(day, "yyyy-MM-dd")
              const dayExpenses = dailyExpenses[dateKey] || []
              return sum + dayExpenses.reduce((s, e) => s + e.pricePaid, 0)
            }, 0)

            const weekNum = Math.floor((weekIdx * 5) / 7) + 1

            return (
              <div key={weekIdx} className="grid grid-cols-6 gap-1 md:gap-2"> {/* 5 days + 1 for "Semaine" */}
                {/* The 5 weekdays */}
                {week.map((day, dayIdx) => {
                  const dateKey = format(day, "yyyy-MM-dd")
                  const dayExpenses = dailyExpenses[dateKey] || []
                  const dayTotal = dayExpenses.reduce((sum, e) => sum + e.pricePaid, 0)
                  const isCurrentMonth = isSameMonth(day, currentMonth)

                  return (
                    <div
                      key={dayIdx}
                      className={`min-h-[80px] md:min-h-[100px] p-1.5 md:p-3 rounded-lg border transition-all duration-200 ${
                        !isCurrentMonth
                          ? "bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
                          : dayTotal > 0
                          ? "border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950 cursor-pointer hover:bg-red-100 dark:hover:bg-red-900 hover:scale-105 hover:shadow-md"
                          : "border-zinc-200 dark:border-zinc-800"
                      }`}
                      onClick={() => {
                        // Ne rien faire si le jour n'est pas dans le mois courant
                        if (!isCurrentMonth) return

                        if (dayExpenses.length > 0) {
                          openModal(day, dayExpenses, dayTotal)
                        }
                      }}
                    >
                      <div className="text-xs md:text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-1 md:mb-2">
                        {format(day, "d")}
                      </div>
                      {dayExpenses.length > 0 && (
                        <div className="space-y-0.5 md:space-y-1">
                          <div className="text-xs md:text-sm font-bold text-red-600 dark:text-red-400 truncate">
                            -{formatCurrency(dayTotal)}
                          </div>
                          <div className="text-[10px] md:text-xs text-red-600 dark:text-red-400 truncate">
                            {formatCurrencyEUR(dayTotal * USD_TO_EUR)}
                          </div>
                          <div className="text-[10px] md:text-xs text-zinc-500 hidden md:block">
                            {dayExpenses.length} dépense{dayExpenses.length > 1 ? "s" : ""}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}

                {/* Weekly summary column */}
                <div
                  className={`min-h-[80px] md:min-h-[100px] p-1.5 md:p-3 rounded-lg border-2 transition-all duration-200 ${
                    weekTotal > 0
                      ? "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950 cursor-pointer hover:bg-red-100 dark:hover:bg-red-900 hover:scale-105 hover:shadow-md"
                      : "border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900"
                  }`}
                  onClick={() => {
                    if (weekTotal > 0) {
                      // Collecter toutes les dépenses de la semaine
                      const weekExpenses: ExpenseEntry[] = []
                      week.forEach((day) => {
                        const dateKey = format(day, "yyyy-MM-dd")
                        const dayExpenses = dailyExpenses[dateKey] || []
                        weekExpenses.push(...dayExpenses)
                      })

                      if (weekExpenses.length > 0) {
                        openModal(week[0], weekExpenses, weekTotal)
                      }
                    }
                  }}
                >
                  <div className="flex items-center justify-center mb-1 md:mb-2">
                    <span className="text-[9px] sm:text-[10px] md:text-xs font-medium text-zinc-600 dark:text-zinc-400 text-center">
                      Total semaine
                    </span>
                  </div>
                  {weekTotal > 0 && (
                    <>
                      <div className="text-sm md:text-lg font-bold text-red-600 dark:text-red-400 mb-0.5 md:mb-1 truncate">
                        -{formatCurrency(weekTotal)}
                      </div>
                      <div className="text-[10px] md:text-xs text-red-600 dark:text-red-400 truncate">
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

      {/* Modal de détails */}
      <CalendarDayDetailsDialog
        open={isOpen}
        onOpenChange={closeModal}
        selectedDate={selectedDay?.date || null}
        data={selectedDay?.items || null}
        formatTitle={(date) => {
          // Vérifier si c'est une vue de semaine
          if (selectedDay && selectedDay.items.length > 1) {
            const dates = selectedDay.items.map((expense) => format(new Date(expense.createdAt), "yyyy-MM-dd"))
            const uniqueDates = [...new Set(dates)]

            if (uniqueDates.length > 1) {
              // C'est une semaine complète
              const firstDay = new Date(Math.min(...selectedDay.items.map((e) => new Date(e.createdAt).getTime())))
              const lastDay = new Date(Math.max(...selectedDay.items.map((e) => new Date(e.createdAt).getTime())))

              return `Dépenses du ${format(firstDay, "d", { locale: fr })} au ${format(lastDay, "d MMMM yyyy", { locale: fr })}`
            }
          }

          return `Dépenses du ${format(date, "d MMMM yyyy", { locale: fr })}`
        }}
        formatDescription={(items) => {
          const total = items.reduce((sum, item) => sum + item.pricePaid, 0)
          return `Total: ${formatCurrency(total)} (${formatCurrencyEUR(total * USD_TO_EUR)})`
        }}
        renderItem={(expense) => (
          <div
            key={expense.id}
            className="flex items-center justify-between p-3 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900"
          >
            <div className="flex-1 min-w-0 mr-3">
              <p className="font-medium text-sm truncate">{expense.name}</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {format(new Date(expense.createdAt), "HH:mm", { locale: fr })}
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="font-bold text-red-600 dark:text-red-400">
                -{formatCurrency(expense.pricePaid)}
              </p>
              <p className="text-xs text-red-600 dark:text-red-400">
                {formatCurrencyEUR(expense.pricePaid * USD_TO_EUR)}
              </p>
            </div>
          </div>
        )}
      />
    </Card>
  )
}

