import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db/client"
import { withdrawals, users, kycRecords } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"
import { sql } from "drizzle-orm"
import { logger } from "@/lib/logger"
import { createAuditLog } from "@/lib/audit"

// Validation schema for withdrawal request
const withdrawalSchema = z.object({
  amount: z.number().positive("Amount must be positive"),
  currency: z.enum(["INR", "USDT"], {
    errorMap: () => ({ message: "Supported currencies: INR, USDT" }),
  }),
  walletAddress: z.string().optional(),
})

// Minimum withdrawal amounts per currency
const MIN_WITHDRAWAL_AMOUNTS = {
  INR: 1000,
  USDT: 10,
}

// Fee calculation
const calculateFee = (amount: number, currency: "INR" | "USDT"): number => {
  if (currency === "INR") {
    // 0.5% fee with minimum ₹50
    return Math.max(amount * 0.005, 50)
  } else {
    // Fixed fee for USDT
    return 2
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get user ID from request headers (set by middleware)
    const userId = request.headers.get("x-user-id")
    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    // Parse and validate request body
    const body = await request.json()
    const result = withdrawalSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 })
    }

    const { amount, currency, walletAddress } = result.data

    // Check minimum withdrawal amount
    if (amount < MIN_WITHDRAWAL_AMOUNTS[currency]) {
      return NextResponse.json(
        { error: `Minimum withdrawal amount for ${currency} is ${MIN_WITHDRAWAL_AMOUNTS[currency]}` },
        { status: 400 },
      )
    }

    // Check if wallet address is provided for crypto withdrawals
    if (currency === "USDT" && !walletAddress) {
      return NextResponse.json({ error: "Wallet address is required for crypto withdrawals" }, { status: 400 })
    }

    // Check if user has completed KYC
    const kycRecord = await db.query.kycRecords.findFirst({
      where: and(eq(kycRecords.userId, Number.parseInt(userId)), eq(kycRecords.status, "approved")),
    })

    if (!kycRecord) {
      return NextResponse.json(
        { error: "KYC verification is required for withdrawals. Please complete your KYC first." },
        { status: 403 },
      )
    }

    // Calculate fee
    const fee = calculateFee(amount, currency)
    const totalAmount = amount + fee

    // Get user's balance
    const [user] = await db
      .select({ balanceInr: users.balanceInr })
      .from(users)
      .where(eq(users.id, Number.parseInt(userId)))

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Check if user has sufficient balance
    if (Number.parseFloat(user.balanceInr) < totalAmount) {
      return NextResponse.json(
        {
          error: `Insufficient balance. Your balance: ₹${user.balanceInr}, Required (including fee): ₹${totalAmount.toFixed(2)}`,
        },
        { status: 400 },
      )
    }

    // Begin transaction to create withdrawal and deduct balance
    const [withdrawal] = await db.transaction(async (tx) => {
      // Deduct amount from user's balance
      await tx
        .update(users)
        .set({
          balanceInr: sql`${users.balanceInr} - ${totalAmount}`,
          updatedAt: new Date(),
        })
        .where(eq(users.id, Number.parseInt(userId)))

      // Create withdrawal record
      return tx
        .insert(withdrawals)
        .values({
          userId: Number.parseInt(userId),
          currency,
          amountInr: amount.toString(),
          fee: fee.toString(),
          status: "pending",
          walletAddress: currency === "USDT" ? walletAddress : null,
        })
        .returning()
    })

    // Create audit log
    await createAuditLog({
      userId: Number.parseInt(userId),
      action: "withdrawal_requested",
      metadata: {
        withdrawalId: withdrawal.id,
        amount: amount.toString(),
        fee: fee.toString(),
        currency,
        walletAddress: currency === "USDT" ? walletAddress : null,
      },
      ipAddress: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown",
      userAgent: request.headers.get("user-agent") || "unknown",
    })

    logger.info(`Withdrawal requested: ID ${withdrawal.id}, User ${userId}, Amount ${amount} ${currency}`)

    return NextResponse.json({
      status: "success",
      data: {
        withdrawalId: withdrawal.id,
        amount,
        fee,
        totalAmount,
        currency,
        status: "pending",
      },
    })
  } catch (error) {
    logger.error("Withdrawal request error:", error)
    return NextResponse.json({ error: "Failed to create withdrawal request" }, { status: 500 })
  }
}

// GET endpoint to retrieve user's withdrawals
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

    // Query withdrawals for the user
    const userWithdrawals = await db.query.withdrawals.findMany({
      where: (withdrawals, { eq, and, inArray }) => {
        const conditions = [eq(withdrawals.userId, Number.parseInt(userId))]
        if (status && status !== "all") {
          conditions.push(
            inArray(withdrawals.status, status.split(",") as ["pending" | "processing" | "completed" | "failed"]),
          )
        }
        return and(...conditions)
      },
      orderBy: (withdrawals, { desc }) => [desc(withdrawals.createdAt)],
      limit,
      offset,
    })

    // Count total withdrawals for pagination
    const [{ count }] = await db
      .select({ count: db.fn.count() })
      .from(withdrawals)
      .where(eq(withdrawals.userId, Number.parseInt(userId)))

    return NextResponse.json({
      status: "success",
      data: userWithdrawals,
      pagination: {
        total: Number(count),
        limit,
        offset,
      },
    })
  } catch (error) {
    logger.error("Error fetching withdrawals:", error)
    return NextResponse.json({ error: "Failed to fetch withdrawals" }, { status: 500 })
  }
}
