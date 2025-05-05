import { type NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import { db } from "@/lib/db/client"
import { deposits, users } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { COINBASE_COMMERCE_WEBHOOK_SECRET } from "@/app/api/env-config"
import { addJob } from "@/lib/queue/client"
import { logger } from "@/lib/logger"
import { createAuditLog } from "@/lib/audit"
import { notifyDepositConfirmed } from "@/lib/notifications/server"
import { sql } from "drizzle-orm"

export async function POST(request: NextRequest) {
  try {
    // Get the signature from the headers
    const signature = request.headers.get("x-cc-webhook-signature")
    if (!signature) {
      logger.warn("Missing signature in Coinbase webhook")
      return NextResponse.json({ error: "Missing signature" }, { status: 401 })
    }

    // Get the raw body
    const rawBody = await request.text()

    // Verify the webhook signature
    const hmac = crypto.createHmac("sha256", COINBASE_COMMERCE_WEBHOOK_SECRET)
    hmac.update(rawBody)
    const computedSignature = hmac.digest("hex")

    if (computedSignature !== signature) {
      logger.warn("Invalid signature in Coinbase webhook")
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
    }

    // Parse the webhook payload
    const payload = JSON.parse(rawBody)
    const event = payload.event

    logger.info(`Received Coinbase webhook: ${event.type}`)

    // Handle different event types
    if (event.type === "charge:confirmed") {
      const chargeId = event.data.id

      // Find the deposit with this charge ID
      const [deposit] = await db.select().from(deposits).where(eq(deposits.txReference, chargeId)).limit(1)

      if (!deposit) {
        logger.warn(`Deposit not found for charge ID: ${chargeId}`)
        return NextResponse.json({ error: "Deposit not found" }, { status: 404 })
      }

      // Update deposit status to processing
      await db
        .update(deposits)
        .set({
          status: "processing",
          updatedAt: new Date(),
        })
        .where(eq(deposits.id, deposit.id))

      // Create audit log
      await createAuditLog({
        userId: deposit.userId,
        action: "deposit_confirmed",
        metadata: {
          depositId: deposit.id,
          amount: deposit.amountCrypto,
          currency: deposit.currency,
          chargeId,
        },
      })

      // Enqueue conversion job
      await addJob("convertCrypto", {
        depositId: deposit.id,
        userId: deposit.userId,
        amount: deposit.amountCrypto,
        currency: deposit.currency,
      })

      logger.info(`Deposit ${deposit.id} confirmed and queued for conversion`)

      return NextResponse.json({ status: "success" })
    } else if (event.type === "charge:failed") {
      const chargeId = event.data.id

      // Find the deposit with this charge ID
      const [deposit] = await db.select().from(deposits).where(eq(deposits.txReference, chargeId)).limit(1)

      if (!deposit) {
        logger.warn(`Deposit not found for charge ID: ${chargeId}`)
        return NextResponse.json({ error: "Deposit not found" }, { status: 404 })
      }

      // Update deposit status to failed
      await db
        .update(deposits)
        .set({
          status: "failed",
          updatedAt: new Date(),
        })
        .where(eq(deposits.id, deposit.id))

      // Create audit log
      await createAuditLog({
        userId: deposit.userId,
        action: "deposit_failed",
        metadata: {
          depositId: deposit.id,
          amount: deposit.amountCrypto,
          currency: deposit.currency,
          chargeId,
        },
      })

      logger.info(`Deposit ${deposit.id} marked as failed`)

      return NextResponse.json({ status: "success" })
    } else if (event.type === "charge:pending") {
      // Log the pending status but don't take action yet
      logger.info(`Charge pending: ${event.data.id}`)
      return NextResponse.json({ status: "success" })
    } else if (event.type === "charge:resolved") {
      const chargeId = event.data.id

      // Find the deposit with this charge ID
      const [deposit] = await db.select().from(deposits).where(eq(deposits.txReference, chargeId)).limit(1)

      if (!deposit) {
        logger.warn(`Deposit not found for charge ID: ${chargeId}`)
        return NextResponse.json({ error: "Deposit not found" }, { status: 404 })
      }

      // If the deposit is already completed, just acknowledge
      if (deposit.status === "completed") {
        return NextResponse.json({ status: "success" })
      }

      // If the deposit is still in processing, complete it
      if (deposit.status === "processing" && deposit.amountInr) {
        // Update deposit status to completed
        await db
          .update(deposits)
          .set({
            status: "completed",
            updatedAt: new Date(),
          })
          .where(eq(deposits.id, deposit.id))

        // Credit user's balance
        await db
          .update(users)
          .set({
            balanceInr: sql`${users.balanceInr} + ${deposit.amountInr}`,
            updatedAt: new Date(),
          })
          .where(eq(users.id, deposit.userId))

        // Create audit log
        await createAuditLog({
          userId: deposit.userId,
          action: "deposit_completed",
          metadata: {
            depositId: deposit.id,
            amountCrypto: deposit.amountCrypto,
            amountInr: deposit.amountInr,
            currency: deposit.currency,
          },
        })

        // Send notification to user
        await notifyDepositConfirmed(deposit.userId, deposit.amountInr, "INR")

        logger.info(`Deposit ${deposit.id} completed and credited to user balance`)
      }

      return NextResponse.json({ status: "success" })
    }

    // For other event types, just acknowledge receipt
    return NextResponse.json({ status: "success" })
  } catch (error) {
    logger.error("Webhook processing error:", error)
    return NextResponse.json({ error: "Failed to process webhook" }, { status: 500 })
  }
}
