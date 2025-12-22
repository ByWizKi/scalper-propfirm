"use client"

import * as React from "react"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from "@dnd-kit/sortable"
import { DashboardWidget, WidgetData } from "@/types/dashboard-widget.types"
import { DashboardWidgetRenderer } from "./dashboard-widget"
import { SortableWidgetItem } from "./sortable-widget-item"
import { CustomStatFormDialog } from "./custom-stat-form-dialog"
import { Button } from "@/components/ui/button"
import { Settings, Eye, EyeOff, Plus } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"

interface DashboardWidgetsManagerProps {
  widgets: DashboardWidget[]
  onWidgetsChange: (widgets: DashboardWidget[]) => void
  data?: WidgetData
}

/**
 * Composant pour gérer les widgets du tableau de bord avec drag and drop
 */
export function DashboardWidgetsManager({
  widgets,
  onWidgetsChange,
  data,
}: DashboardWidgetsManagerProps) {
  const [showSettings, setShowSettings] = React.useState(false)
  const [showCustomStatDialog, setShowCustomStatDialog] = React.useState(false)

  // Configuration des sensors pour supporter le tactile (mobile)
  // Utilisation de TouchSensor pour un meilleur support mobile
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // Distance minimale avant activation (évite les conflits avec le scroll)
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const enabledWidgets = widgets.filter((w) => w.enabled).sort((a, b) => a.order - b.order)

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      // Réorganiser tous les widgets (pas seulement les actifs)
      const oldIndex = widgets.findIndex((w) => w.id === active.id)
      const newIndex = widgets.findIndex((w) => w.id === over.id)

      if (oldIndex !== -1 && newIndex !== -1) {
        const reorderedWidgets = arrayMove(widgets, oldIndex, newIndex)
        const updatedWidgets = reorderedWidgets.map((widget, index) => ({
          ...widget,
          order: index,
        }))

        onWidgetsChange(updatedWidgets)
      }
    }
  }

  const handleDialogDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      // Réorganiser tous les widgets dans la fenêtre de dialogue
      const oldIndex = widgets.findIndex((w) => w.id === active.id)
      const newIndex = widgets.findIndex((w) => w.id === over.id)

      if (oldIndex !== -1 && newIndex !== -1) {
        const reorderedWidgets = arrayMove(widgets, oldIndex, newIndex)
        const updatedWidgets = reorderedWidgets.map((widget, index) => ({
          ...widget,
          order: index,
        }))

        onWidgetsChange(updatedWidgets)
      }
    }
  }

  const handleToggle = (widgetId: string) => {
    const updatedWidgets = widgets.map((widget) => {
      if (widget.id === widgetId) {
        return { ...widget, enabled: !widget.enabled }
      }
      return widget
    })
    onWidgetsChange(updatedWidgets)
  }

  const handleToggleAll = (enabled: boolean) => {
    const updatedWidgets = widgets.map((widget) => ({
      ...widget,
      enabled,
    }))
    onWidgetsChange(updatedWidgets)
  }

  const handleDeleteCustomStat = async (widgetId: string) => {
    if (!widgetId.startsWith("custom-stat-")) return

    const customStatId = widgetId.replace("custom-stat-", "")

    if (!confirm("Êtes-vous sûr de vouloir supprimer cette statistique personnalisée ?")) {
      return
    }

    try {
      const response = await fetch(`/api/custom-stats/${customStatId}`, {
        method: "DELETE",
        credentials: "include",
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Erreur lors de la suppression")
      }

      // Déclencher un événement pour recharger les statistiques personnalisées
      window.dispatchEvent(new Event("customStatsUpdated"))

      toast({
        title: "Succès",
        description: "Statistique personnalisée supprimée",
      })
    } catch (error) {
      console.error("Erreur lors de la suppression:", error)
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Erreur lors de la suppression",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6 md:space-y-8">
      {/* Header avec bouton de personnalisation */}
      <section className="rounded-2xl border border-slate-200 dark:border-[#1e293b] bg-white dark:bg-[#151b2e] backdrop-blur-sm p-3 sm:p-4 md:p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-50 truncate">
              Tableau de bord
            </h1>
            <p className="text-xs sm:text-sm md:text-base text-slate-600 dark:text-slate-300 mt-1 sm:mt-2 truncate">
              Vue d&apos;ensemble de vos comptes propfirm
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCustomStatDialog(true)}
              className="text-xs sm:text-sm font-semibold h-9 sm:h-10 md:h-11 px-2 sm:px-3 md:px-4"
            >
              <Plus className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Nouvelle statistique</span>
              <span className="sm:hidden">Nouvelle</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSettings(true)}
              className="text-xs sm:text-sm font-semibold h-9 sm:h-10 md:h-11 px-2 sm:px-3 md:px-4"
            >
              <Settings className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Personnaliser</span>
              <span className="sm:hidden">Config</span>
            </Button>
          </div>
        </div>
      </section>

      {/* Zone de drag and drop pour les StatCards */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext
          items={enabledWidgets.filter((w) => w.type === "stat_card").map((w) => w.id)}
          strategy={rectSortingStrategy}
        >
          <div className="grid grid-cols-1 gap-3 sm:gap-4 md:gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {enabledWidgets
              .filter((w) => w.type === "stat_card")
              .map((widget) => (
                <DashboardWidgetRenderer
                  key={widget.id}
                  widget={widget}
                  onToggle={handleToggle}
                  onDelete={handleDeleteCustomStat}
                  data={data}
                />
              ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Calendriers (affichés séparément avec drag and drop) */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext
          items={enabledWidgets.filter((w) => w.type === "calendar").map((w) => w.id)}
          strategy={rectSortingStrategy}
        >
          <div className="grid gap-4 sm:gap-6 grid-cols-1">
            {enabledWidgets
              .filter((w) => w.type === "calendar")
              .map((widget) => (
                <DashboardWidgetRenderer
                  key={widget.id}
                  widget={widget}
                  onToggle={handleToggle}
                  onDelete={handleDeleteCustomStat}
                  data={data}
                />
              ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Dialog de paramètres avec drag and drop */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Personnaliser le tableau de bord</DialogTitle>
            <DialogDescription>
              Activez ou désactivez les widgets et réorganisez-les par glisser-déposer
            </DialogDescription>
          </DialogHeader>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDialogDragEnd}
          >
            <div className="space-y-4 py-4">
              <div className="flex items-center justify-between pb-2 border-b">
                <Label className="text-sm font-semibold">Widgets disponibles</Label>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleAll(true)}
                    className="h-8 text-xs"
                  >
                    <Eye className="h-3.5 w-3.5 mr-1.5" />
                    Tout afficher
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleAll(false)}
                    className="h-8 text-xs"
                  >
                    <EyeOff className="h-3.5 w-3.5 mr-1.5" />
                    Tout masquer
                  </Button>
                </div>
              </div>
              <SortableContext items={widgets.map((w) => w.id)} strategy={rectSortingStrategy}>
                <div className="space-y-2">
                  {widgets.map((widget) => (
                    <SortableWidgetItem
                      key={widget.id}
                      widget={widget}
                      onToggle={handleToggle}
                      onDelete={handleDeleteCustomStat}
                    />
                  ))}
                </div>
              </SortableContext>
            </div>
          </DndContext>
        </DialogContent>
      </Dialog>

      {/* Dialog pour créer/modifier une statistique personnalisée */}
      <CustomStatFormDialog
        open={showCustomStatDialog}
        onOpenChange={setShowCustomStatDialog}
        onSuccess={() => {
          // Le dialog se ferme déjà dans handleSubmit
          // L'événement customStatsUpdated est déjà déclenché dans handleSubmit
          setShowCustomStatDialog(false)
        }}
      />
    </div>
  )
}
