import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db/client"
import { users } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

export async function GET(request: NextRequest) {
  try {
    // Get user ID from request headers (set by middleware)
    const userId = request.headers.get("x-user-id")
    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    // Get user's balance
    const [user] = await db
      .select({ balanceInr: users.balanceInr })
      .from(users)
      .where(eq(users.id, Number.parseInt(userId)))

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json({
      status: "success",
      data: {
        balanceInr: user.balanceInr,
      },
    })
  } catch (error) {
    console.error("Error fetching user balance:", error)
    return NextResponse.json({ error: "Failed to fetch balance" }, { status: 500 })
  }
}
