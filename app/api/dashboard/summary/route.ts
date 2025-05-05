import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db/client"
import { users, userInvestments, deposits, withdrawals, interestAccruals } from "@/lib/db/schema"
import { eq, and, sql, desc, gte } from "drizzle-orm"

export async function GET(request: NextRequest) {
  try {
    // Get user ID from request headers (set by middleware)
    const userId = request.headers.get("x-user-id")
    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const userIdNum = Number.parseInt(userId)

    // Get user's balance
    const [user] = await db.select({ balanceInr: users.balanceInr }).from(users).where(eq(users.id, userIdNum))

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Get active investments count
    const [{ activeInvestments }] = await db
      .select({
        activeInvestments: db.fn.count(),
      })
      .from(userInvestments)
      .where(and(eq(userInvestments.userId, userIdNum), eq(userInvestments.isActive, true)))

    // Get total invested amount
    const [{ totalInvested }] = await db
      .select({
        totalInvested: sql<string>`COALESCE(SUM(${userInvestments.amount}), 0)`,
      })
      .from(userInvestments)
      .where(eq(userInvestments.userId, userIdNum))

    // Get total interest earned
    const [{ totalInterestEarned }] = await db
      .select({
        totalInterestEarned: sql<string>`COALESCE(SUM(${interestAccruals.interestAmount}), 0)`,
      })
      .from(interestAccruals)
      .where(eq(interestAccruals.userId, userIdNum))

    // Get recent transactions (deposits and withdrawals)
    const recentDeposits = await db.query.deposits.findMany({
      where: eq(deposits.userId, userIdNum),
      orderBy: [desc(deposits.createdAt)],
      limit: 5,
    })

    const recentWithdrawals = await db.query.withdrawals.findMany({
      where: eq(withdrawals.userId, userIdNum),
      orderBy: [desc(withdrawals.createdAt)],
      limit: 5,
    })

    // Combine and sort transactions
    const recentTransactions = [
      ...recentDeposits.map((d) => ({
        id: `dep-${d.id}`,
        type: "deposit" as const,
        amount: d.amountInr || "0",
        currency: "INR",
        status: d.status,
        createdAt: d.createdAt,
      })),
      ...recentWithdrawals.map((w) => ({
        id: `with-${w.id}`,
        type: "withdrawal" as const,
        amount: w.amountInr,
        currency: "INR",
        status: w.status,
        createdAt: w.createdAt,
      })),
    ]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 5)

    // Get monthly interest data for chart (last 6 months)
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
    sixMonthsAgo.setDate(1)
    sixMonthsAgo.setHours(0, 0, 0, 0)

    const monthlyInterest = await db
      .select({
        month: sql<string>`TO_CHAR(${interestAccruals.date}, 'YYYY-MM')`,
        total: sql<string>`SUM(${interestAccruals.interestAmount})`,
      })
      .from(interestAccruals)
      .where(and(eq(interestAccruals.userId, userIdNum), gte(interestAccruals.date, sixMonthsAgo)))
      .groupBy(sql`TO_CHAR(${interestAccruals.date}, 'YYYY-MM')`)
      .orderBy(sql`TO_CHAR(${interestAccruals.date}, 'YYYY-MM')`)

    // Get active investments with plan details
    const activeInvestmentsList = await db.query.userInvestments.findMany({
      where: and(eq(userInvestments.userId, userIdNum), eq(userInvestments.isActive, true)),
      with: {
        plan: true,
      },
      orderBy: [desc(userInvestments.createdAt)],
    })

    return NextResponse.json({
      status: "success",
      data: {
        balance: user.balanceInr,
        activeInvestmentsCount: Number(activeInvestments),
        totalInvested,
        totalInterestEarned,
        recentTransactions,
        monthlyInterest,
        activeInvestments: activeInvestmentsList,
      },
    })
  } catch (error) {
    console.error("Error fetching dashboard summary:", error)
    return NextResponse.json({ error: "Failed to fetch dashboard summary" }, { status: 500 })
  }
}
