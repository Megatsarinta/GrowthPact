import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { addJob } from "@/lib/queue/client"

// Validation schema for manual accrual request
const accrualSchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
    .optional(),
})

export async function POST(request: NextRequest) {
  try {
    // Get admin role from request headers (set by middleware)
    const userRole = request.headers.get("x-user-role")
    if (userRole !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    // Parse and validate request body
    const body = await request.json()
    const result = accrualSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 })
    }

    // Use provided date or current date
    const date = result.data.date ? new Date(result.data.date) : new Date()

    // Add job to calculate interest
    const job = await addJob("calculateInterest", { date })

    return NextResponse.json({
      status: "success",
      message: "Interest accrual job queued successfully",
      jobId: job.id,
      date: date.toISOString().split("T")[0],
    })
  } catch (error) {
    console.error("Error triggering interest accrual:", error)
    return NextResponse.json({ error: "Failed to trigger interest accrual" }, { status: 500 })
  }
}
