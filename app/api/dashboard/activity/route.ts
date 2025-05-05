import { NextResponse } from "next/server"
import { db } from "@/lib/db/client"
import { auditLogs } from "@/lib/db/schema"
import { eq, and, desc } from "drizzle-orm"
import { handleApiError } from "@/lib/api/error-handler"
import { logger } from "@/lib/logger"

export async function GET(request: Request) {
  try {
    // Get user ID from request headers (set by middleware)
    const userId = Number(request.headers.get("x-user-id"))
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get query parameters
    const url = new URL(request.url)
    const page = Number.parseInt(url.searchParams.get("page") || "1")
    const pageSize = Number.parseInt(url.searchParams.get("pageSize") || "20")
    const action = url.searchParams.get("action") || undefined

    // Calculate offset
    const offset = (page - 1) * pageSize

    // Build query for user's own activity logs
    let query = db
      .select({
        id: auditLogs.id,
        action: auditLogs.action,
        metadata: auditLogs.metadata,
        timestamp: auditLogs.timestamp,
        ipAddress: auditLogs.ipAddress,
        userAgent: auditLogs.userAgent,
      })
      .from(auditLogs)
      .where(eq(auditLogs.userId, userId))

    // Apply action filter if specified
    if (action) {
      query = query.where(eq(auditLogs.action, action))
    }

    // Get total count for pagination
    const countResult = await db
      .select({ count: db.fn.count() })
      .from(auditLogs)
      .where(action ? and(eq(auditLogs.userId, userId), eq(auditLogs.action, action)) : eq(auditLogs.userId, userId))

    const totalCount = Number(countResult[0].count)
    const totalPages = Math.ceil(totalCount / pageSize)

    // Get paginated results
    const logs = await query.orderBy(desc(auditLogs.timestamp)).limit(pageSize).offset(offset)

    // Format the logs for better readability
    const formattedLogs = logs.map((log) => {
      let metadata = {}
      if (log.metadata) {
        try {
          metadata = typeof log.metadata === "string" ? JSON.parse(log.metadata) : log.metadata
        } catch (e) {
          metadata = { raw: log.metadata }
        }
      }

      return {
        ...log,
        metadata,
        formattedAction: formatAction(log.action),
      }
    })

    return NextResponse.json({
      status: "success",
      data: formattedLogs,
      meta: {
        page,
        pageSize,
        totalCount,
        totalPages,
      },
    })
  } catch (error) {
    logger.error("Error fetching user activity logs:", error)
    return handleApiError(error, "/api/dashboard/activity")
  }
}

// Helper function to format action names for display
function formatAction(action: string): string {
  const actionMap: Record<string, string> = {
    login: "Logged In",
    logout: "Logged Out",
    register: "Account Created",
    password_reset: "Password Reset",
    email_changed: "Email Changed",
    profile_updated: "Profile Updated",
    kyc_submitted: "KYC Documents Submitted",
    kyc_approved: "KYC Approved",
    kyc_rejected: "KYC Rejected",
    deposit_created: "Deposit Initiated",
    deposit_completed: "Deposit Completed",
    withdrawal_requested: "Withdrawal Requested",
    withdrawal_approved: "Withdrawal Approved",
    withdrawal_rejected: "Withdrawal Rejected",
    investment_created: "Investment Created",
    investment_matured: "Investment Matured",
    two_factor_enabled: "Two-Factor Authentication Enabled",
    two_factor_disabled: "Two-Factor Authentication Disabled",
  }

  return actionMap[action] || action.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
}
