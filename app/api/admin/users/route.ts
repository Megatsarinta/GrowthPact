import { NextResponse } from "next/server"
import { db } from "@/lib/db/client"
import { users } from "@/lib/db/schema"
import { handleApiError } from "@/lib/api/error-handler"
import { logger } from "@/lib/logger"

export async function GET(request: Request) {
  try {
    // Get user role from request headers (set by middleware)
    const userRole = request.headers.get("x-user-role")
    if (userRole !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Query the database for all users
    const allUsers = await db.select().from(users).orderBy(users.createdAt, "desc")

    return NextResponse.json({
      status: "success",
      data: allUsers,
    })
  } catch (error) {
    logger.error("Error fetching users:", error)
    return handleApiError(error, "/api/admin/users")
  }
}
