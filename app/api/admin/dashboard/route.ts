import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db/client"
import { users, userInvestments, deposits, withdrawals, interestAccruals } from "@/lib/db/schema"
import { eq, sql, and, gte } from "drizzle-orm"

export async function GET(request: NextRequest) {
  try {
    // Check if user is admin (middleware should have already verified this)
    const userRole = request.headers.get("x-user-role")
    if (userRole !== "admin") {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 403 })
    }

    // Get total users count
    const [{ count: totalUsers }] = await db.select({ count: db.fn.count() }).from(users)

    // Get active investments count
    const [{ count: activeInvestments }] = await db
      .select({ count: db.fn.count() })
      .from(userInvestments)
      .where(eq(userInvestments.isActive, true))

    // Get pending withdrawals count
    const [{ count: pendingWithdrawals }] = await db
      .select({ count: db.fn.count() })
      .from(withdrawals)
      .where(eq(withdrawals.status, "pending"))

    // Get total deposits amount
    const [{ total: totalDeposits }] = await db
      .select({ total: sql<string>`COALESCE(SUM(${deposits.amountInr}), 0)` })
      .from(deposits)
      .where(eq(deposits.status, "completed"))

    // Get total withdrawals amount
    const [{ total: totalWithdrawals }] = await db
      .select({ total: sql<string>`COALESCE(SUM(${withdrawals.amountInr}), 0)` })
      .from(withdrawals)
      .where(eq(withdrawals.status, "completed"))

    // Get total interest paid
    const [{ total: totalInterestPaid }] = await db
      .select({ total: sql<string>`COALESCE(SUM(${interestAccruals.interestAmount}), 0)` })
      .from(interestAccruals)

    // Get user growth data (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const userGrowth = await db
      .select({
        date: sql<string>`DATE(${users.createdAt})`,
        count: sql<number>`COUNT(*)`,
      })
      .from(users)
      .where(gte(users.createdAt, thirtyDaysAgo))
      .groupBy(sql`DATE(${users.createdAt})`)
      .orderBy(sql`DATE(${users.createdAt})`)

    // Get transaction volume data (last 30 days)
    const depositVolume = await db
      .select({
        date: sql<string>`DATE(${deposits.createdAt})`,
        amount: sql<number>`SUM(${deposits.amountInr})`,
      })
      .from(deposits)
      .where(and(gte(deposits.createdAt, thirtyDaysAgo), eq(deposits.status, "completed")))
      .groupBy(sql`DATE(${deposits.createdAt})`)
      .orderBy(sql`DATE(${deposits.createdAt})`)

    const withdrawalVolume = await db
      .select({
        date: sql<string>`DATE(${withdrawals.createdAt})`,
        amount: sql<number>`SUM(${withdrawals.amountInr})`,
      })
      .from(withdrawals)
      .where(and(gte(withdrawals.createdAt, thirtyDaysAgo), eq(withdrawals.status, "completed")))
      .groupBy(sql`DATE(${withdrawals.createdAt})`)
      .orderBy(sql`DATE(${withdrawals.createdAt})`)

    // Combine deposit and withdrawal data
    const transactionVolume = []
    const dateMap = new Map()

    // Process deposit data
    for (const item of depositVolume) {
      dateMap.set(item.date, { date: item.date, deposits: Number(item.amount), withdrawals: 0 })
    }

    // Process withdrawal data
    for (const item of withdrawalVolume) {
      if (dateMap.has(item.date)) {
        const existing = dateMap.get(item.date)
        existing.withdrawals = Number(item.amount)
      } else {
        dateMap.set(item.date, { date: item.date, deposits: 0, withdrawals: Number(item.amount) })
      }
    }

    // Convert map to array
    for (const [_, value] of dateMap) {
      transactionVolume.push(value)
    }

    // Sort by date
    transactionVolume.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    return NextResponse.json({
      status: "success",
      data: {
        totalUsers: Number(totalUsers),
        activeInvestments: Number(activeInvestments),
        pendingWithdrawals: Number(pendingWithdrawals),
        totalDeposits,
        totalWithdrawals,
        totalInterestPaid,
        userGrowth,
        transactionVolume,
      },
    })
  } catch (error) {
    console.error("Error fetching admin dashboard statistics:", error)
    return NextResponse.json({ error: "Failed to fetch dashboard statistics" }, { status: 500 })
  }
}
