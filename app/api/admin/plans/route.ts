/**
 * Admin investment plans API endpoints
 *
 * This file contains the API endpoints for managing investment plans (admin only).
 */

import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { investmentPlans, investmentProjects } from "@/lib/db/schema"
import { createPlanSchema } from "@/lib/validation/plan-schemas"
import { eq } from "drizzle-orm"

/**
 * GET /api/admin/plans
 *
 * Retrieves all investment plans (including inactive ones) for admin management.
 */
export async function GET(request: NextRequest) {
  try {
    // Check if user is admin (middleware should have already verified this)
    const userRole = request.headers.get("x-user-role")

    if (userRole !== "admin") {
      return NextResponse.json({ status: "error", message: "Unauthorized access" }, { status: 403 })
    }

    // Query the database for all plans
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
        isActive: investmentPlans.isActive,
        createdAt: investmentPlans.createdAt,
        updatedAt: investmentPlans.updatedAt,
      })
      .from(investmentPlans)
      .orderBy(investmentPlans.id)

    return NextResponse.json({ status: "success", data: plans })
  } catch (error) {
    console.error("Error fetching investment plans for admin:", error)
    return NextResponse.json({ status: "error", message: "Failed to retrieve investment plans" }, { status: 500 })
  }
}

/**
 * POST /api/admin/plans
 *
 * Creates a new investment plan.
 */
export async function POST(request: NextRequest) {
  try {
    // Check if user is admin (middleware should have already verified this)
    const userRole = request.headers.get("x-user-role")

    if (userRole !== "admin") {
      return NextResponse.json({ status: "error", message: "Unauthorized access" }, { status: 403 })
    }

    // Parse and validate request body
    const body = await request.json()
    const validationResult = createPlanSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { status: "error", message: "Validation failed", details: validationResult.error.errors },
        { status: 400 },
      )
    }

    const planData = validationResult.data

    // Verify that the project exists
    const projectExists = await db
      .select({ id: investmentProjects.id })
      .from(investmentProjects)
      .where(eq(investmentProjects.id, planData.projectId))
      .limit(1)

    if (projectExists.length === 0) {
      return NextResponse.json({ status: "error", message: "Project not found" }, { status: 404 })
    }

    // Create the new plan
    const [newPlan] = await db
      .insert(investmentPlans)
      .values({
        name: planData.name,
        dailyInterest: planData.dailyInterest,
        minAmount: planData.minAmount,
        maxAmount: planData.maxAmount,
        durationDays: planData.durationDays,
        sector: planData.sector,
        projectId: planData.projectId,
        isActive: true,
      })
      .returning()

    return NextResponse.json(
      { status: "success", message: "Investment plan created successfully", data: newPlan },
      { status: 201 },
    )
  } catch (error) {
    console.error("Error creating investment plan:", error)
    return NextResponse.json({ status: "error", message: "Failed to create investment plan" }, { status: 500 })
  }
}
