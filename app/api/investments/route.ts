import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db/client"
import { userInvestments, investmentPlans, users } from "@/lib/db/schema"
import { eq, and, sql } from "drizzle-orm"

// Validation schema for investment creation
const investmentSchema = z.object({
  planId: z.number().positive("Plan ID must be a positive number"),
  amount: z.number().positive("Amount must be a positive number"),
})

export async function POST(request: NextRequest) {
  try {
    // Get user ID from request headers (set by middleware)
    const userId = request.headers.get("x-user-id")
    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    // Parse and validate request body
    const body = await request.json()
    const result = investmentSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 })
    }

    const { planId, amount } = result.data
    const userIdNum = Number.parseInt(userId)

    // Get user's current balance
    const [user] = await db.select({ balanceInr: users.balanceInr }).from(users).where(eq(users.id, userIdNum))

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Check if user has sufficient balance
    if (Number.parseFloat(user.balanceInr) < amount) {
      return NextResponse.json({ error: "Insufficient balance" }, { status: 400 })
    }

    // Get the investment plan
    const [plan] = await db
      .select()
      .from(investmentPlans)
      .where(and(eq(investmentPlans.id, planId), eq(investmentPlans.isActive, true)))

    if (!plan) {
      return NextResponse.json({ error: "Investment plan not found or inactive" }, { status: 404 })
    }

    // Check if amount is within plan limits
    const minAmount = Number.parseFloat(plan.minAmount)
    const maxAmount = Number.parseFloat(plan.maxAmount)

    if (amount < minAmount || amount > maxAmount) {
      return NextResponse.json(
        {
          error: `Investment amount must be between ₹${minAmount} and ₹${maxAmount}`,
        },
        { status: 400 },
      )
    }

    // Calculate end date
    const startDate = new Date()
    const endDate = new Date(startDate)
    endDate.setDate(endDate.getDate() + plan.durationDays)

    // Begin transaction to create investment and update balance
    await db.transaction(async (tx) => {
      // Deduct amount from user's balance
      await tx
        .update(users)
        .set({
          balanceInr: sql`${users.balanceInr} - ${amount}`,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userIdNum))

      // Create investment record
      await tx.insert(userInvestments).values({
        userId: userIdNum,
        planId,
        amount: amount.toString(),
        startDate,
        endDate,
        isActive: true,
      })
    })

    // Fetch the created investment
    const [investment] = await db
      .select()
      .from(userInvestments)
      .where(and(eq(userInvestments.userId, userIdNum), eq(userInvestments.planId, planId)))
      .orderBy(sql`${userInvestments.createdAt} DESC`)
      .limit(1)

    return NextResponse.json({
      status: "success",
      data: {
        investmentId: investment.id,
        planId,
        amount,
        startDate: investment.startDate,
        endDate: investment.endDate,
        message: "Investment created successfully",
      },
    })
  } catch (error) {
    console.error("Investment creation error:", error)
    return NextResponse.json({ error: "Failed to create investment" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get user ID from request headers (set by middleware)
    const userId = request.headers.get("x-user-id")
    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    // Get query parameters for pagination
    const url = new URL(request.url)
    const limit = Number.parseInt(url.searchParams.get("limit") || "10")
    const offset = Number.parseInt(url.searchParams.get("offset") || "0")
    const status = url.searchParams.get("status") || undefined

    // Query investments for the user
    const userInvestmentsList = await db.query.userInvestments.findMany({
      where: (investments, { eq, and }) => {
        const conditions = [eq(investments.userId, Number.parseInt(userId))]
        if (status === "active") {
          conditions.push(eq(investments.isActive, true))
        } else if (status === "completed") {
          conditions.push(eq(investments.isActive, false))
        }
        return and(...conditions)
      },
      with: {
        plan: true,
      },
      orderBy: (investments, { desc }) => [desc(investments.createdAt)],
      limit,
      offset,
    })

    // Count total investments for pagination
    const [{ count }] = await db
      .select({ count: db.fn.count() })
      .from(userInvestments)
      .where(eq(userInvestments.userId, Number.parseInt(userId)))

    return NextResponse.json({
      status: "success",
      data: userInvestmentsList,
      pagination: {
        total: Number(count),
        limit,
        offset,
      },
    })
  } catch (error) {
    console.error("Error fetching investments:", error)
    return NextResponse.json({ error: "Failed to fetch investments" }, { status: 500 })
  }
}
