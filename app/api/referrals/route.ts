import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db/client"
import { users, referrals } from "@/lib/db/schema"
import { eq, sql } from "drizzle-orm"
import { nanoid } from "nanoid"
import { FRONTEND_URL } from "@/app/api/env-config"

export async function GET(request: NextRequest) {
  try {
    // Get user ID from request headers (set by middleware)
    const userId = request.headers.get("x-user-id")
    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const userIdNum = Number.parseInt(userId)

    // Get user's referral code
    const [user] = await db.select({ referralCode: users.referralCode }).from(users).where(eq(users.id, userIdNum))

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // If user doesn't have a referral code, generate one
    let referralCode = user.referralCode
    if (!referralCode) {
      referralCode = nanoid(8).toUpperCase()

      // Update user with new referral code
      await db.update(users).set({ referralCode }).where(eq(users.id, userIdNum))
    }

    // Get referral count
    const [{ referralCount }] = await db
      .select({
        referralCount: db.fn.count(),
      })
      .from(users)
      .where(eq(users.referredBy, userIdNum))

    // Get total referral earnings
    const [{ totalEarnings }] = await db
      .select({
        totalEarnings: sql<string>`COALESCE(SUM(${referrals.bonusAmount}), 0)`,
      })
      .from(referrals)
      .where(eq(referrals.referrerId, userIdNum))

    // Generate referral link
    const referralLink = `${FRONTEND_URL}/auth/register?ref=${referralCode}`

    return NextResponse.json({
      status: "success",
      data: {
        referralCode,
        referralCount: Number(referralCount),
        referralEarnings: totalEarnings,
        referralLink,
      },
    })
  } catch (error) {
    console.error("Error fetching referral data:", error)
    return NextResponse.json({ error: "Failed to fetch referral data" }, { status: 500 })
  }
}
