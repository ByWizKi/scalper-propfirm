"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { format } from "date-fns"
import { fr } from "date-fns/locale"

/**
 * Props génériques pour le dialogue de détails d'un jour
 */
interface CalendarDayDetailsDialogProps<T> {
  /** Indique si le dialogue est ouvert */
  open: boolean
  /** Callback pour fermer le dialogue */
  onOpenChange: (open: boolean) => void
  /** Date sélectionnée */
  selectedDate: Date | null
  /** Données pour ce jour */
  data: T[] | null
  /** Fonction pour formater le titre */
  formatTitle: (date: Date) => string
  /** Fonction pour formater la description (total, résumé, etc.) */
  formatDescription: (data: T[]) => string
  /** Fonction pour rendre chaque élément de la liste */
  renderItem: (item: T, index: number) => React.ReactNode
}

/**
 * Composant générique polymorphe pour afficher les détails d'un jour dans un calendrier
 * Utilise des génériques TypeScript pour être type-safe avec n'importe quel type de données
 */
export function CalendarDayDetailsDialog<T>({
  open,
  onOpenChange,
  selectedDate,
  data,
  formatTitle,
  formatDescription,
  renderItem,
}: CalendarDayDetailsDialogProps<T>) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {selectedDate && formatTitle(selectedDate)}
          </DialogTitle>
          <DialogDescription>
            {data && formatDescription(data)}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 mt-4">
          {data?.map((item, index) => renderItem(item, index))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

