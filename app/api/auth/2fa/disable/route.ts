/**
 * Two-factor authentication disable API endpoint
 *
 * This endpoint disables 2FA for the authenticated user.
 */

import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { users } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { cookies } from "next/headers"
import { verifyJwtToken } from "@/lib/auth/jwt"

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user from session
    const cookieStore = cookies()
    const sessionToken = cookieStore.get("token")?.value

    if (!sessionToken) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    try {
      const payload = await verifyJwtToken(sessionToken)

      // Find user
      const userResult = await db
        .select({
          id: users.id,
          email: users.email,
          twoFactorEnabled: users.twoFactorEnabled,
        })
        .from(users)
        .where(eq(users.id, payload.userId))
        .limit(1)

      if (userResult.length === 0) {
        return NextResponse.json({ error: "User not found" }, { status: 404 })
      }

      const user = userResult[0]

      // Check if 2FA is enabled
      if (!user.twoFactorEnabled) {
        return NextResponse.json({ error: "Two-factor authentication is not enabled" }, { status: 400 })
      }

      // Disable 2FA
      await db
        .update(users)
        .set({
          twoFactorEnabled: false,
          twoFactorSecret: null,
        })
        .where(eq(users.id, user.id))

      // Return success response
      return NextResponse.json({
        message: "Two-factor authentication disabled successfully",
      })
    } catch (error) {
      return NextResponse.json({ error: "Authentication failed" }, { status: 401 })
    }
  } catch (error) {
    console.error("2FA disable error:", error)
    return NextResponse.json(
      { error: "Failed to disable two-factor authentication. Please try again later." },
      { status: 500 },
    )
  }
}
