/**
 * Email verification API endpoint
 *
 * This endpoint verifies a user's email address using a token
 * sent to their email during registration.
 */

import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { users } from "@/lib/db/schema"
import { verifyEmailToken } from "@/lib/auth/jwt"
import { sendWelcomeEmail } from "@/lib/services/email-service"
import { eq } from "drizzle-orm"

export async function GET(request: NextRequest) {
  try {
    // Get token from query parameters
    const { searchParams } = new URL(request.url)
    const token = searchParams.get("token")

    if (!token) {
      return NextResponse.json({ error: "Verification token is required" }, { status: 400 })
    }

    // Verify token
    const { userId, email } = await verifyEmailToken(token)

    // Find user
    const userResult = await db
      .select({ id: users.id, fullName: users.fullName, isVerified: users.isVerified })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)

    if (userResult.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const user = userResult[0]

    // Check if already verified
    if (user.isVerified) {
      return NextResponse.json({ message: "Email already verified" }, { status: 200 })
    }

    // Update user verification status
    await db.update(users).set({ isVerified: true }).where(eq(users.id, userId))

    // Send welcome email
    await sendWelcomeEmail(email, user.fullName)

    // Redirect to frontend with success message
    return NextResponse.redirect(new URL("/auth/login?verified=true", request.url))
  } catch (error) {
    console.error("Email verification error:", error)

    // Redirect to frontend with error message
    return NextResponse.redirect(new URL("/auth/verify-email-error", request.url))
  }
}
