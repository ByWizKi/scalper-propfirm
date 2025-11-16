"use client"

import { useState, useEffect } from "react"

export interface CustomStat {
  id: string
  userId: string
  title: string
  description?: string | null
  formula: string
  icon?: string | null
  variant?: string | null
  enabled: boolean
  order: number
  createdAt: string
  updatedAt: string
}

export function useCustomStats() {
  const [customStats, setCustomStats] = useState<CustomStat[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCustomStats = async (showLoading = false) => {
    try {
      if (showLoading) {
        setIsLoading(true)
      }
      setError(null)
      const response = await fetch("/api/custom-stats", { cache: "no-store" })
      if (!response.ok) {
        if (response.status === 401) {
          // Utilisateur non authentifié, pas d'erreur
          setCustomStats([])
          setIsLoading(false)
          return
        }
        // Pour les autres erreurs, essayer de récupérer le message d'erreur
        const errorData = await response.json().catch(() => ({}))
        throw new Error(
          errorData.message || "Erreur lors du chargement des statistiques personnalisées"
        )
      }
      const data = await response.json()
      setCustomStats(data || [])
    } catch (err) {
      console.error("Erreur:", err)
      setError(err instanceof Error ? err.message : "Erreur inconnue")
      setCustomStats([]) // En cas d'erreur, initialiser avec un tableau vide
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchCustomStats(true) // Afficher le loading uniquement au premier chargement

    // Écouter les événements de mise à jour
    const handleUpdate = () => {
      fetchCustomStats(false) // Ne pas afficher le loading lors des mises à jour
    }
    window.addEventListener("customStatsUpdated", handleUpdate)

    return () => {
      window.removeEventListener("customStatsUpdated", handleUpdate)
    }
  }, [])

  return {
    customStats,
    isLoading,
    error,
    refetch: fetchCustomStats,
  }
}
