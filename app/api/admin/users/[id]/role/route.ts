import { NextResponse } from "next/server"
import { db } from "@/lib/db/client"
import { users } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { handleApiError } from "@/lib/api/error-handler"
import { logger } from "@/lib/logger"

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    // Get user role from request headers (set by middleware)
    const userRole = request.headers.get("x-user-role")
    if (userRole !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const userId = Number.parseInt(params.id)
    if (isNaN(userId)) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 })
    }

    // Parse the request body
    const body = await request.json()
    const { role } = body

    if (!role || !["user", "admin", "support"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 })
    }

    // Get the user
    const [user] = await db.select().from(users).where(eq(users.id, userId))

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Update the user's role
    const [updatedUser] = await db
      .update(users)
      .set({
        role: role as any,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning()

    logger.info(`User ${userId} role updated to ${role} by admin`, {
      userId,
      newRole: role,
      adminId: request.headers.get("x-user-id"),
    })

    return NextResponse.json({
      status: "success",
      message: "User role updated successfully",
      data: updatedUser,
    })
  } catch (error) {
    logger.error(`Error updating user ${params.id} role:`, error)
    return handleApiError(error, `/api/admin/users/${params.id}/role`)
  }
}
