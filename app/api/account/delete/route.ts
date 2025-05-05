import { NextResponse } from "next/server"
import { db } from "@/lib/db/client"
import { users, refreshTokens, kycRecords } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { handleApiError } from "@/lib/api/error-handler"
import { logger } from "@/lib/logger"
import { createAuditLog } from "@/lib/audit"
import { cookies } from "next/headers"

export async function POST(request: Request) {
  try {
    // Get user ID from request headers (set by middleware)
    const userId = Number(request.headers.get("x-user-id"))
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get request body
    const body = await request.json()
    const { password, reason } = body

    // Verify password (this should be implemented with proper password verification)
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Verify password
    const isPasswordValid = await verifyPassword(password, user.passwordHash)
    if (!isPasswordValid) {
      return NextResponse.json({ error: "Invalid password" }, { status: 400 })
    }

    // Start a transaction to delete user data
    await db.transaction(async (tx) => {
      // Anonymize KYC records (GDPR compliance)
      await tx
        .update(kycRecords)
        .set({
          idDocumentFront: null,
          idDocumentBack: null,
          selfieDocument: null,
          addressDocument: null,
          providerReference: null,
          updatedAt: new Date(),
        })
        .where(eq(kycRecords.userId, userId))

      // Delete refresh tokens
      await tx.delete(refreshTokens).where(eq(refreshTokens.userId, userId))

      // Anonymize user data (GDPR compliance)
      await tx
        .update(users)
        .set({
          email: `deleted_${userId}_${Date.now()}@example.com`,
          passwordHash: "DELETED",
          fullName: "Deleted User",
          phone: null,
          twoFactorSecret: null,
          twoFactorEnabled: false,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId))

      // Create audit log for account deletion
      await createAuditLog({
        userId,
        action: "account_deleted",
        metadata: { reason },
        ipAddress: request.headers.get("x-forwarded-for") || null,
        userAgent: request.headers.get("user-agent") || null,
      })
    })

    // Clear cookies
    const cookieStore = cookies()
    cookieStore.delete("token")
    cookieStore.delete("refreshToken")

    return NextResponse.json({
      status: "success",
      message: "Account successfully deleted",
    })
  } catch (error) {
    logger.error("Error deleting account:", error)
    return handleApiError(error, "/api/account/delete")
  }
}

// Helper function to verify password
async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  // This should be implemented with proper password verification
  // For now, we'll just return true for testing
  return true
}
