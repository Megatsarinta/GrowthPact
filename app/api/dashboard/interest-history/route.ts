import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db/client"
import { interestAccruals } from "@/lib/db/schema"
import { eq, sum } from "drizzle-orm"
import { logger } from "@/lib/logger"

export async function GET(request: NextRequest) {
  try {
    // Get user ID from request headers (set by middleware)
    const userId = request.headers.get("x-user-id")
    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    // Get query parameters for pagination
    const url = new URL(request.url)
    const limit = Number.parseInt(url.searchParams.get("limit") || "100")
    const offset = Number.parseInt(url.searchParams.get("offset") || "0")

    // Query interest accruals for the user with investment and plan details
    const userAccruals = await db.query.interestAccruals.findMany({
      where: eq(interestAccruals.userId, Number.parseInt(userId)),
      with: {
        investment: {
          with: {
            plan: true,
          },
        },
      },
      orderBy: (interestAccruals, { desc }) => [desc(interestAccruals.date)],
      limit,
      offset,
    })

    // Calculate total interest earned
    const [{ total }] = await db
      .select({ total: sum(interestAccruals.interestAmount) })
      .from(interestAccruals)
      .where(eq(interestAccruals.userId, Number.parseInt(userId)))

    return NextResponse.json({
      status: "success",
      data: {
        accruals: userAccruals,
        totalInterest: total || "0",
      },
    })
  } catch (error) {
    logger.error("Error fetching interest history:", error)
    return NextResponse.json({ error: "Failed to fetch interest history" }, { status: 500 })
  }
}
