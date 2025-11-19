"use client"

import { Button } from "@/components/ui/button"
import { FileQuestion } from "lucide-react"

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-900 px-4">
      <div className="text-center space-y-4 max-w-md">
        <div className="flex justify-center">
          <FileQuestion className="h-16 w-16 text-zinc-400" />
        </div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          404 - Page non trouvée
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          La page que vous recherchez n&apos;existe pas ou a été déplacée.
        </p>
        <div className="flex gap-4 justify-center">
          <Button variant="default" onClick={() => (window.location.href = "/dashboard")}>
            Retour au tableau de bord
          </Button>
          <Button variant="outline" onClick={() => (window.location.href = "/")}>
            Page d&apos;accueil
          </Button>
        </div>
      </div>
    </div>
  )
}
