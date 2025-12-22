"use client"

import { useState, useCallback } from "react"

/**
 * Hook générique pour gérer les dialogs de formulaire
 * Réduit la duplication de code pour les CRUD dialogs
 */
export function useFormDialog<T = Record<string, unknown>>() {
  const [isOpen, setIsOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<T | null>(null)

  const openCreate = useCallback(() => {
    setEditingItem(null)
    setIsOpen(true)
  }, [])

  const openEdit = useCallback((item: T) => {
    setEditingItem(item)
    setIsOpen(true)
  }, [])

  const close = useCallback(() => {
    setIsOpen(false)
    setEditingItem(null)
  }, [])

  const handleSuccess = useCallback(() => {
    close()
    // Déclencher un événement global pour rafraîchir les données
    window.dispatchEvent(new Event("dataChanged"))
  }, [close])

  return {
    isOpen,
    editingItem,
    openCreate,
    openEdit,
    close,
    handleSuccess,
  }
}
