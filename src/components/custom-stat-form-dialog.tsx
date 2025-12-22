"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useNotification } from "@/hooks/use-notification"
import { Loader2, Save, Trash2, HelpCircle } from "lucide-react"
import { validateFormula, AVAILABLE_VARIABLES } from "@/lib/custom-stat-evaluator"

interface CustomStat {
  id?: string
  title: string
  description?: string | null
  formula: string
  icon?: string | null
  variant?: string | null
  enabled?: boolean
  order?: number
}

interface CustomStatFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  customStat?: CustomStat | null
  onSuccess: () => void
}

// Liste des icônes disponibles (les plus courantes)
const AVAILABLE_ICONS = [
  { value: "TrendingUp", label: "Flèche vers le haut" },
  { value: "TrendingDown", label: "Flèche vers le bas" },
  { value: "DollarSign", label: "Dollar" },
  { value: "Percent", label: "Pourcentage" },
  { value: "Wallet", label: "Portefeuille" },
  { value: "Target", label: "Cible" },
  { value: "Award", label: "Médaille" },
  { value: "Clock", label: "Horloge" },
  { value: "Calendar", label: "Calendrier" },
  { value: "BarChart3", label: "Graphique" },
  { value: "Activity", label: "Activité" },
  { value: "Zap", label: "Éclair" },
  { value: "Coins", label: "Pièces" },
  { value: "Layers", label: "Couches" },
  { value: "PieChart", label: "Camembert" },
]

const VARIANT_OPTIONS = [
  { value: "neutral", label: "Neutre" },
  { value: "success", label: "Succès (vert)" },
  { value: "danger", label: "Danger (rouge)" },
  { value: "warning", label: "Avertissement (orange)" },
]

export function CustomStatFormDialog({
  open,
  onOpenChange,
  customStat,
  onSuccess,
}: CustomStatFormDialogProps) {
  const notification = useNotification()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    formula: "",
    icon: "TrendingUp",
    variant: "neutral",
    enabled: true,
  })
  const [formulaError, setFormulaError] = useState<string | null>(null)
  const [showHelp, setShowHelp] = useState(false)

  useEffect(() => {
    if (customStat) {
      setFormData({
        title: customStat.title || "",
        description: customStat.description || "",
        formula: customStat.formula || "",
        icon: customStat.icon || "TrendingUp",
        variant: customStat.variant || "neutral",
        enabled: customStat.enabled !== undefined ? customStat.enabled : true,
      })
    } else {
      setFormData({
        title: "",
        description: "",
        formula: "",
        icon: "TrendingUp",
        variant: "neutral",
        enabled: true,
      })
    }
    setFormulaError(null)
  }, [customStat, open])

  const handleFormulaChange = (value: string) => {
    setFormData({ ...formData, formula: value })
    // Ne valider que si la formule n'est pas vide
    if (value.trim().length === 0) {
      setFormulaError(null)
      return
    }
    const validation = validateFormula(value)
    if (!validation.valid) {
      setFormulaError(validation.error || "Formule invalide")
    } else {
      setFormulaError(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (!formData.title.trim()) {
      notification.showError("Le titre est requis")
      return
    }

    if (!formData.formula.trim()) {
      notification.showError("La formule est requise")
      return
    }

    const validation = validateFormula(formData.formula)
    if (!validation.valid) {
      notification.showError(validation.error || "Formule invalide")
      return
    }

    // Vérifier qu'il n'y a pas d'erreur de formule affichée
    if (formulaError) {
      notification.showError(formulaError)
      return
    }

    setIsLoading(true)

    try {
      const url = customStat?.id ? `/api/custom-stats/${customStat.id}` : "/api/custom-stats"
      const method = customStat?.id ? "PUT" : "POST"

      let response: Response
      try {
        response = await fetch(url, {
          method,
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
          credentials: "include", // Inclure les cookies pour l'authentification
        })
      } catch (fetchError) {
        console.error("Erreur de réseau:", fetchError)
        throw new Error(
          fetchError instanceof Error
            ? `Erreur de connexion: ${fetchError.message}`
            : "Impossible de se connecter au serveur. Vérifiez votre connexion internet."
        )
      }

      if (!response.ok) {
        let errorMessage = "Erreur lors de la sauvegarde"
        try {
          const errorText = await response.text()
          console.error("Réponse d'erreur brute:", errorText)

          if (errorText) {
            try {
              const error = JSON.parse(errorText)
              console.error("Erreur API parsée:", error)
              errorMessage = error.message || errorMessage
            } catch {
              // Si ce n'est pas du JSON, utiliser le texte brut
              errorMessage = errorText || errorMessage
            }
          } else {
            errorMessage = `Erreur ${response.status}: ${response.statusText || "Erreur inconnue"}`
          }
        } catch (parseError) {
          // Si la réponse n'est pas du JSON, utiliser le message par défaut
          console.error("Erreur de parsing:", parseError)
          errorMessage = `Erreur ${response.status}: ${response.statusText || "Erreur inconnue"}`
        }
        throw new Error(errorMessage)
      }

      await response.json()

      notification.showSuccess(
        customStat?.id
          ? "Statistique personnalisée mise à jour"
          : "Statistique personnalisée créée"
      )

      // Déclencher l'événement immédiatement pour mettre à jour les données
      window.dispatchEvent(new Event("customStatsUpdated"))

      // Fermer le dialog
      onOpenChange(false)

      // Appeler onSuccess pour fermer le dialog parent si nécessaire
      onSuccess()
    } catch (error) {
      console.error("Erreur lors de la sauvegarde:", error)
      notification.handleError(error, "Erreur lors de la sauvegarde. Veuillez réessayer.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!customStat?.id) return

    if (!confirm("Êtes-vous sûr de vouloir supprimer cette statistique personnalisée ?")) {
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch(`/api/custom-stats/${customStat.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Erreur lors de la suppression")
      }

      notification.showSuccess("Statistique personnalisée supprimée")

      onSuccess()
      onOpenChange(false)
    } catch (error) {
      console.error("Erreur:", error)
      notification.handleError(error, "Erreur lors de la suppression")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {customStat?.id ? "Modifier la statistique" : "Créer une statistique personnalisée"}
          </DialogTitle>
          <DialogDescription>
            Créez votre propre statistique en utilisant une formule mathématique
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Titre */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-sm font-semibold">
              Titre *
            </Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Ex: Ratio PnL/Investissement"
              className="h-10"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-semibold">
              Description
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Description de la statistique"
              className="min-h-[80px]"
            />
          </div>

          {/* Formule */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="formula" className="text-sm font-semibold">
                Formule *
              </Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowHelp(!showHelp)}
                className="h-8 text-xs"
              >
                <HelpCircle className="h-3.5 w-3.5 mr-1.5" />
                Aide
              </Button>
            </div>
            <Input
              id="formula"
              value={formData.formula}
              onChange={(e) => handleFormulaChange(e.target.value)}
              placeholder="Ex: totalPnl / totalInvested * 100"
              className={`h-10 ${formulaError ? "border-red-500" : ""}`}
              required
            />
            {formulaError && (
              <p className="text-xs text-red-600 dark:text-red-400">{formulaError}</p>
            )}
            {!formulaError && formData.formula && (
              <p className="text-xs text-green-600 dark:text-green-400">Formule valide</p>
            )}
          </div>

          {/* Aide pour les variables */}
          {showHelp && (
            <div className="rounded-lg border border-blue-200/70 dark:border-blue-800/70 bg-blue-50/50 dark:bg-blue-950/30 p-4">
              <p className="text-xs font-semibold text-blue-900 dark:text-blue-100 mb-2">
                Variables disponibles :
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[200px] overflow-y-auto">
                {AVAILABLE_VARIABLES.map((variable) => (
                  <div key={variable.name} className="text-xs">
                    <code className="text-blue-700 dark:text-blue-300 font-mono">
                      {variable.name}
                    </code>
                    <span className="text-blue-600 dark:text-blue-400 ml-1">
                      : {variable.description}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-blue-700 dark:text-blue-300 mt-2">
                Opérateurs: +, -, *, /, % (modulo), ( ) pour les parenthèses
              </p>
            </div>
          )}

          {/* Icône et Variant */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="icon" className="text-sm font-semibold">
                Icône
              </Label>
              <Select
                value={formData.icon}
                onValueChange={(value) => setFormData({ ...formData, icon: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AVAILABLE_ICONS.map((icon) => (
                    <SelectItem key={icon.value} value={icon.value}>
                      {icon.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="variant" className="text-sm font-semibold">
                Couleur
              </Label>
              <Select
                value={formData.variant}
                onValueChange={(value) => setFormData({ ...formData, variant: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VARIANT_OPTIONS.map((variant) => (
                    <SelectItem key={variant.value} value={variant.value}>
                      {variant.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Activé */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="enabled"
              checked={formData.enabled}
              onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
              className="h-4 w-4"
            />
            <Label htmlFor="enabled" className="text-sm font-semibold cursor-pointer">
              Activer cette statistique
            </Label>
          </div>

          <DialogFooter className="flex items-center justify-between">
            {customStat?.id && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={isLoading}
                className="h-9"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Supprimer
              </Button>
            )}
            <div className="flex gap-2 ml-auto">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={
                  isLoading ||
                  (formulaError !== null &&
                    formulaError !== undefined &&
                    formulaError.trim().length > 0)
                }
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    {customStat?.id ? "Enregistrer" : "Créer"}
                  </>
                )}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
