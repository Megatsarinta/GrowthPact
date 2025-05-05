/**
 * Token refresh API endpoint
 *
 * This endpoint issues a new access token using a valid refresh token.
 */

import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { users, refreshTokens } from "@/lib/db/schema"
import { createJwtToken } from "@/lib/auth/jwt"
import { eq, and, gt } from "drizzle-orm"
import { cookies } from "next/headers"

export async function POST(request: NextRequest) {
  try {
    // Get refresh token from cookies
    const cookieStore = cookies()
    const refreshToken = cookieStore.get("refreshToken")?.value

    if (!refreshToken) {
      return NextResponse.json({ error: "Refresh token is required" }, { status: 400 })
    }

    // Find refresh token in database
    const tokenResult = await db
      .select({
        id: refreshTokens.id,
        userId: refreshTokens.userId,
        expiresAt: refreshTokens.expiresAt,
      })
      .from(refreshTokens)
      .where(and(eq(refreshTokens.token, refreshToken), gt(refreshTokens.expiresAt, new Date())))
      .limit(1)

    if (tokenResult.length === 0) {
      return NextResponse.json({ error: "Invalid or expired refresh token" }, { status: 401 })
    }

    const token = tokenResult[0]

    // Find user
    const userResult = await db
      .select({
        id: users.id,
        email: users.email,
        role: users.role,
      })
      .from(users)
      .where(eq(users.id, token.userId))
      .limit(1)

    if (userResult.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const user = userResult[0]

    // Create new access token
    const newToken = createJwtToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    })

    // Set cookie
    cookieStore.set("token", newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60, // 1 hour
      path: "/",
    })

    // Return success response
    return NextResponse.json({
      message: "Token refreshed successfully",
    })
  } catch (error) {
    console.error("Token refresh error:", error)
    return NextResponse.json({ error: "Token refresh failed. Please try again later." }, { status: 500 })
  }
}
