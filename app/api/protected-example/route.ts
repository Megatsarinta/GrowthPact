/**
 * Protected API endpoint example
 *
 * This endpoint demonstrates how to create a protected route
 * that requires authentication.
 */

import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    // Get user ID from request headers (set by middleware)
    const userId = request.headers.get("x-user-id")
    const userEmail = request.headers.get("x-user-email")
    const userRole = request.headers.get("x-user-role")

    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    // Return protected data
    return NextResponse.json({
      message: "This is a protected endpoint",
      user: {
        id: userId,
        email: userEmail,
        role: userRole,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Protected endpoint error:", error)
    return NextResponse.json({ error: "An error occurred while accessing the protected endpoint" }, { status: 500 })
  }
}
