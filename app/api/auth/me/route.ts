/**
 * User profile API endpoint
 *
 * This protected endpoint returns the authenticated user's profile information.
 * It requires a valid JWT token in the request cookies.
 */

import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { users } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

export async function GET(request: NextRequest) {
  try {
    // Get user ID from request headers (set by middleware)
    const userId = request.headers.get("x-user-id")

    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    // Find user
    const userResult = await db
      .select({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        phone: users.phone,
        role: users.role,
        isVerified: users.isVerified,
        twoFactorEnabled: users.twoFactorEnabled,
        balanceInr: users.balanceInr,
        referralCode: users.referralCode,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, Number.parseInt(userId)))
      .limit(1)

    if (userResult.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const user = userResult[0]

    // Return user profile
    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone,
        role: user.role,
        isVerified: user.isVerified,
        twoFactorEnabled: user.twoFactorEnabled,
        balanceInr: user.balanceInr,
        referralCode: user.referralCode,
        createdAt: user.createdAt,
      },
    })
  } catch (error) {
    console.error("Get user profile error:", error)
    return NextResponse.json({ error: "Failed to retrieve user profile. Please try again later." }, { status: 500 })
  }
}
