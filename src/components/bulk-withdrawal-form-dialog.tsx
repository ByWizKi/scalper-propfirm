"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Plus, Trash2 } from "lucide-react"

interface Account {
  id: string
  name: string
  propfirm: string
  accountType: string
}

interface WithdrawalRow {
  id: string
  accountId: string
  date: string
  amount: string
  notes: string
}

interface BulkWithdrawalFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  accounts: Account[]
  onSuccess: () => void
}

export function BulkWithdrawalFormDialog({
  open,
  onOpenChange,
  accounts,
  onSuccess,
}: BulkWithdrawalFormDialogProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)

  // Filtrer uniquement les comptes financés
  const eligibleAccounts = accounts.filter(account => account.accountType === "FUNDED")

  // Initialiser avec une ligne vide
  const [rows, setRows] = useState<WithdrawalRow[]>([
    {
      id: crypto.randomUUID(),
      accountId: "",
      date: new Date().toISOString().split("T")[0],
      amount: "",
      notes: "",
    },
  ])

  const addRow = () => {
    setRows([
      ...rows,
      {
        id: crypto.randomUUID(),
        accountId: "",
        date: new Date().toISOString().split("T")[0],
        amount: "",
        notes: "",
      },
    ])
  }

  const removeRow = (id: string) => {
    if (rows.length === 1) {
      toast({
        title: "Erreur",
        description: "Vous devez avoir au moins une ligne",
        variant: "destructive",
      })
      return
    }
    setRows(rows.filter((row) => row.id !== id))
  }

  const updateRow = (id: string, field: keyof WithdrawalRow, value: string) => {
    setRows(
      rows.map((row) =>
        row.id === id ? { ...row, [field]: value } : row
      )
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // Valider que toutes les lignes ont un compte, une date et un montant
      const invalidRows = rows.filter(
        (row) => !row.accountId || !row.date || !row.amount
      )

      if (invalidRows.length > 0) {
        toast({
          title: "Erreur",
          description: "Veuillez remplir tous les champs obligatoires (compte, date, montant)",
          variant: "destructive",
        })
        setIsLoading(false)
        return
      }

      // Créer tous les retraits
      const promises = rows.map(async (row) => {
        const res = await fetch("/api/withdrawals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            accountId: row.accountId,
            date: row.date,
            amount: parseFloat(row.amount),
            notes: row.notes || undefined,
          }),
        })

        if (!res.ok) {
          const error = await res.json()
          throw new Error(error.error || "Erreur lors de l'ajout")
        }

        return res.json()
      })

      await Promise.all(promises)

      toast({
        title: "Succès",
        description: `${rows.length} retrait(s) ajouté(s) avec succès`,
      })

      // Réinitialiser le formulaire
      setRows([
        {
          id: crypto.randomUUID(),
          accountId: "",
          date: new Date().toISOString().split("T")[0],
          amount: "",
          notes: "",
        },
      ])

      onOpenChange(false)
      onSuccess()
    } catch (error) {
      console.error("Erreur:", error)
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Une erreur est survenue",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-5xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">
            Ajout groupé de retraits
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Ajoutez plusieurs retraits pour différents comptes financés en une seule fois
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Vue mobile : cartes empilables */}
          <div className="block md:hidden space-y-3">
            {rows.map((row, index) => (
              <div
                key={row.id}
                className="border rounded-lg p-3 space-y-3 bg-zinc-50 dark:bg-zinc-900"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Retrait #{index + 1}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeRow(row.id)}
                    disabled={rows.length === 1}
                    className="h-8 w-8"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Compte *</Label>
                  <Select
                    value={row.accountId}
                    onValueChange={(value) => updateRow(row.id, "accountId", value)}
                    required
                  >
                    <SelectTrigger className="w-full text-xs">
                      <SelectValue placeholder="Sélectionner un compte" />
                    </SelectTrigger>
                    <SelectContent>
                      {eligibleAccounts.length > 0 ? (
                        eligibleAccounts.map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            <span className="text-xs">{account.name}</span>
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="none" disabled>
                          Aucun compte financé
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label className="text-xs">Date *</Label>
                    <Input
                      type="date"
                      value={row.date}
                      onChange={(e) => updateRow(row.id, "date", e.target.value)}
                      required
                      className="text-xs"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Montant *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={row.amount}
                      onChange={(e) => updateRow(row.id, "amount", e.target.value)}
                      placeholder="0.00"
                      required
                      className="text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Notes</Label>
                  <Input
                    type="text"
                    value={row.notes}
                    onChange={(e) => updateRow(row.id, "notes", e.target.value)}
                    placeholder="Optionnel"
                    className="text-xs"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Vue desktop : tableau */}
          <div className="hidden md:block overflow-x-auto">
            <div className="inline-block min-w-full align-middle">
              <div className="overflow-hidden border rounded-lg">
                <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
                  <thead className="bg-zinc-50 dark:bg-zinc-900">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                        Compte
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                        Montant
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                        Notes
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider w-16">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-zinc-950 divide-y divide-zinc-200 dark:divide-zinc-800">
                    {rows.map((row) => (
                      <tr key={row.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900">
                        <td className="px-4 py-2 whitespace-nowrap">
                          <Select
                            value={row.accountId}
                            onValueChange={(value) => updateRow(row.id, "accountId", value)}
                            required
                          >
                            <SelectTrigger className="w-full min-w-[180px] text-sm">
                              <SelectValue placeholder="Sélectionner..." />
                            </SelectTrigger>
                            <SelectContent>
                              {eligibleAccounts.length > 0 ? (
                                eligibleAccounts.map((account) => (
                                  <SelectItem key={account.id} value={account.id}>
                                    <span className="text-sm">{account.name}</span>
                                  </SelectItem>
                                ))
                              ) : (
                                <SelectItem value="none" disabled>
                                  Aucun compte financé disponible
                                </SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          <Input
                            type="date"
                            value={row.date}
                            onChange={(e) => updateRow(row.id, "date", e.target.value)}
                            required
                            className="w-full min-w-[140px] text-sm"
                          />
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          <Input
                            type="number"
                            step="0.01"
                            value={row.amount}
                            onChange={(e) => updateRow(row.id, "amount", e.target.value)}
                            placeholder="0.00"
                            required
                            className="w-full min-w-[110px] text-sm"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <Input
                            type="text"
                            value={row.notes}
                            onChange={(e) => updateRow(row.id, "notes", e.target.value)}
                            placeholder="Optionnel"
                            className="w-full min-w-[150px] text-sm"
                          />
                        </td>
                        <td className="px-4 py-2 text-center">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeRow(row.id)}
                            disabled={rows.length === 1}
                            className="h-8 w-8"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Bouton pour ajouter une ligne */}
          <div className="flex justify-center pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={addRow}
              disabled={eligibleAccounts.length === 0}
              className="w-full sm:w-auto text-xs sm:text-sm"
            >
              <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2" />
              Ajouter une ligne
            </Button>
          </div>

          {/* Footer avec statistiques */}
          <div className="flex items-center justify-between p-3 sm:p-4 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
            <div className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
              <span className="font-medium">{rows.length}</span> ligne{rows.length > 1 ? "s" : ""}
            </div>
            <div className="text-xs sm:text-sm font-medium">
              Total:{" "}
              <span className="text-green-600">
                ${rows.reduce((sum, row) => sum + (parseFloat(row.amount) || 0), 0).toFixed(2)}
              </span>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
              className="w-full sm:w-auto text-sm"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={isLoading || eligibleAccounts.length === 0}
              className="w-full sm:w-auto text-sm"
            >
              {isLoading ? "Enregistrement..." : `Ajouter ${rows.length} retrait${rows.length > 1 ? "s" : ""}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

