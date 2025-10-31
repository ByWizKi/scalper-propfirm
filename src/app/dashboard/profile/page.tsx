"use client"

import { useSession } from "next-auth/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChangePasswordDialog } from "@/components/change-password-dialog"
import { User } from "lucide-react"

export default function ProfilePage() {
  const { data: session } = useSession()

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-50">Profil</h1>
        <p className="text-zinc-600 dark:text-zinc-400 mt-2">
          Gérez vos informations personnelles et paramètres de sécurité
        </p>
      </div>

      <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Informations personnelles
            </CardTitle>
            <CardDescription>
              Vos informations de compte
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                Pseudo
              </p>
              <p className="text-lg font-semibold break-words">
                {(session?.user as any)?.username || "Non défini"}
              </p>
            </div>
            {session?.user?.name && (
              <div>
                <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                  Nom
                </p>
                <p className="text-lg font-semibold break-words">{session.user.name}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sécurité</CardTitle>
            <CardDescription>
              Gérez la sécurité de votre compte
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChangePasswordDialog />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

