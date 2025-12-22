// Désactiver le pré-rendu pour cette route
export const dynamic = "force-dynamic"

export default function ApiDocsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
