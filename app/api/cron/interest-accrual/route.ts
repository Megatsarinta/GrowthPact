import { NextResponse } from "next/server"
import { addJob } from "@/lib/queue/client"
import { logger } from "@/lib/logger"
import { createAuditLog } from "@/lib/audit"

// This endpoint is meant to be called by a CRON job scheduler
// It will trigger the interest accrual process for all active investments
export async function POST(request: Request) {
  try {
    // Verify the request is coming from an authorized source
    const authHeader = request.headers.get("authorization")
    if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      logger.warn("Unauthorized attempt to trigger interest accrual CRON job")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Add job to calculate interest for the current date
    const job = await addJob("calculateInterest", { date: new Date() })

    logger.info(`Interest accrual CRON job triggered successfully: ${job.id}`)

    // Create audit log for the system action
    await createAuditLog({
      action: "interest_accrual_triggered",
      metadata: {
        jobId: job.id,
        date: new Date().toISOString().split("T")[0],
      },
    })

    return NextResponse.json({
      status: "success",
      message: "Interest accrual job queued successfully",
      jobId: job.id,
      date: new Date().toISOString().split("T")[0],
    })
  } catch (error) {
    logger.error("Error triggering interest accrual CRON job:", error)
    return NextResponse.json({ error: "Failed to trigger interest accrual" }, { status: 500 })
  }
}

// Configure the route to be a POST-only endpoint
export const GET = () => {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 })
}
