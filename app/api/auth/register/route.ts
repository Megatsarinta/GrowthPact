/**
 * User registration API endpoint
 *
 * This endpoint handles user registration with email, password, and name.
 * It validates the input, creates a new user, and sends a verification email.
 */

import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { users } from "@/lib/db/schema"
import { hashPassword } from "@/lib/auth/password"
import { createEmailVerificationToken } from "@/lib/auth/jwt"
import { sendVerificationEmail } from "@/lib/services/email-service"
import { registerSchema } from "@/lib/validation/auth-schemas"
import { eq } from "drizzle-orm"
import { nanoid } from "nanoid"

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json()
    const validationResult = registerSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json({ error: "Validation failed", details: validationResult.error.errors }, { status: 400 })
    }

    const { email, password, fullName, phone } = validationResult.data

    // Check if user already exists
    const existingUser = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1)

    if (existingUser.length > 0) {
      return NextResponse.json({ error: "User with this email already exists" }, { status: 409 })
    }

    // Hash password
    const passwordHash = await hashPassword(password)

    // Generate a unique referral code
    const referralCode = nanoid(8)

    // Create user
    const [newUser] = await db
      .insert(users)
      .values({
        email,
        passwordHash,
        fullName,
        phone,
        referralCode,
        isVerified: false,
        role: "user",
      })
      .returning({ id: users.id, email: users.email })

    // Create email verification token
    const verificationToken = createEmailVerificationToken(newUser.id, newUser.email)

    // Send verification email
    await sendVerificationEmail(email, verificationToken)

    // Return success response
    return NextResponse.json(
      {
        message: "Registration successful. Please check your email to verify your account.",
        userId: newUser.id,
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("Registration error:", error)
    return NextResponse.json({ error: "Registration failed. Please try again later." }, { status: 500 })
  }
}
