import { NextResponse } from "next/server"
import { db } from "@/lib/db/client"
import { kycRecords, users } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { handleApiError } from "@/lib/api/error-handler"
import { logger } from "@/lib/logger"

export async function GET(request: Request) {
  try {
    // Get user role from request headers (set by middleware)
    const userRole = request.headers.get("x-user-role")
    if (userRole !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Get query parameters
    const url = new URL(request.url)
    const status = url.searchParams.get("status") || "pending"

    // Query the database for KYC records with the specified status
    const records = await db
      .select({
        ...kycRecords,
        user: {
          email: users.email,
          fullName: users.fullName,
        },
      })
      .from(kycRecords)
      .leftJoin(users, eq(kycRecords.userId, users.id))
      .where(eq(kycRecords.status, status as any))
      .orderBy(kycRecords.createdAt, "desc")

    return NextResponse.json({
      status: "success",
      data: records,
    })
  } catch (error) {
    logger.error("Error fetching KYC records:", error)
    return handleApiError(error, "/api/admin/kyc")
  }
}
