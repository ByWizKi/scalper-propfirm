import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { secureCookieOptions } from "./security"

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),

  // 🔥 SESSIONS JWT (obligatoire avec CredentialsProvider)
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 jours
    updateAge: 24 * 60 * 60, // Mettre à jour la session toutes les 24h
  },

  // 🔒 Configuration sécurisée des cookies
  cookies: secureCookieOptions,

  // 🔐 Configuration JWT sécurisée
  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30 jours
  },

  // 🛡️ Utiliser des secrets forts
  secret: process.env.NEXTAUTH_SECRET,

  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        username: { label: "Pseudo", type: "text" },
        password: { label: "Mot de passe", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          throw new Error("Pseudo et mot de passe requis")
        }

        const user = await prisma.user.findUnique({
          where: { username: credentials.username }
        })

        if (!user || !user.password) {
          throw new Error("Pseudo ou mot de passe incorrect")
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        )

        if (!isPasswordValid) {
          throw new Error("Pseudo ou mot de passe incorrect")
        }

        return {
          id: user.id,
          username: user.username,
          name: user.name,
          email: user.email || "",
          image: user.image,
        } as any
      }
    })
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.username = (user as any).username
      }
      return token
    },
    async session({ session, token }) {
      if (session?.user) {
        session.user.id = token.id as string
        ;(session.user as any).username = token.username
      }
      return session
    },
  },

  pages: {
    signIn: "/auth/login",
    signOut: "/auth/logout",
    error: "/auth/error",
  },

  debug: process.env.NODE_ENV === "development",
}


