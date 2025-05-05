/**
 * User login API endpoint
 *
 * This endpoint handles user authentication, issuing JWT tokens,
 * and handling 2FA if enabled.
 */

import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { users, refreshTokens } from "@/lib/db/schema"
import { verifyPassword } from "@/lib/auth/password"
import { createJwtToken, createRefreshToken } from "@/lib/auth/jwt"
import { loginSchema } from "@/lib/validation/auth-schemas"
import { eq } from "drizzle-orm"
import { cookies } from "next/headers"

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json()
    const validationResult = loginSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json({ error: "Validation failed", details: validationResult.error.errors }, { status: 400 })
    }

    const { email, password } = validationResult.data

    // Find user
    const userResult = await db
      .select({
        id: users.id,
        email: users.email,
        passwordHash: users.passwordHash,
        isVerified: users.isVerified,
        role: users.role,
        twoFactorEnabled: users.twoFactorEnabled,
        twoFactorSecret: users.twoFactorSecret,
      })
      .from(users)
      .where(eq(users.email, email))
      .limit(1)

    if (userResult.length === 0) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 })
    }

    const user = userResult[0]

    // Verify password
    const passwordValid = await verifyPassword(password, user.passwordHash)

    if (!passwordValid) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 })
    }

    // Check if email is verified
    if (!user.isVerified) {
      return NextResponse.json({ error: "Please verify your email before logging in" }, { status: 403 })
    }

    // Check if 2FA is enabled
    if (user.twoFactorEnabled) {
      // Create a temporary token for 2FA verification
      const tempToken = createJwtToken(
        {
          userId: user.id,
          email: user.email,
          role: user.role,
          twoFactorVerified: false,
        },
        "5m", // Short expiration for 2FA verification
      )

      return NextResponse.json({
        message: "2FA verification required",
        requiresTwoFactor: true,
        tempToken,
      })
    }

    // Create tokens
    const token = createJwtToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    })

    const refreshToken = createRefreshToken(user.id)

    // Store refresh token in database
    await db.insert(refreshTokens).values({
      userId: user.id,
      token: refreshToken,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    })

    // Set cookies
    const cookieStore = cookies()

    cookieStore.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60, // 1 hour
      path: "/",
    })

    cookieStore.set("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: "/",
    })

    // Return success response
    return NextResponse.json({
      message: "Login successful",
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    })
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json({ error: "Login failed. Please try again later." }, { status: 500 })
  }
}
