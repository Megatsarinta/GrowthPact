/**
 * Two-factor authentication verification API endpoint
 *
 * This endpoint verifies a TOTP code and enables 2FA for the user
 * if the code is valid.
 */

import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { users } from "@/lib/db/schema"
import { verifyTOTP } from "@/lib/auth/two-factor"
import { createJwtToken } from "@/lib/auth/jwt"
import { twoFactorVerifySchema } from "@/lib/validation/auth-schemas"
import { eq } from "drizzle-orm"
import { cookies } from "next/headers"
import { send2FASetupEmail } from "@/lib/services/email-service"
import { verifyJwtToken } from "@/lib/auth/jwt"

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json()
    const validationResult = twoFactorVerifySchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json({ error: "Validation failed", details: validationResult.error.errors }, { status: 400 })
    }

    const { token } = validationResult.data
    const tempToken = body.tempToken

    // If this is a login verification
    if (tempToken) {
      try {
        // Verify the temporary token
        const payload = await verifyJwtToken(tempToken)

        if (payload.twoFactorVerified) {
          return NextResponse.json({ error: "Token already verified" }, { status: 400 })
        }

        // Find user
        const userResult = await db
          .select({
            id: users.id,
            email: users.email,
            role: users.role,
            twoFactorSecret: users.twoFactorSecret,
          })
          .from(users)
          .where(eq(users.id, payload.userId))
          .limit(1)

        if (userResult.length === 0) {
          return NextResponse.json({ error: "User not found" }, { status: 404 })
        }

        const user = userResult[0]

        // Verify TOTP code
        if (!user.twoFactorSecret || !verifyTOTP(token, user.twoFactorSecret)) {
          return NextResponse.json({ error: "Invalid verification code" }, { status: 401 })
        }

        // Create new token with 2FA verified
        const newToken = createJwtToken({
          userId: user.id,
          email: user.email,
          role: user.role,
          twoFactorVerified: true,
        })

        // Set cookie
        const cookieStore = cookies()

        cookieStore.set("token", newToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "strict",
          maxAge: 60 * 60, // 1 hour
          path: "/",
        })

        // Return success response
        return NextResponse.json({
          message: "2FA verification successful",
          user: {
            id: user.id,
            email: user.email,
            role: user.role,
          },
        })
      } catch (error) {
        return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 })
      }
    } else {
      // This is a 2FA setup verification
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
            twoFactorSecret: users.twoFactorSecret,
            twoFactorEnabled: users.twoFactorEnabled,
          })
          .from(users)
          .where(eq(users.id, payload.userId))
          .limit(1)

        if (userResult.length === 0) {
          return NextResponse.json({ error: "User not found" }, { status: 404 })
        }

        const user = userResult[0]

        // Check if 2FA is already enabled
        if (user.twoFactorEnabled) {
          return NextResponse.json({ error: "Two-factor authentication is already enabled" }, { status: 400 })
        }

        // Verify TOTP code
        if (!user.twoFactorSecret || !verifyTOTP(token, user.twoFactorSecret)) {
          return NextResponse.json({ error: "Invalid verification code" }, { status: 401 })
        }

        // Enable 2FA
        await db.update(users).set({ twoFactorEnabled: true }).where(eq(users.id, user.id))

        // Send confirmation email
        await send2FASetupEmail(user.email)

        // Return success response
        return NextResponse.json({
          message: "Two-factor authentication enabled successfully",
        })
      } catch (error) {
        return NextResponse.json({ error: "Authentication failed" }, { status: 401 })
      }
    }
  } catch (error) {
    console.error("2FA verification error:", error)
    return NextResponse.json({ error: "Verification failed. Please try again later." }, { status: 500 })
  }
}
