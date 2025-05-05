import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db/client"
import { withdrawals, users } from "@/lib/db/schema"
import { sql, eq, and, inArray } from "drizzle-orm"

export async function GET(request: NextRequest) {
  try {
    // Get admin role from request headers (set by middleware)
    const userRole = request.headers.get("x-user-role")
    if (userRole !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    // Get query parameters for pagination and filtering
    const url = new URL(request.url)
    const limit = Number.parseInt(url.searchParams.get("limit") || "20")
    const offset = Number.parseInt(url.searchParams.get("offset") || "0")
    const status = url.searchParams.get("status") || undefined
    const userId = url.searchParams.get("userId") || undefined

    // Query withdrawals with user details
    const allWithdrawals = await db
      .select({
        withdrawal: withdrawals,
        user: {
          id: users.id,
          email: users.email,
          fullName: users.fullName,
        },
      })
      .from(withdrawals)
      .leftJoin(users, eq(withdrawals.userId, users.id))
      .where(
        and(
          ...[
            status ? inArray(withdrawals.status, status.split(",") as any) : undefined,
            userId ? eq(withdrawals.userId, Number.parseInt(userId)) : undefined,
          ].filter(Boolean),
        ),
      )
      .orderBy(sql`${withdrawals.createdAt} DESC`)
      .limit(limit)
      .offset(offset)

    // Count total withdrawals for pagination
    const [{ count }] = await db.select({ count: db.fn.count() }).from(withdrawals)

    return NextResponse.json({
      status: "success",
      data: allWithdrawals,
      pagination: {
        total: Number(count),
        limit,
        offset,
      },
    })
  } catch (error) {
    console.error("Error fetching admin withdrawals:", error)
    return NextResponse.json({ error: "Failed to fetch withdrawals" }, { status: 500 })
  }
}
