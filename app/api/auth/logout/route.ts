/**
 * User logout API endpoint
 *
 * This endpoint clears the authentication cookies and invalidates
 * the refresh token in the database.
 */

import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { refreshTokens } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { cookies } from "next/headers"

export async function POST(request: NextRequest) {
  try {
    // Get refresh token from cookies
    const cookieStore = cookies()
    const refreshToken = cookieStore.get("refreshToken")?.value

    // If refresh token exists, invalidate it in the database
    if (refreshToken) {
      await db.delete(refreshTokens).where(eq(refreshTokens.token, refreshToken))
    }

    // Clear cookies
    cookieStore.delete("token")
    cookieStore.delete("refreshToken")

    // Return success response
    return NextResponse.json({
      message: "Logout successful",
    })
  } catch (error) {
    console.error("Logout error:", error)
    return NextResponse.json({ error: "Logout failed. Please try again later." }, { status: 500 })
  }
}
