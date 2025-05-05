/**
 * Investment plans API endpoints
 *
 * This file contains the API endpoints for retrieving investment plans.
 */

import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { investmentPlans } from "@/lib/db/schema"
import { planFilterSchema } from "@/lib/validation/plan-schemas"
import { eq, and, gte, lte } from "drizzle-orm"

/**
 * GET /api/plans
 *
 * Retrieves a list of all active investment plans.
 * Supports filtering by sector, duration, and interest rate.
 */
export async function GET(request: NextRequest) {
  try {
    // Parse query parameters for filtering
    const { searchParams } = new URL(request.url)
    const validatedParams = planFilterSchema.safeParse(Object.fromEntries(searchParams.entries()))

    if (!validatedParams.success) {
      return NextResponse.json(
        { status: "error", message: "Invalid query parameters", details: validatedParams.error.errors },
        { status: 400 },
      )
    }

    const { sector, minDuration, maxDuration, minInterest, maxInterest } = validatedParams.data

    // Build query conditions
    const conditions = [eq(investmentPlans.isActive, true)]

    if (sector) {
      conditions.push(eq(investmentPlans.sector, sector))
    }

    if (minDuration !== undefined) {
      conditions.push(gte(investmentPlans.durationDays, minDuration))
    }

    if (maxDuration !== undefined) {
      conditions.push(lte(investmentPlans.durationDays, maxDuration))
    }

    if (minInterest !== undefined) {
      conditions.push(gte(investmentPlans.dailyInterest, minInterest))
    }

    if (maxInterest !== undefined) {
      conditions.push(lte(investmentPlans.dailyInterest, maxInterest))
    }

    // Query the database
    const plans = await db
      .select({
        id: investmentPlans.id,
        name: investmentPlans.name,
        dailyInterest: investmentPlans.dailyInterest,
        minAmount: investmentPlans.minAmount,
        maxAmount: investmentPlans.maxAmount,
        durationDays: investmentPlans.durationDays,
        sector: investmentPlans.sector,
        projectId: investmentPlans.projectId,
        createdAt: investmentPlans.createdAt,
      })
      .from(investmentPlans)
      .where(and(...conditions))
      .orderBy(investmentPlans.id)

    return NextResponse.json({ status: "success", data: plans })
  } catch (error) {
    console.error("Error fetching investment plans:", error)
    return NextResponse.json({ status: "error", message: "Failed to retrieve investment plans" }, { status: 500 })
  }
}
