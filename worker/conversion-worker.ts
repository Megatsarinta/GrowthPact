import { Worker, type Job } from "bullmq"
import { db } from "@/lib/db/client"
import { deposits } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { REDIS_URL, COINGECKO_API_URL } from "@/app/api/env-config"
import fetch from "node-fetch"
import { logger } from "@/lib/logger"

// Create a worker to process crypto conversions
const worker = new Worker(
  "convertCrypto",
  async (job) => {
    try {
      const { depositId, userId, amount, currency } = job.data

      logger.info(`Processing conversion for deposit ${depositId}: ${amount} ${currency}`)

      // Map currency to CoinGecko ID
      const currencyMap = {
        BTC: "bitcoin",
        ETH: "ethereum",
        USDT: "tether",
      }

      const coinId = currencyMap[currency]

      // Fetch current exchange rates from CoinGecko
      const response = await fetch(`${COINGECKO_API_URL}/simple/price?ids=${coinId}&vs_currencies=inr`)

      if (!response.ok) {
        throw new Error(`Failed to fetch exchange rates: ${response.statusText}`)
      }

      const data = await response.json()
      const rate = data[coinId].inr

      if (!rate) {
        throw new Error(`Exchange rate not available for ${currency}`)
      }

      // Calculate INR amount
      const amountInr = Number.parseFloat(amount) * rate

      logger.info(`Conversion rate for ${currency}: 1 ${currency} = ${rate} INR`)
      logger.info(`Converted amount: ${amount} ${currency} = ${amountInr.toFixed(2)} INR`)

      // Update deposit record with conversion details
      await db
        .update(deposits)
        .set({
          amountInr: amountInr.toFixed(2),
          conversionRate: rate.toString(),
          status: "completed",
          updatedAt: new Date(),
        })
        .where(eq(deposits.id, depositId))

      logger.info(`Deposit ${depositId} updated with conversion details`)

      return {
        success: true,
        amountInr,
        rate,
      }
    } catch (error) {
      logger.error(`Conversion job failed for deposit ${job.data.depositId}:`, error)

      // Update deposit status to failed
      await db
        .update(deposits)
        .set({
          status: "failed",
          updatedAt: new Date(),
        })
        .where(eq(deposits.id, job.data.depositId))

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
  logger.info(`Conversion job ${job.id} completed successfully`)
})

worker.on("failed", (job: Job, error: Error) => {
  logger.error(`Conversion job ${job.id} failed:`, error)
})

export default worker
