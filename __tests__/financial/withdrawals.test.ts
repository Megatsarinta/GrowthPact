import { describe, it, expect, beforeEach, jest } from "@jest/globals"
import { NextRequest } from "next/server"
import { POST as createWithdrawal, GET as getWithdrawals } from "@/app/api/withdrawals/route"
import { PUT as processWithdrawal } from "@/app/api/admin/withdrawals/[id]/route"
import { db } from "@/lib/db/client"

// Mock database operations
jest.mock("@/lib/db/client", () => {
  return {
    db: {
      insert: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
      returning: jest.fn().mockResolvedValue([
        {
          id: 1,
          userId: 1,
          currency: "INR",
          amountInr: "1000",
          fee: "50",
          status: "pending",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]),
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      transaction: jest.fn().mockImplementation(async (callback) => {
        return callback({
          insert: jest.fn().mockReturnThis(),
          values: jest.fn().mockReturnThis(),
          returning: jest.fn().mockResolvedValue([
            {
              id: 1,
              userId: 1,
              currency: "INR",
              amountInr: "1000",
              fee: "50",
              status: "pending",
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ]),
          update: jest.fn().mockReturnThis(),
          set: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
        })
      }),
      query: {
        withdrawals: {
          findMany: jest.fn().mockResolvedValue([
            {
              id: 1,
              userId: 1,
              currency: "INR",
              amountInr: "1000",
              fee: "50",
              status: "pending",
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ]),
          findFirst: jest.fn().mockResolvedValue({
            id: 1,
            userId: 1,
            currency: "INR",
            amountInr: "1000",
            fee: "50",
            status: "pending",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            user: {
              id: 1,
              email: "test@example.com",
              fullName: "Test User",
              isVerified: true,
            },
          }),
        },
        kycRecords: {
          findFirst: jest.fn().mockResolvedValue({
            id: 1,
            userId: 1,
            status: "approved",
          }),
        },
      },
      fn: {
        count: jest.fn(),
      },
    },
  }
})

// Mock audit logging
jest.mock("@/lib/audit", () => ({
  createAuditLog: jest.fn().mockResolvedValue({}),
}))

// Mock notifications
jest.mock("@/lib/notifications/server", () => ({
  notifyWithdrawalProcessed: jest.fn().mockResolvedValue({}),
}))

// Mock job queue
jest.mock("@/lib/queue/client", () => ({
  addJob: jest.fn().mockResolvedValue({ id: "test-job-id" }),
}))

describe("Withdrawal API", () => {
  let req: NextRequest

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks()
  })

  describe("POST /api/withdrawals", () => {
    it("should create a withdrawal request successfully", async () => {
      // Arrange
      req = new NextRequest("http://localhost/api/withdrawals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": "1",
        },
        body: JSON.stringify({
          amount: 1000,
          currency: "INR",
        }),
      })

      // Mock user balance
      db.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([{ balanceInr: "2000" }]),
        }),
      })

      // Act
      const response = await createWithdrawal(req)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.status).toBe("success")
      expect(data.data).toHaveProperty("withdrawalId")
      expect(data.data).toHaveProperty("amount")
      expect(data.data).toHaveProperty("fee")
      expect(data.data).toHaveProperty("totalAmount")
      expect(data.data).toHaveProperty("currency")
      expect(data.data).toHaveProperty("status", "pending")
    })

    it("should return 400 for invalid amount", async () => {
      // Arrange
      req = new NextRequest("http://localhost/api/withdrawals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": "1",
        },
        body: JSON.stringify({
          amount: -1000, // Negative amount
          currency: "INR",
        }),
      })

      // Act
      const response = await createWithdrawal(req)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(data).toHaveProperty("error")
    })

    it("should return 400 for insufficient balance", async () => {
      // Arrange
      req = new NextRequest("http://localhost/api/withdrawals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": "1",
        },
        body: JSON.stringify({
          amount: 5000, // More than available balance
          currency: "INR",
        }),
      })

      // Mock user balance
      db.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([{ balanceInr: "1000" }]),
        }),
      })

      // Act
      const response = await createWithdrawal(req)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(data).toHaveProperty("error")
      expect(data.error).toContain("Insufficient balance")
    })

    it("should return 403 if KYC is not approved", async () => {
      // Arrange
      req = new NextRequest("http://localhost/api/withdrawals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": "1",
        },
        body: JSON.stringify({
          amount: 1000,
          currency: "INR",
        }),
      })

      // Mock KYC status
      db.query.kycRecords.findFirst = jest.fn().mockResolvedValue(null)

      // Act
      const response = await createWithdrawal(req)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(403)
      expect(data).toHaveProperty("error")
      expect(data.error).toContain("KYC verification is required")
    })
  })

  describe("GET /api/withdrawals", () => {
    it("should fetch user withdrawals successfully", async () => {
      // Arrange
      req = new NextRequest("http://localhost/api/withdrawals", {
        method: "GET",
        headers: {
          "x-user-id": "1",
        },
      })

      // Act
      const response = await getWithdrawals(req)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.status).toBe("success")
      expect(data.data).toBeInstanceOf(Array)
      expect(data.data.length).toBeGreaterThan(0)
      expect(data.pagination).toBeDefined()
    })

    it("should return 401 if user is not authenticated", async () => {
      // Arrange
      req = new NextRequest("http://localhost/api/withdrawals", {
        method: "GET",
        headers: {
          // No x-user-id header
        },
      })

      // Act
      const response = await getWithdrawals(req)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(401)
      expect(data).toHaveProperty("error")
    })
  })

  describe("PUT /api/admin/withdrawals/[id]", () => {
    it("should approve a withdrawal successfully", async () => {
      // Arrange
      req = new NextRequest("http://localhost/api/admin/withdrawals/1", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": "1",
          "x-user-role": "admin",
        },
        body: JSON.stringify({
          action: "approve",
          txReference: "tx123",
        }),
      })

      // Act
      const response = await processWithdrawal(req, { params: { id: "1" } })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.status).toBe("success")
      expect(data.message).toContain("approved")
    })

    it("should reject a withdrawal successfully", async () => {
      // Arrange
      req = new NextRequest("http://localhost/api/admin/withdrawals/1", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": "1",
          "x-user-role": "admin",
        },
        body: JSON.stringify({
          action: "reject",
          rejectionReason: "Suspicious activity",
        }),
      })

      // Act
      const response = await processWithdrawal(req, { params: { id: "1" } })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.status).toBe("success")
      expect(data.message).toContain("rejected")
    })

    it("should return 403 if user is not an admin", async () => {
      // Arrange
      req = new NextRequest("http://localhost/api/admin/withdrawals/1", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": "1",
          "x-user-role": "user", // Not admin
        },
        body: JSON.stringify({
          action: "approve",
        }),
      })

      // Act
      const response = await processWithdrawal(req, { params: { id: "1" } })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(403)
      expect(data).toHaveProperty("error")
      expect(data.error).toContain("Admin access required")
    })
  })
})
