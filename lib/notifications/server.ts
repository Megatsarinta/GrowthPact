import { db } from "@/lib/db/client"
import { notifications, users } from "@/lib/db/schema"
import { emitToUser } from "@/lib/socket/server"
import { sendEmail } from "@/lib/services/email-service"
import { logger } from "@/lib/logger"
import { eq } from "drizzle-orm"

export enum NotificationType {
  DEPOSIT_CONFIRMED = "deposit_confirmed",
  WITHDRAWAL_PROCESSED = "withdrawal_processed",
  INTEREST_ACCRUED = "interest_accrued",
  KYC_VERIFIED = "kyc_verified",
  KYC_REJECTED = "kyc_rejected",
  SYSTEM = "system",
  SECURITY_ALERT = "security_alert",
}

export interface NotificationPayload {
  userId: number
  type: NotificationType
  title: string
  message: string
  data?: Record<string, any>
}

export async function createNotification(payload: NotificationPayload) {
  try {
    // Insert notification into database
    const [notification] = await db
      .insert(notifications)
      .values({
        userId: payload.userId,
        type: payload.type,
        title: payload.title,
        message: payload.message,
        data: payload.data || {},
        isRead: false,
      })
      .returning()

    // Emit real-time notification to user
    emitToUser(payload.userId, "notification", {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      data: notification.data,
      createdAt: notification.createdAt,
    })

    return notification
  } catch (error) {
    logger.error("Failed to create notification:", error)
    throw error
  }
}

// Other existing functions...

// New function to notify all admin users of security events
export async function notifyAdminsOfSecurityEvent(event: {
  action: string
  userId?: number
  metadata?: Record<string, any>
  ipAddress?: string
  timestamp: Date
}) {
  try {
    // Get all admin users
    const adminUsers = await db.select().from(users).where(eq(users.role, "admin"))

    if (!adminUsers.length) {
      logger.warn("No admin users found to notify about security event")
      return
    }

    // Format the security event message
    let title = "Security Alert"
    let message = "A security event has been detected."

    switch (event.action) {
      case "failed_login":
        title = "Failed Login Attempt"
        message = `Failed login attempt for user ID ${event.userId} from IP ${event.ipAddress || "unknown"}`
        break
      case "failed_2fa":
        title = "Failed 2FA Attempt"
        message = `Failed two-factor authentication attempt for user ID ${event.userId}`
        break
      case "suspicious_withdrawal":
        title = "Suspicious Withdrawal Detected"
        message = `Suspicious withdrawal detected for user ID ${event.userId}: ${
          event.metadata?.amount
        } ${event.metadata?.currency}`
        break
      case "multiple_failed_withdrawals":
        title = "Multiple Failed Withdrawals"
        message = `User ID ${event.userId} has ${event.metadata?.count} failed withdrawal attempts in ${event.metadata?.timeWindow}`
        break
      case "account_locked":
        title = "Account Locked"
        message = `Account for user ID ${event.userId} has been locked: ${event.metadata?.reason}`
        break
      case "ip_address_change":
        title = "Unusual IP Address Change"
        message = `User ID ${event.userId} logged in from a new location: ${event.metadata?.newIp}`
        break
    }

    // Notify each admin
    for (const admin of adminUsers) {
      await createNotification({
        userId: admin.id,
        type: NotificationType.SECURITY_ALERT,
        title,
        message,
        data: {
          ...event,
          securityEvent: true,
          timestamp: event.timestamp.toISOString(),
        },
      })

      // Also send email for critical security events
      if (
        event.action === "suspicious_withdrawal" ||
        event.action === "account_locked" ||
        event.action === "multiple_failed_withdrawals"
      ) {
        await sendEmail({
          to: admin.email,
          subject: `[SECURITY ALERT] ${title}`,
          text: `${message}\n\nTimestamp: ${event.timestamp.toLocaleString()}\nIP: ${
            event.ipAddress || "Unknown"
          }\n\nPlease check the admin dashboard for more details.`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #ef4444;">Security Alert: ${title}</h2>
              <p>${message}</p>
              <p><strong>Timestamp:</strong> ${event.timestamp.toLocaleString()}</p>
              <p><strong>IP Address:</strong> ${event.ipAddress || "Unknown"}</p>
              ${
                event.metadata
                  ? `<p><strong>Additional Information:</strong> ${JSON.stringify(event.metadata)}</p>`
                  : ""
              }
              <p>Please check the admin dashboard for more details and take appropriate action if necessary.</p>
            </div>
          `,
        })
      }
    }

    return true
  } catch (error) {
    logger.error("Failed to notify admins of security event:", error)
    return false
  }
}

// Other existing notification helper functions...
