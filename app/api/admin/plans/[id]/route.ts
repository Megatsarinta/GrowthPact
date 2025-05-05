/**
 * Admin investment plan management API endpoints
 *
 * This file contains the API endpoints for updating and deleting specific investment plans (admin only).
 */

import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { investmentPlans, investmentProjects } from "@/lib/db/schema"
import { updatePlanSchema, planIdSchema } from "@/lib/validation/plan-schemas"
import { eq } from "drizzle-orm"

/**
 * PUT /api/admin/plans/:id
 *
 * Updates an existing investment plan.
 */
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Check if user is admin (middleware should have already verified this)
    const userRole = request.headers.get("x-user-role")

    if (userRole !== "admin") {
      return NextResponse.json({ status: "error", message: "Unauthorized access" }, { status: 403 })
    }

    // Validate the plan ID
    const validatedParams = planIdSchema.safeParse({ id: params.id })

    if (!validatedParams.success) {
      return NextResponse.json(
        { status: "error", message: "Invalid plan ID", details: validatedParams.error.errors },
        { status: 400 },
      )
    }

    const planId = Number.parseInt(params.id, 10)

    // Parse and validate request body
    const body = await request.json()
    const validationResult = updatePlanSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { status: "error", message: "Validation failed", details: validationResult.error.errors },
        { status: 400 },
      )
    }

    const planData = validationResult.data

    // Check if the plan exists
    const existingPlan = await db
      .select({ id: investmentPlans.id })
      .from(investmentPlans)
      .where(eq(investmentPlans.id, planId))
      .limit(1)

    if (existingPlan.length === 0) {
      return NextResponse.json({ status: "error", message: "Investment plan not found" }, { status: 404 })
    }

    // If projectId is provided, verify that the project exists
    if (planData.projectId) {
      const projectExists = await db
        .select({ id: investmentProjects.id })
        .from(investmentProjects)
        .where(eq(investmentProjects.id, planData.projectId))
        .limit(1)

      if (projectExists.length === 0) {
        return NextResponse.json({ status: "error", message: "Project not found" }, { status: 404 })
      }
    }

    // Update the plan
    const [updatedPlan] = await db
      .update(investmentPlans)
      .set({
        ...planData,
        updatedAt: new Date(),
      })
      .where(eq(investmentPlans.id, planId))
      .returning()

    return NextResponse.json({
      status: "success",
      message: "Investment plan updated successfully",
      data: updatedPlan,
    })
  } catch (error) {
    console.error("Error updating investment plan:", error)
    return NextResponse.json({ status: "error", message: "Failed to update investment plan" }, { status: 500 })
  }
}

/**
 * DELETE /api/admin/plans/:id
 *
 * Deletes an investment plan (soft delete by setting isActive to false).
 */
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Check if user is admin (middleware should have already verified this)
    const userRole = request.headers.get("x-user-role")

    if (userRole !== "admin") {
      return NextResponse.json({ status: "error", message: "Unauthorized access" }, { status: 403 })
    }

    // Validate the plan ID
    const validatedParams = planIdSchema.safeParse({ id: params.id })

    if (!validatedParams.success) {
      return NextResponse.json(
        { status: "error", message: "Invalid plan ID", details: validatedParams.error.errors },
        { status: 400 },
      )
    }

    const planId = Number.parseInt(params.id, 10)

    // Check if the plan exists
    const existingPlan = await db
      .select({ id: investmentPlans.id })
      .from(investmentPlans)
      .where(eq(investmentPlans.id, planId))
      .limit(1)

    if (existingPlan.length === 0) {
      return NextResponse.json({ status: "error", message: "Investment plan not found" }, { status: 404 })
    }

    // Soft delete the plan by setting isActive to false
    await db
      .update(investmentPlans)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(investmentPlans.id, planId))

    return NextResponse.json({
      status: "success",
      message: "Investment plan deleted successfully",
    })
  } catch (error) {
    console.error("Error deleting investment plan:", error)
    return NextResponse.json({ status: "error", message: "Failed to delete investment plan" }, { status: 500 })
  }
}
