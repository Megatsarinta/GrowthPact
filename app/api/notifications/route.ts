import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db/client"
import { notifications } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"
import { markNotificationAsRead, markAllNotificationsAsRead } from "@/lib/notifications/server"

// GET endpoint to retrieve user's notifications
export async function GET(request: NextRequest) {
  try {
    // Get user ID from request headers (set by middleware)
    const userId = request.headers.get("x-user-id")
    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    // Get query parameters for pagination
    const url = new URL(request.url)
    const limit = Number.parseInt(url.searchParams.get("limit") || "20")
    const offset = Number.parseInt(url.searchParams.get("offset") || "0")
    const unreadOnly = url.searchParams.get("unread") === "true"

    // Query notifications for the user
    const userNotifications = await db.query.notifications.findMany({
      where: (notifications, { eq, and }) => {
        const conditions = [eq(notifications.userId, Number.parseInt(userId))]
        if (unreadOnly) {
          conditions.push(eq(notifications.isRead, false))
        }
        return and(...conditions)
      },
      orderBy: (notifications, { desc }) => [desc(notifications.createdAt)],
      limit,
      offset,
    })

    // Count total notifications and unread notifications
    const [{ total }] = await db
      .select({ total: db.fn.count() })
      .from(notifications)
      .where(eq(notifications.userId, Number.parseInt(userId)))

    const [{ unread }] = await db
      .select({ unread: db.fn.count() })
      .from(notifications)
      .where(and(eq(notifications.userId, Number.parseInt(userId)), eq(notifications.isRead, false)))

    return NextResponse.json({
      status: "success",
      data: userNotifications,
      meta: {
        total: Number(total),
        unread: Number(unread),
        limit,
        offset,
      },
    })
  } catch (error) {
    console.error("Error fetching notifications:", error)
    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 })
  }
}

// PATCH endpoint to mark notification as read
export async function PATCH(request: NextRequest) {
  try {
    // Get user ID from request headers (set by middleware)
    const userId = request.headers.get("x-user-id")
    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    // Parse request body
    const body = await request.json()
    const { id, all } = body

    if (all === true) {
      // Mark all notifications as read
      await markAllNotificationsAsRead(Number.parseInt(userId))
      return NextResponse.json({
        status: "success",
        message: "All notifications marked as read",
      })
    } else if (id) {
      // Mark specific notification as read
      await markNotificationAsRead(id, Number.parseInt(userId))
      return NextResponse.json({
        status: "success",
        message: "Notification marked as read",
      })
    } else {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 })
    }
  } catch (error) {
    console.error("Error updating notification:", error)
    return NextResponse.json({ error: "Failed to update notification" }, { status: 500 })
  }
}
