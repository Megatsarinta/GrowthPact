import { describe, expect, it, jest, beforeEach } from "@jest/globals"
import { NextRequest } from "next/server"
import { POST as createWithdrawal } from "@/app/api/withdrawals/route"
import { PUT as processWithdrawal } from "@/app/api/admin/withdrawals/[id]/route"
import { db } from "@/lib/db/client"

// Mock dependencies
jest.mock("@/lib/db/client", () => ({
  db: {
    insert: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    values: jest.fn().mockReturnThis(),
    returning: jest.fn().mockResolvedValue([]),
    transaction: jest.fn().mockImplementation(
      async (callback) =>
        await callback({
          insert: jest.fn().mockReturnThis(),
          update: jest.fn().mockReturnThis(),
          set: jest.fn().mockReturnThis(),
          values: jest.fn().mockReturnThis(),
          where: jest.fn().mockResolvedValue([]),
        }),
    ),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
  },
}))

jest.mock("@/lib/queue/client", () => ({
  addJob: jest.fn().mockResolvedValue({}),
}))

describe("Withdrawal API", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("should create a withdrawal request", async () => {
    // Mock user balance check
    jest.spyOn(db, "select").mockImplementation(
      () =>
        ({
          from: () => ({
            where: () => [{ balanceInr: "10000" }],
          }),
        }) as any,
    )

    // Mock getting the created withdrawal
    jest.spyOn(db, "select").mockImplementationOnce(
      () =>
        ({
          from: () => ({
            where: () => ({
              orderBy: () => ({
                limit: () => [
                  {
                    id: 1,
                    userId: 123,
                    amountInr: "5000",
                    currency: "INR",
                    status: "pending",
                    createdAt: new Date(),
                  },
                ],
              }),
            }),
          }),
        }) as any,
    )

    const request = new NextRequest("http://localhost/api/withdrawals", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": "123",
      },
      body: JSON.stringify({
        amount: 5000,
        currency: "INR",
      }),
    })

    const response = await createWithdrawal(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.status).toBe("success")
    expect(data.data).toHaveProperty("withdrawalId")
    expect(data.data.amount).toBe(5000)
    expect(data.data.status).toBe("pending")
  })

  it("should validate withdrawal request data", async () => {
    const request = new NextRequest("http://localhost/api/withdrawals", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": "123",
      },
      body: JSON.stringify({
        amount: -100, // Invalid amount
        currency: "INR",
      }),
    })

    const response = await createWithdrawal(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data).toHaveProperty("error")
  })

  it("should check for sufficient balance", async () => {
    // Mock user with insufficient balance
    jest.spyOn(db, "select").mockImplementation(
      () =>
        ({
          from: () => ({
            where: () => [{ balanceInr: "1000" }],
          }),
        }) as any,
    )

    const request = new NextRequest("http://localhost/api/withdrawals", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": "123",
      },
      body: JSON.stringify({
        amount: 5000, // More than available balance
        currency: "INR",
      }),
    })

    const response = await createWithdrawal(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe("Insufficient balance")
  })

  it("should allow admin to approve a withdrawal", async () => {
    // Mock getting the withdrawal
    jest.spyOn(db, "select").mockImplementation(
      () =>
        ({
          from: () => ({
            where: () => [
              {
                id: 1,
                userId: 123,
                amountInr: "5000",
                currency: "INR",
                status: "pending",
              },
            ],
          }),
        }) as any,
    )

    const request = new NextRequest("http://localhost/api/admin/withdrawals/1", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "x-user-role": "admin",
      },
      body: JSON.stringify({
        action: "approve",
        txReference: "BANK123456",
      }),
    })

    const response = await processWithdrawal(request, { params: { id: "1" } })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.status).toBe("success")
    expect(db.update).toHaveBeenCalled()
  })

  it("should allow admin to reject a withdrawal", async () => {
    // Mock getting the withdrawal
    jest.spyOn(db, "select").mockImplementation(
      () =>
        ({
          from: () => ({
            where: () => [
              {
                id: 1,
                userId: 123,
                amountInr: "5000",
                currency: "INR",
                status: "pending",
              },
            ],
          }),
        }) as any,
    )

    const request = new NextRequest("http://localhost/api/admin/withdrawals/1", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "x-user-role": "admin",
      },
      body: JSON.stringify({
        action: "reject",
      }),
    })

    const response = await processWithdrawal(request, { params: { id: "1" } })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.status).toBe("success")
    expect(db.transaction).toHaveBeenCalled()
  })
})
