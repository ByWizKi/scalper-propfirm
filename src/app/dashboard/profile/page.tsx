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
        <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 mt-1 sm:mt-2">
          Gérez vos informations personnelles et paramètres de sécurité
        </p>
      </div>

      <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <User className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
              Informations personnelles
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Vos informations de compte
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4">
            <div>
              <p className="text-xs sm:text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                Pseudo
              </p>
              <p className="text-base sm:text-lg font-semibold break-words">
                {(session?.user as any)?.username || "Non défini"}
              </p>
            </div>
            {session?.user?.name && (
              <div>
                <p className="text-xs sm:text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                  Nom
                </p>
                <p className="text-base sm:text-lg font-semibold break-words">{session.user.name}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Sécurité</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
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

