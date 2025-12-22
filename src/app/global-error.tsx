"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { AlertTriangle } from "lucide-react"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log l'erreur critique pour le débogage
    console.error("Global application error:", error)
  }, [error])

  return (
    <html lang="fr">
      <body>
        <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-900 px-4">
          <div className="text-center space-y-4 max-w-md">
            <div className="flex justify-center">
              <AlertTriangle className="h-16 w-16 text-red-500" />
            </div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Erreur critique</h1>
            <p className="text-zinc-600 dark:text-zinc-400">
              Une erreur critique s&apos;est produite dans l&apos;application.
            </p>
            {error.message && (
              <p className="text-sm text-zinc-500 dark:text-zinc-500">{error.message}</p>
            )}
            {error.digest && (
              <p className="text-xs text-zinc-500 dark:text-zinc-500">
                Code d&apos;erreur: {error.digest}
              </p>
            )}
            <div className="flex gap-4 justify-center">
              <Button onClick={reset} variant="default">
                Réessayer
              </Button>
              <Button onClick={() => (window.location.href = "/")} variant="outline">
                Recharger l&apos;application
              </Button>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}
