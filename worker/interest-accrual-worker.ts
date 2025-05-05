import { Worker, type Job } from "bullmq"
import { db } from "@/lib/db/client"
import { userInvestments, interestAccruals, users, investmentPlans } from "@/lib/db/schema"
import { eq, and, lt, gte } from "drizzle-orm"
import { REDIS_URL } from "@/app/api/env-config"
import { sql } from "drizzle-orm"
import { logger } from "@/lib/logger"
import { notifyInterestAccrued } from "@/lib/notifications/server"
import { createAuditLog } from "@/lib/audit"

// Create a worker to process interest accruals
const worker = new Worker(
  "calculateInterest",
  async (job) => {
    try {
      const { date = new Date() } = job.data || {}

      // Format date as YYYY-MM-DD for comparison
      const currentDate = new Date(date)
      currentDate.setHours(0, 0, 0, 0)

      logger.info(`Calculating interest for date: ${currentDate.toISOString().split("T")[0]}`)

      // Get all active investments
      const activeInvestments = await db
        .select()
        .from(userInvestments)
        .where(
          and(
            eq(userInvestments.isActive, true),
            lt(userInvestments.startDate, currentDate),
            gte(userInvestments.endDate, currentDate),
          ),
        )

      logger.info(`Found ${activeInvestments.length} active investments`)

      // Process each investment
      const results = await Promise.all(
        activeInvestments.map(async (investment) => {
          try {
            // Get investment plan details
            const [plan] = await db.query.investmentPlans.findMany({
              where: eq(investmentPlans.id, investment.planId),
              limit: 1,
            })

            if (!plan) {
              throw new Error(`Plan not found for investment ${investment.id}`)
            }

            // Calculate daily interest
            const dailyInterestRate = Number.parseFloat(plan.dailyInterest) / 100
            const investmentAmount = Number.parseFloat(investment.amount)
            const interestAmount = investmentAmount * dailyInterestRate

            // Check if interest has already been accrued for this date
            const existingAccrual = await db
              .select()
              .from(interestAccruals)
              .where(
                and(
                  eq(interestAccruals.investmentId, investment.id),
                  eq(sql`DATE(${interestAccruals.date})`, sql`DATE(${currentDate})`),
                ),
              )
              .limit(1)

            if (existingAccrual.length > 0) {
              logger.info(
                `Interest already accrued for investment ${investment.id} on ${currentDate.toISOString().split("T")[0]}`,
              )
              return {
                investmentId: investment.id,
                status: "skipped",
                reason: "already_accrued",
              }
            }

            // Begin transaction to update balances and records
            await db.transaction(async (tx) => {
              // Create interest accrual record
              const [accrual] = await tx
                .insert(interestAccruals)
                .values({
                  userId: investment.userId,
                  investmentId: investment.id,
                  date: currentDate,
                  interestAmount: interestAmount.toFixed(2),
                })
                .returning()

              // Update total interest earned on investment
              await tx
                .update(userInvestments)
                .set({
                  totalInterestEarned: sql`${userInvestments.totalInterestEarned} + ${interestAmount.toFixed(2)}`,
                  updatedAt: new Date(),
                })
                .where(eq(userInvestments.id, investment.id))

              // Credit user balance
              await tx
                .update(users)
                .set({
                  balanceInr: sql`${users.balanceInr} + ${interestAmount.toFixed(2)}`,
                  updatedAt: new Date(),
                })
                .where(eq(users.id, investment.userId))

              // Create audit log
              await createAuditLog({
                userId: investment.userId,
                action: "interest_accrued",
                metadata: {
                  investmentId: investment.id,
                  accrualId: accrual.id,
                  amount: interestAmount.toFixed(2),
                  date: currentDate.toISOString().split("T")[0],
                  planId: plan.id,
                  planName: plan.name,
                },
              })
            })

            // Notify user about interest accrual
            await notifyInterestAccrued(investment.userId, interestAmount.toFixed(2))

            logger.info(`Accrued interest for investment ${investment.id}: ₹${interestAmount.toFixed(2)}`)

            return {
              investmentId: investment.id,
              userId: investment.userId,
              interestAmount,
              status: "success",
            }
          } catch (error) {
            logger.error(`Error processing investment ${investment.id}:`, error)
            return {
              investmentId: investment.id,
              status: "error",
              error: error.message,
            }
          }
        }),
      )

      // Summarize results
      const successful = results.filter((r) => r.status === "success").length
      const skipped = results.filter((r) => r.status === "skipped").length
      const failed = results.filter((r) => r.status === "error").length

      logger.info(`Interest accrual completed: ${successful} successful, ${skipped} skipped, ${failed} failed`)

      return {
        date: currentDate.toISOString().split("T")[0],
        processed: activeInvestments.length,
        successful,
        skipped,
        failed,
        details: results,
      }
    } catch (error) {
      logger.error("Interest accrual job failed:", error)
      throw error
    }
  },
  {
    connection: {
      host: new URL(REDIS_URL).hostname,
      port: Number.parseInt(new URL(REDIS_URL).port || "6379"),
    },
    concurrency: 1, // Run one job at a time to avoid conflicts
  },
)

// Handle worker events
worker.on("completed", (job: Job) => {
  logger.info(`Interest accrual job ${job.id} completed successfully`)
})

worker.on("failed", (job: Job, error: Error) => {
  logger.error(`Interest accrual job ${job.id} failed:`, error)
})

export default worker
