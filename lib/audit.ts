import { db } from "@/lib/db/client"
import { auditLogs } from "@/lib/db/schema"
import { logger } from "@/lib/logger"
import { notifyAdminsOfSecurityEvent } from "@/lib/notifications/server"

interface AuditLogData {
  userId?: number
  action: string
  metadata?: Record<string, any>
  ipAddress?: string
  userAgent?: string
  isSecurity?: boolean
}

export async function createAuditLog(data: AuditLogData) {
  try {
    const [log] = await db
      .insert(auditLogs)
      .values({
        userId: data.userId,
        action: data.action,
        metadata: data.metadata ? JSON.stringify(data.metadata) : null,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        timestamp: new Date(),
      })
      .returning()

    logger.debug(`Audit log created: ${log.id} - ${data.action}`)

    // If this is a security event, notify admins
    if (data.isSecurity) {
      await notifyAdminsOfSecurityEvent({
        action: data.action,
        userId: data.userId,
        metadata: data.metadata,
        ipAddress: data.ipAddress,
        timestamp: new Date(),
      })
    }

    return log
  } catch (error) {
    logger.error("Failed to create audit log:", error)
    // Don't throw the error - audit logs should never break the main flow
    return null
  }
}

export async function getAuditLogs({
  userId,
  action,
  limit = 100,
  offset = 0,
}: {
  userId?: number
  action?: string
  limit?: number
  offset?: number
}) {
  try {
    const query = db.select().from(auditLogs).limit(limit).offset(offset).orderBy(auditLogs.timestamp, "desc")

    if (userId) {
      query.where(auditLogs.userId, "=", userId)
    }

    if (action) {
      query.where(auditLogs.action, "=", action)
    }

    return await query
  } catch (error) {
    logger.error("Failed to get audit logs:", error)
    throw error
  }
}

// Security event logging functions
export const securityEvents = {
  failedLogin: async (userId: number, ipAddress?: string, userAgent?: string, metadata?: Record<string, any>) => {
    return createAuditLog({
      userId,
      action: "failed_login",
      metadata: metadata || {},
      ipAddress,
      userAgent,
      isSecurity: true,
    })
  },

  failedTwoFactor: async (userId: number, ipAddress?: string, userAgent?: string) => {
    return createAuditLog({
      userId,
      action: "failed_2fa",
      metadata: { attempts: 1 },
      ipAddress,
      userAgent,
      isSecurity: true,
    })
  },

  passwordReset: async (userId: number, ipAddress?: string, userAgent?: string) => {
    return createAuditLog({
      userId,
      action: "password_reset",
      ipAddress,
      userAgent,
      isSecurity: true,
    })
  },

  suspiciousWithdrawal: async (
    userId: number,
    withdrawalId: number,
    amount: string,
    currency: string,
    reason: string,
    ipAddress?: string,
  ) => {
    return createAuditLog({
      userId,
      action: "suspicious_withdrawal",
      metadata: { withdrawalId, amount, currency, reason },
      ipAddress,
      isSecurity: true,
    })
  },

  multipleFailedWithdrawals: async (userId: number, count: number, timeWindow: string) => {
    return createAuditLog({
      userId,
      action: "multiple_failed_withdrawals",
      metadata: { count, timeWindow },
      isSecurity: true,
    })
  },

  accountLocked: async (userId: number, reason: string, ipAddress?: string) => {
    return createAuditLog({
      userId,
      action: "account_locked",
      metadata: { reason },
      ipAddress,
      isSecurity: true,
    })
  },

  ipAddressChange: async (userId: number, oldIp: string, newIp: string) => {
    return createAuditLog({
      userId,
      action: "ip_address_change",
      metadata: { oldIp, newIp },
      ipAddress: newIp,
      isSecurity: true,
    })
  },
}
