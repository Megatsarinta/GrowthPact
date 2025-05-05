import { NextResponse } from "next/server"
import { db } from "@/lib/db/client"
import { kycRecords, users, auditLogs } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { handleApiError } from "@/lib/api/error-handler"
import { logger } from "@/lib/logger"
import { createNotification, NotificationType } from "@/lib/notifications/server"
import { sendEmail } from "@/lib/services/email-service"

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    // Get user role and ID from request headers (set by middleware)
    const userRole = request.headers.get("x-user-role")
    const adminId = request.headers.get("x-user-id")

    if (userRole !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const kycId = Number.parseInt(params.id)
    if (isNaN(kycId)) {
      return NextResponse.json({ error: "Invalid KYC record ID" }, { status: 400 })
    }

    // Get the KYC record
    const [kycRecord] = await db.select().from(kycRecords).where(eq(kycRecords.id, kycId))

    if (!kycRecord) {
      return NextResponse.json({ error: "KYC record not found" }, { status: 404 })
    }

    // Update the KYC record status to approved
    const [updatedRecord] = await db
      .update(kycRecords)
      .set({
        status: "approved",
        updatedAt: new Date(),
      })
      .where(eq(kycRecords.id, kycId))
      .returning()

    // Update the user's verification status
    await db
      .update(users)
      .set({
        isVerified: true,
        updatedAt: new Date(),
      })
      .where(eq(users.id, kycRecord.userId))

    // Create an audit log entry
    await db.insert(auditLogs).values({
      userId: Number(adminId),
      action: "kyc_approved",
      metadata: JSON.stringify({
        kycId,
        targetUserId: kycRecord.userId,
      }),
      timestamp: new Date(),
    })

    // Create notification for the user
    await createNotification({
      userId: kycRecord.userId,
      type: NotificationType.KYC_VERIFIED,
      title: "KYC Verification Approved",
      message: "Your KYC verification has been approved. You now have full access to all platform features.",
    })

    // Send email notification to the user
    try {
      // Get user email
      const [user] = await db.select({ email: users.email }).from(users).where(eq(users.id, kycRecord.userId))

      if (user) {
        await sendEmail({
          to: user.email,
          subject: "Your KYC Verification Has Been Approved",
          text: `Congratulations! Your KYC verification has been approved. You now have full access to all platform features.`,
          html: `
            <h1>KYC Verification Approved</h1>
            <p>Congratulations! Your KYC verification has been approved.</p>
            <p>You now have full access to all platform features, including:</p>
            <ul>
              <li>Investing in all available plans</li>
              <li>Making withdrawals</li>
              <li>Accessing premium features</li>
            </ul>
            <p>Thank you for choosing our platform!</p>
          `,
        })
      }
    } catch (emailError) {
      // Log the error but don't fail the request
      logger.error("Failed to send KYC approval email", emailError)
    }

    logger.info(`KYC record ${kycId} approved by admin`, {
      kycId,
      userId: kycRecord.userId,
      adminId,
    })

    return NextResponse.json({
      status: "success",
      message: "KYC record approved successfully",
      data: updatedRecord,
    })
  } catch (error) {
    logger.error(`Error approving KYC record ${params.id}:`, error)
    return handleApiError(error, `/api/admin/kyc/${params.id}/approve`)
  }
}
