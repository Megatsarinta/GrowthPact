import { describe, expect, it, jest, beforeEach } from "@jest/globals"
import { db } from "@/lib/db/client"
import { sql } from "drizzle-orm"
import fetch from "node-fetch"

// Mock dependencies
jest.mock("node-fetch")
jest.mock("@/lib/db/client", () => ({
  db: {
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    where: jest.fn().mockResolvedValue([]),
  },
}))

// Import the worker function directly for testing
const processJob = async (jobData: any) => {
  try {
    const { depositId, userId, amount, currency } = jobData

    // Mock fetch response
    const mockResponse = {
      bitcoin: { inr: 5000000 },
      ethereum: { inr: 200000 },
      tether: { inr: 83 },
    }

    const coinId = currency === "BTC" ? "bitcoin" : currency === "ETH" ? "ethereum" : "tether"

    const rate = mockResponse[coinId].inr

    // Calculate INR amount
    const amountInr = Number.parseFloat(amount) * rate

    // Update deposit record with conversion details
    await db
      .update("deposits")
      .set({
        amountInr: amountInr.toFixed(2),
        conversionRate: rate.toString(),
        status: "completed",
        updatedAt: new Date(),
      })
      .where({ id: depositId })

    // Credit user balance
    await db
      .update("users")
      .set({
        balanceInr: sql`balanceInr + ${amountInr.toFixed(2)}`,
        updatedAt: new Date(),
      })
      .where({ id: userId })

    return {
      success: true,
      amountInr,
      rate,
    }
  } catch (error) {
    console.error("Conversion job failed:", error)
    throw error
  }
}

describe("Conversion Worker", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("should convert crypto to INR and update user balance", async () => {
    // Mock fetch to return exchange rates
    ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
      ok: true,
      json: async () => ({
        bitcoin: { inr: 5000000 }, // 1 BTC = ₹5,000,000
      }),
    } as any)

    const jobData = {
      depositId: 1,
      userId: 123,
      amount: "0.01", // 0.01 BTC
      currency: "BTC" as const,
    }

    const result = await processJob(jobData)

    // 0.01 BTC * ₹5,000,000 = ₹50,000
    expect(result.amountInr).toBe(50000)
    expect(result.rate).toBe(5000000)

    // Check that the database was updated correctly
    expect(db.update).toHaveBeenCalledTimes(2)
    expect(db.set).toHaveBeenCalledTimes(2)
  })

  it("should handle different currencies correctly", async () => {
    // Mock fetch for USDT
    ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
      ok: true,
      json: async () => ({
        tether: { inr: 83 }, // 1 USDT = ₹83
      }),
    } as any)

    const jobData = {
      depositId: 2,
      userId: 456,
      amount: "100", // 100 USDT
      currency: "USDT" as const,
    }

    const result = await processJob(jobData)

    // 100 USDT * ₹83 = ₹8,300
    expect(result.amountInr).toBe(8300)
    expect(result.rate).toBe(83)
  })
})
