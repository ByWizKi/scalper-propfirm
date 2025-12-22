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
  /** Texte complet à afficher dans le tooltip (si différent de value) (optionnel) */
  valueTooltip?: string
}

/**
 * Mapping des variantes vers les classes Tailwind
 */
const variantStyles = {
  default: {
    icon: "text-slate-500 dark:text-slate-400",
    value: "text-slate-900 dark:text-slate-50",
  },
  success: {
    icon: "text-green-600 dark:text-green-500",
    value: "text-green-600 dark:text-green-500",
  },
  danger: {
    icon: "text-red-600 dark:text-red-500",
    value: "text-red-600 dark:text-red-500",
  },
  warning: {
    icon: "text-cyan-600 dark:text-cyan-400",
    value: "text-cyan-600 dark:text-cyan-400",
  },
  neutral: {
    icon: "text-slate-500 dark:text-slate-400",
    value: "text-slate-900 dark:text-slate-50",
  },
}

/**
 * Mapping des tailles vers les classes Tailwind
 */
const sizeStyles = {
  sm: {
    value: "text-sm sm:text-base",
    title: "text-xs sm:text-sm font-semibold",
    icon: "h-4 w-4 sm:h-5 sm:w-5",
    description: "text-xs",
    secondary: "text-xs",
  },
  md: {
    value: "text-base sm:text-lg md:text-xl",
    title: "text-xs sm:text-sm font-semibold",
    icon: "h-4 w-4 sm:h-5 sm:w-5",
    description: "text-xs",
    secondary: "text-xs",
  },
  lg: {
    value: "text-lg sm:text-xl md:text-2xl",
    title: "text-xs sm:text-sm font-semibold",
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
  valueTooltip,
}: StatCardProps) {
  const styles = variantStyles[variant]
  const sizes = sizeStyles[size]

  // Convertir la valeur en string pour l'affichage
  const valueString = typeof value === "number" ? value.toString() : value
  // Utiliser valueTooltip si fourni, sinon utiliser valueString
  const tooltipValue = valueTooltip ?? valueString

  return (
    <TooltipProvider>
      <Card
        className={`rounded-2xl border border-slate-200/70 dark:border-[#1e293b]/70 bg-white/85 dark:bg-[#151b2e]/90 backdrop-blur-sm shadow-sm h-full ${className}`}
      >
        <CardContent className="p-4 sm:p-5 md:p-6 flex flex-col h-full">
          <div className="flex items-start justify-between gap-2 sm:gap-3 mb-2 sm:mb-3 flex-shrink-0">
            <div className="flex-1 min-w-0">
              <Tooltip>
                <TooltipTrigger asChild>
                  <h3
                    className={`${sizes.title} text-slate-600 dark:text-slate-300 break-words cursor-help line-clamp-2`}
                  >
                    {title}
                  </h3>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs break-words">{title}</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <Icon className={`${sizes.icon} ${styles.icon} flex-shrink-0 mt-0.5`} />
          </div>

          <div className="space-y-1 flex-1 flex flex-col justify-between">
            <div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className={`${sizes.value} font-bold ${styles.value} break-words leading-tight cursor-help min-w-0 truncate`}
                  >
                    {value}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-bold wrap-break-word max-w-xs">{tooltipValue}</p>
                  {secondaryText && (
                    <p className="text-xs mt-1 wrap-break-word max-w-xs">{secondaryText}</p>
                  )}
                </TooltipContent>
              </Tooltip>
            </div>

            <div className="mt-auto">
              {description && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <p
                      className={`${sizes.description} text-slate-500 dark:text-slate-300 break-words cursor-help line-clamp-2`}
                    >
                      {description}
                    </p>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs break-words">{description}</p>
                  </TooltipContent>
                </Tooltip>
              )}

              {secondaryText && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <p
                      className={`${sizes.secondary} text-slate-400 dark:text-slate-400 break-words cursor-help line-clamp-1 mt-1`}
                    >
                      {secondaryText}
                    </p>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs break-words">{secondaryText}</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
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
