"use client"

import * as React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { LucideIcon } from "lucide-react"

/**
 * Props pour le composant StatCard polymorphe
 */
export interface StatCardProps {
  /** Titre de la card */
  title: string
  /** Valeur principale à afficher */
  value: string | number
  /** Icône Lucide à afficher */
  icon: LucideIcon
  /** Couleur de l'icône et du texte (optionnel) */
  variant?: "default" | "success" | "danger" | "warning" | "neutral"
  /** Texte descriptif supplémentaire (optionnel) */
  description?: string
  /** Texte secondaire (ex: conversion EUR) (optionnel) */
  secondaryText?: string
  /** Classe CSS supplémentaire (optionnel) */
  className?: string
  /** Taille de la card */
  size?: "sm" | "md" | "lg"
}

/**
 * Mapping des variantes vers les classes Tailwind
 */
const variantStyles = {
  default: {
    icon: "text-zinc-500 dark:text-zinc-400",
    value: "text-zinc-900 dark:text-zinc-50",
  },
  success: {
    icon: "text-green-600 dark:text-green-400",
    value: "text-green-600 dark:text-green-400",
  },
  danger: {
    icon: "text-red-600 dark:text-red-400",
    value: "text-red-600 dark:text-red-400",
  },
  warning: {
    icon: "text-orange-600 dark:text-orange-400",
    value: "text-orange-600 dark:text-orange-400",
  },
  neutral: {
    icon: "text-zinc-500 dark:text-zinc-400",
    value: "text-zinc-900 dark:text-zinc-50",
  },
}

/**
 * Mapping des tailles vers les classes Tailwind
 */
const sizeStyles = {
  sm: {
    value: "text-lg sm:text-xl",
    title: "text-sm font-semibold",
    icon: "h-4 w-4",
    description: "text-xs",
    secondary: "text-xs",
  },
  md: {
    value: "text-xl sm:text-2xl",
    title: "text-sm font-semibold",
    icon: "h-4 w-4 sm:h-5 sm:w-5",
    description: "text-xs",
    secondary: "text-xs",
  },
  lg: {
    value: "text-2xl sm:text-3xl",
    title: "text-sm font-semibold",
    icon: "h-5 w-5 sm:h-6 sm:w-6",
    description: "text-xs sm:text-sm",
    secondary: "text-xs sm:text-sm",
  },
}

/**
 * Composant polymorphe et responsive pour afficher des statistiques
 *
 * @example
 * ```tsx
 * <StatCard
 *   title="PnL Total"
 *   value="+$1,250.00"
 *   icon={TrendingUp}
 *   variant="success"
 *   description="8 jours de trading"
 *   secondaryText="€1,150.00"
 * />
 * ```
 */
export function StatCard({
  title,
  value,
  icon: Icon,
  variant = "default",
  description,
  secondaryText,
  className = "",
  size = "md",
}: StatCardProps) {
  const styles = variantStyles[variant]
  const sizes = sizeStyles[size]

  // Convertir la valeur en string pour l'affichage
  const valueString = typeof value === "number" ? value.toString() : value

  return (
    <TooltipProvider>
      <Card
        className={`rounded-2xl border border-zinc-200/70 dark:border-zinc-800/70 bg-white/85 dark:bg-zinc-950/70 backdrop-blur-sm shadow-sm ${className}`}
      >
        <CardContent className="p-3 sm:p-4 md:p-5">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex-1 min-w-0">
              <Tooltip>
                <TooltipTrigger asChild>
                  <h3
                    className={`${sizes.title} text-zinc-600 dark:text-zinc-400 truncate cursor-help`}
                  >
                    {title}
                  </h3>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{title}</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <Icon className={`${sizes.icon} ${styles.icon} flex-shrink-0`} />
          </div>

          <div className="space-y-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className={`${sizes.value} font-bold ${styles.value} truncate leading-tight cursor-help min-w-0 overflow-hidden text-ellipsis whitespace-nowrap`}
                >
                  {value}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-bold">{valueString}</p>
                {secondaryText && <p className="text-xs mt-1">{secondaryText}</p>}
              </TooltipContent>
            </Tooltip>

            {description && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <p
                    className={`${sizes.description} text-zinc-500 dark:text-zinc-400 truncate cursor-help`}
                  >
                    {description}
                  </p>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{description}</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  )
}

/**
 * Hook personnalisé pour déterminer automatiquement la variante en fonction d'un nombre
 */
export function useStatVariant(value: number): "success" | "danger" | "neutral" {
  if (value > 0) return "success"
  if (value < 0) return "danger"
  return "neutral"
}
