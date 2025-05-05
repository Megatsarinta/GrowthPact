import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db/client"
import { deposits } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { Client, resources } from "coinbase-commerce-node"
import { COINBASE_COMMERCE_API_KEY, FRONTEND_URL } from "@/app/api/env-config"
import { logger } from "@/lib/logger"
import { createAuditLog } from "@/lib/audit"

// Initialize Coinbase Commerce client
Client.init(COINBASE_COMMERCE_API_KEY)
const { Charge } = resources

// Validation schema for deposit request
const depositSchema = z.object({
  amount: z.number().positive("Amount must be positive"),
  currency: z.enum(["BTC", "ETH", "USDT"], {
    errorMap: () => ({ message: "Supported currencies: BTC, ETH, USDT" }),
  }),
})

// Minimum deposit amounts per currency
const MIN_DEPOSIT_AMOUNTS = {
  BTC: 0.001,
  ETH: 0.01,
  USDT: 10,
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
    const result = depositSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 })
    }

    const { amount, currency } = result.data

    // Check minimum deposit amount
    if (amount < MIN_DEPOSIT_AMOUNTS[currency]) {
      return NextResponse.json(
        { error: `Minimum deposit amount for ${currency} is ${MIN_DEPOSIT_AMOUNTS[currency]}` },
        { status: 400 },
      )
    }

    // Create a Coinbase Commerce charge
    const chargeData = {
      name: "InvestSafe Deposit",
      description: `Deposit ${amount} ${currency} to your InvestSafe account`,
      pricing_type: "no_price",
      local_price: {
        amount: amount.toString(),
        currency,
      },
      metadata: {
        userId: Number.parseInt(userId),
        currency,
      },
      redirect_url: `${FRONTEND_URL}/dashboard/deposits?status=success`,
      cancel_url: `${FRONTEND_URL}/dashboard/deposits?status=cancelled`,
    }

    const charge = await Charge.create(chargeData)

    // Store deposit record in database
    const [deposit] = await db
      .insert(deposits)
      .values({
        userId: Number.parseInt(userId),
        currency: currency,
        amountCrypto: amount.toString(),
        status: "pending",
        txReference: charge.id,
        paymentUrl: charge.hosted_url,
      })
      .returning()

    // Create audit log
    await createAuditLog({
      userId: Number.parseInt(userId),
      action: "deposit_created",
      metadata: {
        depositId: deposit.id,
        amount: amount.toString(),
        currency,
        chargeId: charge.id,
      },
      ipAddress: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown",
      userAgent: request.headers.get("user-agent") || "unknown",
    })

    logger.info(`Deposit created: ID ${deposit.id}, User ${userId}, Amount ${amount} ${currency}`)

    return NextResponse.json({
      status: "success",
      data: {
        depositId: deposit.id,
        paymentUrl: charge.hosted_url,
        qrCode: charge.payment_uri,
        expiresAt: charge.expires_at,
      },
    })
  } catch (error) {
    logger.error("Deposit creation error:", error)
    return NextResponse.json({ error: "Failed to create deposit" }, { status: 500 })
  }
}

// GET endpoint to retrieve user's deposits
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

    // Query deposits for the user
    const userDeposits = await db.query.deposits.findMany({
      where: (deposits, { eq, and, inArray }) => {
        const conditions = [eq(deposits.userId, Number.parseInt(userId))]
        if (status && status !== "all") {
          conditions.push(
            inArray(deposits.status, status.split(",") as ["pending" | "processing" | "completed" | "failed"]),
          )
        }
        return and(...conditions)
      },
      orderBy: (deposits, { desc }) => [desc(deposits.createdAt)],
      limit,
      offset,
    })

    // Count total deposits for pagination
    const [{ count }] = await db
      .select({ count: db.fn.count() })
      .from(deposits)
      .where(eq(deposits.userId, Number.parseInt(userId)))

    return NextResponse.json({
      status: "success",
      data: userDeposits,
      pagination: {
        total: Number(count),
        limit,
        offset,
      },
    })
  } catch (error) {
    logger.error("Error fetching deposits:", error)
    return NextResponse.json({ error: "Failed to fetch deposits" }, { status: 500 })
  }
}
