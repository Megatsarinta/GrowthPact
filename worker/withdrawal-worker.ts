import { Worker, type Job } from "bullmq"
import { db } from "@/lib/db/client"
import { withdrawals } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { REDIS_URL, COINGECKO_API_URL } from "@/app/api/env-config"
import fetch from "node-fetch"

// Create a worker to process crypto withdrawals
const worker = new Worker(
  "processCryptoWithdrawal",
  async (job) => {
    try {
      const { withdrawalId, userId, amount, walletAddress } = job.data

      // Fetch current exchange rates from CoinGecko
      const response = await fetch(`${COINGECKO_API_URL}/simple/price?ids=tether&vs_currencies=inr`)

      if (!response.ok) {
        throw new Error(`Failed to fetch exchange rates: ${response.statusText}`)
      }

      const data = await response.json()
      const rate = data.tether.inr

      if (!rate) {
        throw new Error("Exchange rate not available for USDT")
      }

      // Calculate USDT amount
      const amountUsdt = Number.parseFloat(amount) / rate

      // In a real implementation, this would call a crypto payment provider API
      // to initiate the transfer. For this example, we'll simulate it.
      console.log(`Simulating USDT transfer of ${amountUsdt.toFixed(2)} to ${walletAddress}`)

      // Generate a mock transaction hash
      const txHash = `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`

      // Update withdrawal record with conversion details and mark as completed
      await db
        .update(withdrawals)
        .set({
          amountCrypto: amountUsdt.toFixed(8),
          conversionRate: rate.toString(),
          txReference: txHash,
          status: "completed",
          updatedAt: new Date(),
        })
        .where(eq(withdrawals.id, withdrawalId))

      console.log(`Withdrawal ${withdrawalId} completed: ${amount} INR = ${amountUsdt.toFixed(8)} USDT`)

      return {
        success: true,
        amountUsdt,
        txHash,
      }
    } catch (error) {
      console.error("Crypto withdrawal job failed:", error)

      // Update withdrawal status to failed
      await db
        .update(withdrawals)
        .set({
          status: "failed",
          updatedAt: new Date(),
        })
        .where(eq(withdrawals.id, job.data.withdrawalId))

      throw error
    }
  },
  {
    connection: {
      host: new URL(REDIS_URL).hostname,
      port: Number.parseInt(new URL(REDIS_URL).port || "6379"),
    },
    concurrency: 3,
  },
)

// Handle worker events
worker.on("completed", (job: Job) => {
  console.log(`Job ${job.id} completed successfully`)
})

worker.on("failed", (job: Job, error: Error) => {
  console.error(`Job ${job.id} failed:`, error)
})

export default worker
