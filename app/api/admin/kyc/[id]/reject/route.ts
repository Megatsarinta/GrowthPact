import { NextResponse } from "next/server"
import { db } from "@/lib/db/client"
import { kycRecords, users, auditLogs } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { handleApiError } from "@/lib/api/error-handler"
import { logger } from "@/lib/logger"
import { createNotification, NotificationType } from "@/lib/notifications/server"
import { sendEmail } from "@/lib/services/email-service"
import { z } from "zod"

// Validation schema for rejection
const rejectSchema = z.object({
  reason: z.string().min(5, "Rejection reason must be at least 5 characters long"),
})

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

    // Parse and validate the request body
    const body = await request.json()

    try {
      rejectSchema.parse(body)
    } catch (validationError) {
      return NextResponse.json(
        {
          error: "Validation error",
          details: validationError.errors,
        },
        { status: 400 },
      )
    }

    const { reason } = body

    // Get the KYC record
    const [kycRecord] = await db.select().from(kycRecords).where(eq(kycRecords.id, kycId))

    if (!kycRecord) {
      return NextResponse.json({ error: "KYC record not found" }, { status: 404 })
    }

    // Update the KYC record status to rejected
    const [updatedRecord] = await db
      .update(kycRecords)
      .set({
        status: "rejected",
        rejectionReason: reason,
        updatedAt: new Date(),
      })
      .where(eq(kycRecords.id, kycId))
      .returning()

    // Create an audit log entry
    await db.insert(auditLogs).values({
      userId: Number(adminId),
      action: "kyc_rejected",
      metadata: JSON.stringify({
        kycId,
        targetUserId: kycRecord.userId,
        reason,
      }),
      timestamp: new Date(),
    })

    // Create notification for the user
    await createNotification({
      userId: kycRecord.userId,
      type: NotificationType.KYC_REJECTED,
      title: "KYC Verification Rejected",
      message: `Your KYC verification has been rejected. Reason: ${reason}. Please resubmit your documents.`,
      data: { reason },
    })

    // Send email notification to the user
    try {
      // Get user email
      const [user] = await db.select({ email: users.email }).from(users).where(eq(users.id, kycRecord.userId))

      if (user) {
        await sendEmail({
          to: user.email,
          subject: "Your KYC Verification Has Been Rejected",
          text: `Your KYC verification has been rejected. Reason: ${reason}. Please resubmit your documents with the necessary corrections.`,
          html: `
            <h1>KYC Verification Rejected</h1>
            <p>We regret to inform you that your KYC verification has been rejected.</p>
            <p><strong>Reason:</strong> ${reason}</p>
            <p>Please resubmit your documents with the necessary corrections. Here are some tips:</p>
            <ul>
              <li>Ensure all documents are clear and legible</li>
              <li>Make sure the information matches your account details</li>
              <li>Provide up-to-date documents</li>
            </ul>
            <p>If you have any questions, please contact our support team.</p>
          `,
        })
      }
    } catch (emailError) {
      // Log the error but don't fail the request
      logger.error("Failed to send KYC rejection email", emailError)
    }

    logger.info(`KYC record ${kycId} rejected by admin`, {
      kycId,
      userId: kycRecord.userId,
      adminId,
      reason,
    })

    return NextResponse.json({
      status: "success",
      message: "KYC record rejected successfully",
      data: updatedRecord,
    })
  } catch (error) {
    logger.error(`Error rejecting KYC record ${params.id}:`, error)
    return handleApiError(error, `/api/admin/kyc/${params.id}/reject`)
  }
}
