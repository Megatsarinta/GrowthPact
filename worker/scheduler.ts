import { Queue } from "bullmq"
import { REDIS_URL } from "@/app/api/env-config"

// Create a queue for scheduled jobs
const schedulerQueue = new Queue("scheduler", {
  connection: {
    host: new URL(REDIS_URL).hostname,
    port: Number.parseInt(new URL(REDIS_URL).port || "6379"),
  },
})

// Schedule the interest accrual job to run daily at 00:01 UTC
async function scheduleInterestAccrual() {
  await schedulerQueue.add(
    "dailyInterestAccrual",
    { date: new Date() },
    {
      repeat: {
        pattern: "1 0 * * *", // Run at 00:01 UTC every day
      },
      jobId: "daily-interest-accrual",
    },
  )

  console.log("Daily interest accrual job scheduled")
}

// Initialize the scheduler
export async function initScheduler() {
  try {
    await scheduleInterestAccrual()
    console.log("Scheduler initialized successfully")
  } catch (error) {
    console.error("Failed to initialize scheduler:", error)
    throw error
  }
}
