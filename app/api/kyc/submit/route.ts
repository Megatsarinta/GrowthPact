import { NextResponse } from "next/server"
import { db } from "@/lib/db/client"
import { kycRecords } from "@/lib/db/schema"
import { handleApiError } from "@/lib/api/error-handler"
import { logger } from "@/lib/logger"
import { z } from "zod"
import { createNotification, NotificationType } from "@/lib/notifications/server"
import { sendEmail } from "@/lib/services/email-service"

// File upload validation schema
const fileSchema = z.object({
  size: z.number().max(5 * 1024 * 1024, "File must be less than 5MB"),
  type: z
    .string()
    .refine(
      (type) => ["image/jpeg", "image/png", "image/jpg", "application/pdf"].includes(type),
      "File must be JPEG, PNG or PDF",
    ),
})

// In a real application, you would use a service like AWS S3, Cloudinary, or Vercel Blob Storage
// to store the uploaded files. For simplicity, we'll just simulate file storage.
async function uploadFile(file: File, userId: number, documentType: string): Promise<string> {
  // In a real implementation, you would upload the file to a storage service
  // and return the URL or file path

  // Log the file details for debugging
  logger.info(`Uploading file: ${file.name}, type: ${file.type}, size: ${file.size} bytes`, {
    userId,
    documentType,
  })

  // Simulate file upload delay
  await new Promise((resolve) => setTimeout(resolve, 500))

  // Return a simulated URL
  return `https://storage.example.com/kyc/${userId}/${documentType}/${file.name}`
}

export async function POST(request: Request) {
  try {
    // Get user ID from request headers (set by middleware)
    const userId = request.headers.get("x-user-id")
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Parse the multipart form data
    const formData = await request.formData()

    // Extract form fields
    const documentType = formData.get("documentType") as string
    const documentNumber = formData.get("documentNumber") as string
    const address = formData.get("address") as string
    const idFront = formData.get("idFront") as File
    const idBack = formData.get("idBack") as File
    const selfie = formData.get("selfie") as File
    const addressProof = formData.get("addressProof") as File

    // Validate required fields
    if (!documentType || !documentNumber || !address) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 })
    }

    // Validate files
    if (!idFront || !idBack || !selfie || !addressProof) {
      return NextResponse.json({ error: "All documents are required" }, { status: 400 })
    }

    // Validate file types and sizes
    try {
      fileSchema.parse(idFront)
      fileSchema.parse(idBack)
      fileSchema.parse(selfie)
      fileSchema.parse(addressProof)
    } catch (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Upload files to storage (simulated)
    const idFrontUrl = await uploadFile(idFront, Number(userId), "id-front")
    const idBackUrl = await uploadFile(idBack, Number(userId), "id-back")
    const selfieUrl = await uploadFile(selfie, Number(userId), "selfie")
    const addressProofUrl = await uploadFile(addressProof, Number(userId), "address-proof")

    // Store metadata in database
    const metadata = {
      documentType,
      documentNumber,
      address,
    }

    // Create a new KYC record in the database
    const [newKycRecord] = await db
      .insert(kycRecords)
      .values({
        userId: Number.parseInt(userId),
        status: "pending",
        idDocumentFront: idFrontUrl,
        idDocumentBack: idBackUrl,
        selfieDocument: selfieUrl,
        addressDocument: addressProofUrl,
        metadata: metadata,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning()

    // Create notification for the user
    await createNotification({
      userId: Number(userId),
      type: NotificationType.SYSTEM,
      title: "KYC Documents Submitted",
      message: "Your KYC documents have been submitted successfully and are pending review.",
    })

    // Send email notification to admin (in a real app)
    try {
      await sendEmail({
        to: "admin@example.com",
        subject: "New KYC Submission",
        text: `A new KYC submission has been received from user ID: ${userId}. Please review it in the admin dashboard.`,
        html: `<p>A new KYC submission has been received from user ID: ${userId}. Please review it in the admin dashboard.</p>`,
      })
    } catch (emailError) {
      // Log the error but don't fail the request
      logger.error("Failed to send admin notification email for KYC submission", emailError)
    }

    // Log the submission
    logger.info(`KYC documents submitted for user ${userId}`, {
      kycId: newKycRecord.id,
      documentType,
    })

    // Return the new KYC record
    return NextResponse.json({
      status: "success",
      message: "KYC documents submitted successfully",
      data: newKycRecord,
    })
  } catch (error) {
    logger.error("Error submitting KYC documents:", error)
    return handleApiError(error, "/api/kyc/submit")
  }
}
