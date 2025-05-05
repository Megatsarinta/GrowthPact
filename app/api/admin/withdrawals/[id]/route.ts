import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db/client"
import { withdrawals, users } from "@/lib/db/schema"
import { eq, sql } from "drizzle-orm"
import { addJob } from "@/lib/queue/client"
import { logger } from "@/lib/logger"
import { createAuditLog } from "@/lib/audit"
import { notifyWithdrawalProcessed } from "@/lib/notifications/server"

// Validation schema for withdrawal processing
const processWithdrawalSchema = z.object({
  action: z.enum(["approve", "reject"]),
  txReference: z.string().optional(),
  rejectionReason: z.string().optional(),
})

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Get admin role from request headers (set by middleware)
    const userRole = request.headers.get("x-user-role")
    const adminId = request.headers.get("x-user-id")

    if (userRole !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    const withdrawalId = Number.parseInt(params.id)
    if (isNaN(withdrawalId)) {
      return NextResponse.json({ error: "Invalid withdrawal ID" }, { status: 400 })
    }

    // Parse and validate request body
    const body = await request.json()
    const result = processWithdrawalSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 })
    }

    const { action, txReference, rejectionReason } = result.data

    // Get the withdrawal
    const [withdrawal] = await db.select().from(withdrawals).where(eq(withdrawals.id, withdrawalId))

    if (!withdrawal) {
      return NextResponse.json({ error: "Withdrawal not found" }, { status: 404 })
    }

    // Check if withdrawal is already processed
    if (withdrawal.status !== "pending") {
      return NextResponse.json({ error: `Withdrawal is already ${withdrawal.status}` }, { status: 400 })
    }

    if (action === "approve") {
      // Update withdrawal status to processing
      await db
        .update(withdrawals)
        .set({
          status: "processing",
          txReference: txReference || null,
          updatedAt: new Date(),
        })
        .where(eq(withdrawals.id, withdrawalId))

      // Create audit log
      await createAuditLog({
        userId: Number.parseInt(adminId),
        action: "withdrawal_approved",
        metadata: {
          withdrawalId,
          userId: withdrawal.userId,
          amount: withdrawal.amountInr,
          currency: withdrawal.currency,
          txReference,
        },
      })

      // For crypto withdrawals, enqueue a job to process the transfer
      if (withdrawal.currency === "USDT" && withdrawal.walletAddress) {
        await addJob("processCryptoWithdrawal", {
          withdrawalId: withdrawal.id,
          userId: withdrawal.userId,
          amount: withdrawal.amountInr,
          walletAddress: withdrawal.walletAddress,
        })

        logger.info(`Crypto withdrawal ${withdrawalId} approved and queued for processing`)
      } else {
        // For INR withdrawals, mark as completed (manual bank transfer)
        await db
          .update(withdrawals)
          .set({
            status: "completed",
            updatedAt: new Date(),
          })
          .where(eq(withdrawals.id, withdrawalId))

        // Notify user
        await notifyWithdrawalProcessed(withdrawal.userId, withdrawal.amountInr, "INR")

        logger.info(`INR withdrawal ${withdrawalId} approved and marked as completed`)
      }

      return NextResponse.json({
        status: "success",
        message: "Withdrawal approved and processing",
      })
    } else if (action === "reject") {
      // Begin transaction to refund the amount
      await db.transaction(async (tx) => {
        // Update withdrawal status to failed
        await tx
          .update(withdrawals)
          .set({
            status: "failed",
            updatedAt: new Date(),
            rejectionReason: rejectionReason || "Rejected by admin",
          })
          .where(eq(withdrawals.id, withdrawalId))

        // Refund the amount to user's balance
        await tx
          .update(users)
          .set({
            balanceInr: sql`${users.balanceInr} + ${withdrawal.amountInr}`,
            updatedAt: new Date(),
          })
          .where(eq(users.id, withdrawal.userId))
      })

      // Create audit log
      await createAuditLog({
        userId: Number.parseInt(adminId),
        action: "withdrawal_rejected",
        metadata: {
          withdrawalId,
          userId: withdrawal.userId,
          amount: withdrawal.amountInr,
          currency: withdrawal.currency,
          reason: rejectionReason || "Rejected by admin",
        },
      })

      // Notify user
      await notifyWithdrawalProcessed(
        withdrawal.userId,
        withdrawal.amountInr,
        withdrawal.currency,
        "rejected",
        rejectionReason,
      )

      logger.info(`Withdrawal ${withdrawalId} rejected and funds returned to user`)

      return NextResponse.json({
        status: "success",
        message: "Withdrawal rejected and funds returned to user",
      })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error) {
    logger.error("Withdrawal processing error:", error)
    return NextResponse.json({ error: "Failed to process withdrawal" }, { status: 500 })
  }
}

// GET endpoint to retrieve a specific withdrawal
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Get admin role from request headers (set by middleware)
    const userRole = request.headers.get("x-user-role")

    if (userRole !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    const withdrawalId = Number.parseInt(params.id)
    if (isNaN(withdrawalId)) {
      return NextResponse.json({ error: "Invalid withdrawal ID" }, { status: 400 })
    }

    // Get the withdrawal with user details
    const withdrawal = await db.query.withdrawals.findFirst({
      where: eq(withdrawals.id, withdrawalId),
      with: {
        user: {
          columns: {
            id: true,
            email: true,
            fullName: true,
            isVerified: true,
          },
        },
      },
    })

    if (!withdrawal) {
      return NextResponse.json({ error: "Withdrawal not found" }, { status: 404 })
    }

    return NextResponse.json({
      status: "success",
      data: withdrawal,
    })
  } catch (error) {
    logger.error("Error fetching withdrawal:", error)
    return NextResponse.json({ error: "Failed to fetch withdrawal" }, { status: 500 })
  }
}
