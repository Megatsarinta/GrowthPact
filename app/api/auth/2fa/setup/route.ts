/**
 * Two-factor authentication setup API endpoint
 *
 * This endpoint generates a new TOTP secret and QR code for the user
 * to scan with their authenticator app.
 */

import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { users } from "@/lib/db/schema"
import { generateTOTPSecret } from "@/lib/auth/two-factor"
import { eq } from "drizzle-orm"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth-options"

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user from session
    const session = await getServerSession(authOptions)

    if (!session || !session.user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const userId = session.user.id

    // Find user
    const userResult = await db
      .select({ id: users.id, email: users.email, twoFactorEnabled: users.twoFactorEnabled })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)

    if (userResult.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const user = userResult[0]

    // Check if 2FA is already enabled
    if (user.twoFactorEnabled) {
      return NextResponse.json({ error: "Two-factor authentication is already enabled" }, { status: 400 })
    }

    // Generate TOTP secret and QR code
    const { secret, qrCodeDataURL } = await generateTOTPSecret(user.email)

    // Store secret temporarily (will be confirmed after verification)
    await db.update(users).set({ twoFactorSecret: secret }).where(eq(users.id, userId))

    // Return QR code for the user to scan
    return NextResponse.json({
      message: "Two-factor authentication setup initiated",
      qrCodeDataURL,
    })
  } catch (error) {
    console.error("2FA setup error:", error)
    return NextResponse.json(
      { error: "Failed to set up two-factor authentication. Please try again later." },
      { status: 500 },
    )
  }
}
