/**
 * Page Swagger UI pour la documentation de l'API
 */

"use client"

import { useEffect, useState } from "react"
import dynamic from "next/dynamic"

// Charger SwaggerUI uniquement côté client
const SwaggerUI = dynamic(() => import("swagger-ui-react"), { ssr: false })
import "swagger-ui-react/swagger-ui.css"

export default function ApiDocsPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [spec, setSpec] = useState<any>(null)

  useEffect(() => {
    fetch("/api/docs")
      .then((res) => res.json())
      .then((data) => setSpec(data))
      .catch((err) => console.error("Erreur lors du chargement de la spec:", err))
  }, [])

  if (!spec) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement de la documentation...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <SwaggerUI spec={spec} />
    </div>
  )
}
