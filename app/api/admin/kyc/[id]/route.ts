import { NextResponse } from "next/server"
import { db } from "@/lib/db/client"
import { kycRecords, users } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { handleApiError } from "@/lib/api/error-handler"
import { logger } from "@/lib/logger"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    // Get user role from request headers (set by middleware)
    const userRole = request.headers.get("x-user-role")
    if (userRole !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const kycId = Number.parseInt(params.id)
    if (isNaN(kycId)) {
      return NextResponse.json({ error: "Invalid KYC record ID" }, { status: 400 })
    }

    // Query the database for the KYC record with user details
    const record = await db
      .select({
        ...kycRecords,
        user: {
          email: users.email,
          fullName: users.fullName,
        },
      })
      .from(kycRecords)
      .leftJoin(users, eq(kycRecords.userId, users.id))
      .where(eq(kycRecords.id, kycId))
      .limit(1)

    if (record.length === 0) {
      return NextResponse.json({ error: "KYC record not found" }, { status: 404 })
    }

    // Log the access
    logger.info(`Admin accessed KYC record ${kycId}`, {
      kycId,
      adminId: request.headers.get("x-user-id"),
    })

    return NextResponse.json({
      status: "success",
      data: record[0],
    })
  } catch (error) {
    logger.error(`Error fetching KYC record ${params.id}:`, error)
    return handleApiError(error, `/api/admin/kyc/${params.id}`)
  }
}
