"use client"

import * as React from "react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical, Eye, EyeOff, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DashboardWidget } from "@/types/dashboard-widget.types"

interface SortableWidgetItemProps {
  widget: DashboardWidget
  onToggle: (widgetId: string) => void
  onDelete?: (widgetId: string) => void
}

export function SortableWidgetItem({ widget, onToggle, onDelete }: SortableWidgetItemProps) {
  const isCustomStat = widget.id.startsWith("custom-stat-")
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: widget.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center justify-between p-3 rounded-lg border border-zinc-200/70 dark:border-zinc-800/70 bg-zinc-50/50 dark:bg-zinc-900/50 ${
        isDragging ? "shadow-lg ring-2 ring-blue-500" : ""
      }`}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing flex-shrink-0 p-2 -ml-1 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 rounded transition-colors"
          style={{ touchAction: "none", WebkitUserSelect: "none", userSelect: "none" }}
        >
          <GripVertical className="h-5 w-5 text-zinc-400" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 truncate">
            {widget.title}
          </p>
          <p className="text-xs text-zinc-600 dark:text-zinc-400">Ordre: {widget.order + 1}</p>
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {isCustomStat && onDelete && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(widget.id)}
            className="h-8 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
            title="Supprimer cette statistique"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onToggle(widget.id)}
          className={`h-8 shrink-0 ${widget.enabled ? "text-green-600" : "text-zinc-400"}`}
          title={widget.enabled ? "Masquer" : "Afficher"}
        >
          {widget.enabled ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  )
}
