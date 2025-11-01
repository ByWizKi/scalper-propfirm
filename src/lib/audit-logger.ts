/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Système de logs d'audit
 * Enregistre toutes les actions importantes
 */

import { prisma } from "@/lib/prisma"

export enum AuditAction {
  LOGIN = "LOGIN",
  LOGOUT = "LOGOUT",
  LOGIN_FAILED = "LOGIN_FAILED",
  REGISTER = "REGISTER",
  PASSWORD_CHANGE = "PASSWORD_CHANGE",
  PASSWORD_CHANGE_FAILED = "PASSWORD_CHANGE_FAILED",
  ACCOUNT_CREATE = "ACCOUNT_CREATE",
  ACCOUNT_UPDATE = "ACCOUNT_UPDATE",
  ACCOUNT_DELETE = "ACCOUNT_DELETE",
  PNL_CREATE = "PNL_CREATE",
  PNL_UPDATE = "PNL_UPDATE",
  PNL_DELETE = "PNL_DELETE",
  WITHDRAWAL_CREATE = "WITHDRAWAL_CREATE",
  WITHDRAWAL_UPDATE = "WITHDRAWAL_UPDATE",
  WITHDRAWAL_DELETE = "WITHDRAWAL_DELETE",
  SUSPICIOUS_ACTIVITY = "SUSPICIOUS_ACTIVITY",
}

export interface AuditLogData {
  userId?: string
  action: AuditAction
  ipAddress?: string
  userAgent?: string
  metadata?: Record<string, any>
}

export async function logAudit(data: AuditLogData): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: data.userId,
        action: data.action,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        metadata: data.metadata ? JSON.parse(JSON.stringify(data.metadata)) : null,
      },
    })
  } catch (error) {
    // Ne pas bloquer l'app si le log échoue
    console.error("Erreur lors du log d'audit:", error)
  }
}

export function getClientInfo(req: Request): {
  ipAddress: string
  userAgent: string
} {
  const forwarded = req.headers.get("x-forwarded-for")
  const ipAddress = forwarded ? forwarded.split(",")[0] : "unknown"
  const userAgent = req.headers.get("user-agent") || "unknown"

  return { ipAddress, userAgent }
}

// Détection d'activité suspecte
export async function detectSuspiciousActivity(
  userId: string,
  ipAddress: string
): Promise<boolean> {
  try {
    // Vérifier les tentatives de connexion échouées récentes
    const recentFailedLogins = await prisma.auditLog.count({
      where: {
        userId,
        action: AuditAction.LOGIN_FAILED,
        createdAt: {
          gte: new Date(Date.now() - 60 * 60 * 1000), // Dernière heure
        },
      },
    })

    if (recentFailedLogins >= 3) {
      await logAudit({
        userId,
        action: AuditAction.SUSPICIOUS_ACTIVITY,
        ipAddress,
        metadata: {
          reason: "Multiple failed login attempts",
          count: recentFailedLogins,
        },
      })
      return true
    }

    // Vérifier changement d'IP drastique
    const lastLogin = await prisma.auditLog.findFirst({
      where: {
        userId,
        action: AuditAction.LOGIN,
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Dernières 24h
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    if (lastLogin && lastLogin.ipAddress !== ipAddress) {
      // IP différente - potentiellement suspect
      await logAudit({
        userId,
        action: AuditAction.SUSPICIOUS_ACTIVITY,
        ipAddress,
        metadata: {
          reason: "IP address change",
          previousIp: lastLogin.ipAddress,
          newIp: ipAddress,
        },
      })
      // Ne pas bloquer, juste logger
    }

    return false
  } catch (error) {
    console.error("Erreur détection activité suspecte:", error)
    return false
  }
}

// Obtenir les logs d'audit pour un utilisateur
export async function getUserAuditLogs(userId: string, limit = 50): Promise<any[]> {
  return prisma.auditLog.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  })
}

// Obtenir les activités suspectes récentes
export async function getSuspiciousActivities(limit = 20): Promise<any[]> {
  return prisma.auditLog.findMany({
    where: {
      action: AuditAction.SUSPICIOUS_ACTIVITY,
      createdAt: {
        gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 derniers jours
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      user: {
        select: {
          username: true,
          email: true,
        },
      },
    },
  })
}
