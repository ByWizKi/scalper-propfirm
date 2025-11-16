"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { LucideIcon } from "lucide-react"

/**
 * Props pour le composant StatCard polymorphe
 */
interface StatCardProps {
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
      <Card className={className}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <CardTitle className={`${sizes.title} truncate pr-2 cursor-help`}>{title}</CardTitle>
            </TooltipTrigger>
            <TooltipContent>
              <p>{title}</p>
            </TooltipContent>
          </Tooltip>
          <Icon className={`${sizes.icon} ${styles.icon} flex-shrink-0`} />
        </CardHeader>
        <CardContent>
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className={`${sizes.value} font-bold ${styles.value} truncate leading-tight cursor-help`}
              >
                {value}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="font-bold">{valueString}</p>
            </TooltipContent>
          </Tooltip>

          {secondaryText && (
            <Tooltip>
              <TooltipTrigger asChild>
                <p
                  className={`${sizes.secondary} ${styles.value} mt-0.5 sm:mt-1 truncate cursor-help`}
                >
                  {secondaryText}
                </p>
              </TooltipTrigger>
              <TooltipContent>
                <p>{secondaryText}</p>
              </TooltipContent>
            </Tooltip>
          )}

          {description && (
            <Tooltip>
              <TooltipTrigger asChild>
                <p
                  className={`${sizes.description} text-zinc-500 dark:text-zinc-400 mt-0.5 sm:mt-1 truncate cursor-help`}
                >
                  {description}
                </p>
              </TooltipTrigger>
              <TooltipContent>
                <p>{description}</p>
              </TooltipContent>
            </Tooltip>
          )}
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
