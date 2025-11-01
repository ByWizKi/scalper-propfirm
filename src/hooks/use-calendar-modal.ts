"use client"

import { useState, useCallback } from "react"

/**
 * Interface générique pour les données d'un jour sélectionné
 */
interface SelectedDayData<T> {
  date: Date
  items: T[]
  total: number
}

/**
 * Hook personnalisé pour gérer l'état d'une modal de calendrier
 * Utilise des génériques pour être type-safe avec n'importe quel type de données
 */
export function useCalendarModal<T>() {
  const [selectedDay, setSelectedDay] = useState<SelectedDayData<T> | null>(null)

  /**
   * Ouvre la modal avec les données du jour sélectionné
   */
  const openModal = useCallback((date: Date, items: T[], total: number) => {
    setSelectedDay({ date, items, total })
  }, [])

  /**
   * Ferme la modal
   */
  const closeModal = useCallback(() => {
    setSelectedDay(null)
  }, [])

  /**
   * Toggle la modal
   */
  const toggleModal = useCallback(() => {
    if (selectedDay) {
      closeModal()
    }
  }, [selectedDay, closeModal])

  return {
    selectedDay,
    isOpen: !!selectedDay,
    openModal,
    closeModal,
    toggleModal,
  }
}

