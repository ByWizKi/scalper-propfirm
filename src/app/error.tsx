"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { AlertCircle } from "lucide-react"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log l'erreur pour le débogage
    console.error("Application error:", error)
  }, [error])

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-900 px-4">
      <div className="text-center space-y-4 max-w-md">
        <div className="flex justify-center">
          <AlertCircle className="h-16 w-16 text-red-500" />
        </div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          Une erreur est survenue
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          {error.message || "Une erreur inattendue s&apos;est produite"}
        </p>
        {error.digest && (
          <p className="text-xs text-zinc-500 dark:text-zinc-500">
            Code d&apos;erreur: {error.digest}
          </p>
        )}
        <div className="flex gap-4 justify-center">
          <Button onClick={reset} variant="default">
            Réessayer
          </Button>
          <Button onClick={() => (window.location.href = "/dashboard")} variant="outline">
            Retour au tableau de bord
          </Button>
        </div>
      </div>
    </div>
  )
}
