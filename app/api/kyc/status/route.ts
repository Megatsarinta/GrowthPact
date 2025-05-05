import { NextResponse } from "next/server"
import { db } from "@/lib/db/client"
import { kycRecords } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { handleApiError } from "@/lib/api/error-handler"
import { logger } from "@/lib/logger"

export async function GET(request: Request) {
  try {
    // Get user ID from request headers (set by middleware)
    const userId = request.headers.get("x-user-id")
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Query the database for the user's KYC record
    const userKycRecords = await db
      .select()
      .from(kycRecords)
      .where(eq(kycRecords.userId, Number.parseInt(userId)))
      .orderBy(kycRecords.createdAt, "desc")
      .limit(1)

    // Return the KYC record if found, or null if not
    return NextResponse.json({
      status: "success",
      data: userKycRecords.length > 0 ? userKycRecords[0] : null,
    })
  } catch (error) {
    logger.error("Error fetching KYC status:", error)
    return handleApiError(error, "/api/kyc/status")
  }
}
