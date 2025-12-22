"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { CheckCircle2, XCircle, AlertCircle, Info, Sparkles, Edit, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Notification as NotificationData } from "@/lib/notification-store"
import type { LucideIcon } from "lucide-react"

const ICON_MAP: Record<NotificationData["type"], LucideIcon> = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertCircle,
  info: Info,
  create: Sparkles,
  update: Edit,
  delete: Trash2,
}

const COLOR_MAP: Record<
  NotificationData["type"],
  {
    bg: string
    bgGradient: string
    text: string
    border: string
    icon: string
    glow: string
    shadow: string
  }
> = {
  // Succès général - Vert émeraude doux
  success: {
    bg: "bg-gradient-to-br from-emerald-500 via-green-500 to-teal-500",
    bgGradient: "from-emerald-500/90 via-green-500/90 to-teal-500/90",
    text: "text-white",
    border: "border-emerald-400/50",
    icon: "text-emerald-100",
    glow: "shadow-[0_0_20px_rgba(16,185,129,0.4)]",
    shadow: "shadow-emerald-500/20",
  },
  // Erreur - Rouge/rose vif
  error: {
    bg: "bg-gradient-to-br from-rose-500 via-red-500 to-pink-500",
    bgGradient: "from-rose-500/90 via-red-500/90 to-pink-500/90",
    text: "text-white",
    border: "border-rose-400/50",
    icon: "text-rose-100",
    glow: "shadow-[0_0_20px_rgba(244,63,94,0.4)]",
    shadow: "shadow-rose-500/20",
  },
  // Avertissement - Jaune/ambre
  warning: {
    bg: "bg-gradient-to-br from-amber-500 via-yellow-500 to-orange-500",
    bgGradient: "from-amber-500/90 via-yellow-500/90 to-orange-500/90",
    text: "text-white",
    border: "border-amber-400/50",
    icon: "text-amber-100",
    glow: "shadow-[0_0_20px_rgba(245,158,11,0.4)]",
    shadow: "shadow-amber-500/20",
  },
  // Information - Bleu ciel
  info: {
    bg: "bg-gradient-to-br from-sky-500 via-blue-500 to-cyan-500",
    bgGradient: "from-sky-500/90 via-blue-500/90 to-cyan-500/90",
    text: "text-white",
    border: "border-sky-400/50",
    icon: "text-sky-100",
    glow: "shadow-[0_0_20px_rgba(14,165,233,0.4)]",
    shadow: "shadow-sky-500/20",
  },
  // Création - Vert cyan vif (nouveau, dynamique)
  create: {
    bg: "bg-gradient-to-br from-cyan-500 via-emerald-500 to-teal-500",
    bgGradient: "from-cyan-500/90 via-emerald-500/90 to-teal-500/90",
    text: "text-white",
    border: "border-cyan-400/50",
    icon: "text-cyan-100",
    glow: "shadow-[0_0_25px_rgba(6,182,212,0.5)]",
    shadow: "shadow-cyan-500/30",
  },
  // Modification - Indigo/violet (changement, neutre)
  update: {
    bg: "bg-gradient-to-br from-indigo-500 via-purple-500 to-violet-500",
    bgGradient: "from-indigo-500/90 via-purple-500/90 to-violet-500/90",
    text: "text-white",
    border: "border-indigo-400/50",
    icon: "text-indigo-100",
    glow: "shadow-[0_0_20px_rgba(99,102,241,0.5)]",
    shadow: "shadow-indigo-500/30",
  },
  // Suppression - Rouge foncé/orange foncé (destructif, attention)
  delete: {
    bg: "bg-gradient-to-br from-red-600 via-rose-600 to-orange-600",
    bgGradient: "from-red-600/90 via-rose-600/90 to-orange-600/90",
    text: "text-white",
    border: "border-red-400/50",
    icon: "text-red-100",
    glow: "shadow-[0_0_25px_rgba(220,38,38,0.5)]",
    shadow: "shadow-red-600/30",
  },
}

interface NotificationItemProps {
  notification: NotificationData
  onClose: () => void
  index: number
}

export function NotificationItem({ notification, onClose, index }: NotificationItemProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isExiting, setIsExiting] = useState(false)

  useEffect(() => {
    // Animation d'entrée
    const timer = setTimeout(() => setIsVisible(true), 10)

    // Animation de sortie
    const duration = notification.duration ?? 2500
    const exitTimer = setTimeout(() => setIsExiting(true), duration)
    const closeTimer = setTimeout(() => {
      setIsVisible(false)
      onClose()
    }, duration + 300)

    return () => {
      clearTimeout(timer)
      clearTimeout(exitTimer)
      clearTimeout(closeTimer)
    }
  }, [notification.duration, onClose])

  if (!isVisible) return null

  const Icon = ICON_MAP[notification.type]
  const colors = COLOR_MAP[notification.type]

  return createPortal(
    <div
      className={cn(
        "fixed right-4 z-[9999] pointer-events-none",
        isExiting ? "animate-notification-out" : "animate-notification-in"
      )}
      style={{
        top: `${16 + index * 88}px`,
      }}
    >
      <div
        className={cn(
          "relative flex items-center gap-3 px-4 py-3 rounded-xl border-2",
          "backdrop-blur-md min-w-[280px] max-w-[400px]",
          "overflow-hidden",
          colors.bg,
          colors.text,
          colors.border,
          colors.glow,
          "shadow-2xl",
          "before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent before:-translate-x-full before:animate-shine"
        )}
      >
        {/* Effet de brillance animé */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-shine" />

        {/* Icône avec effet de glow */}
        <div className={cn("shrink-0 relative z-10", colors.icon)}>
          <div className={cn("absolute inset-0 blur-md opacity-50", colors.icon)}>
            <Icon className="h-5 w-5" />
          </div>
          <Icon className="h-5 w-5 relative z-10 drop-shadow-lg" />
        </div>

        {/* Contenu */}
        <div className="flex-1 min-w-0 relative z-10">
          {notification.title && (
            <p className="text-xs font-bold mb-0.5 opacity-95 drop-shadow-sm">
              {notification.title}
            </p>
          )}
          <p className="text-sm font-semibold leading-tight break-words drop-shadow-sm">
            {notification.message}
          </p>
        </div>

        {/* Barre de progression animée */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20 overflow-hidden">
          <div
            className={cn("h-full bg-white/40 animate-progress", colors.bg)}
            style={{
              animation: `progress ${notification.duration ?? 2500}ms linear forwards`,
            }}
          />
        </div>
      </div>
    </div>,
    document.body
  )
}
