import { NextResponse } from "next/server"
import { db } from "@/lib/db/client"
import { auditLogs, users } from "@/lib/db/schema"
import { eq, like, desc } from "drizzle-orm"
import { handleApiError } from "@/lib/api/error-handler"
import { logger } from "@/lib/logger"

export async function GET(request: Request) {
  try {
    // Get user role from request headers (set by middleware)
    const userRole = request.headers.get("x-user-role")
    if (userRole !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Get query parameters
    const url = new URL(request.url)
    const page = Number.parseInt(url.searchParams.get("page") || "1")
    const pageSize = Number.parseInt(url.searchParams.get("pageSize") || "50")
    const action = url.searchParams.get("action") || "all"

    // Calculate offset
    const offset = (page - 1) * pageSize

    // Build query
    let query = db
      .select({
        ...auditLogs,
        user: {
          email: users.email,
          fullName: users.fullName,
        },
      })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.userId, users.id))

    // Apply action filter if specified
    if (action !== "all") {
      query = query.where(like(auditLogs.action, `%${action}%`))
    }

    // Get total count for pagination
    const countResult = await db
      .select({ count: db.fn.count() })
      .from(auditLogs)
      .where(action !== "all" ? like(auditLogs.action, `%${action}%`) : undefined)

    const totalCount = Number(countResult[0].count)
    const totalPages = Math.ceil(totalCount / pageSize)

    // Get paginated results
    const logs = await query.orderBy(desc(auditLogs.timestamp)).limit(pageSize).offset(offset)

    return NextResponse.json({
      status: "success",
      data: logs,
      meta: {
        page,
        pageSize,
        totalCount,
        totalPages,
      },
    })
  } catch (error) {
    logger.error("Error fetching audit logs:", error)
    return handleApiError(error, "/api/admin/audit-logs")
  }
}
