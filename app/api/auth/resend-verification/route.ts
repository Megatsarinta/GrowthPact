/**
 * Resend verification email API endpoint
 *
 * This endpoint resends the verification email to the user.
 */

import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { users } from "@/lib/db/schema"
import { createEmailVerificationToken } from "@/lib/auth/jwt"
import { sendVerificationEmail } from "@/lib/services/email-service"
import { eq } from "drizzle-orm"
import { z } from "zod"

// Validation schema
const resendSchema = z.object({
  email: z.string().email("Invalid email address"),
})

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json()
    const validationResult = resendSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json({ error: "Validation failed", details: validationResult.error.errors }, { status: 400 })
    }

    const { email } = validationResult.data

    // Find user
    const userResult = await db
      .select({ id: users.id, isVerified: users.isVerified })
      .from(users)
      .where(eq(users.email, email))
      .limit(1)

    if (userResult.length === 0) {
      // For security reasons, don't reveal that the email doesn't exist
      return NextResponse.json(
        { message: "If your email is registered, a verification link has been sent." },
        { status: 200 },
      )
    }

    const user = userResult[0]

    // Check if already verified
    if (user.isVerified) {
      return NextResponse.json({ message: "Your email is already verified. You can log in now." }, { status: 200 })
    }

    // Create email verification token
    const verificationToken = createEmailVerificationToken(user.id, email)

    // Send verification email
    await sendVerificationEmail(email, verificationToken)

    // Return success response
    return NextResponse.json(
      { message: "Verification email has been resent. Please check your inbox." },
      { status: 200 },
    )
  } catch (error) {
    console.error("Resend verification error:", error)
    return NextResponse.json({ error: "Failed to resend verification email. Please try again later." }, { status: 500 })
  }
}
