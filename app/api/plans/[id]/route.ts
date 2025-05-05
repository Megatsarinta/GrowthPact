/**
 * Investment plan detail API endpoint
 *
 * This file contains the API endpoint for retrieving a specific investment plan.
 */

import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { investmentPlans, investmentProjects } from "@/lib/db/schema"
import { planIdSchema } from "@/lib/validation/plan-schemas"
import { eq } from "drizzle-orm"

/**
 * GET /api/plans/:id
 *
 * Retrieves details of a specific investment plan by ID.
 */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Validate the plan ID
    const validatedParams = planIdSchema.safeParse({ id: params.id })

    if (!validatedParams.success) {
      return NextResponse.json(
        { status: "error", message: "Invalid plan ID", details: validatedParams.error.errors },
        { status: 400 },
      )
    }

    const planId = Number.parseInt(params.id, 10)

    // Query the database for the plan and its associated project
    const result = await db
      .select({
        plan: {
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
        },
        project: {
          id: investmentProjects.id,
          name: investmentProjects.name,
          description: investmentProjects.description,
          imageUrl: investmentProjects.imageUrl,
          sector: investmentProjects.sector,
        },
      })
      .from(investmentPlans)
      .leftJoin(investmentProjects, eq(investmentPlans.projectId, investmentProjects.id))
      .where(eq(investmentPlans.id, planId))
      .limit(1)

    if (result.length === 0) {
      return NextResponse.json({ status: "error", message: "Investment plan not found" }, { status: 404 })
    }

    // Calculate total return based on daily interest and duration
    const plan = result[0].plan
    const totalReturn = Number.parseFloat(plan.dailyInterest.toString()) * plan.durationDays

    // Return the plan with its associated project and calculated metrics
    return NextResponse.json({
      status: "success",
      data: {
        ...plan,
        project: result[0].project,
        metrics: {
          totalReturn: totalReturn.toFixed(2),
          annualizedReturn: ((totalReturn / plan.durationDays) * 365).toFixed(2),
        },
      },
    })
  } catch (error) {
    console.error("Error fetching investment plan:", error)
    return NextResponse.json({ status: "error", message: "Failed to retrieve investment plan" }, { status: 500 })
  }
}
