import { describe, it, expect, beforeEach, jest } from "@jest/globals"
import { NextRequest } from "next/server"
import { POST as createDeposit, GET as getDeposits } from "@/app/api/deposits/route"
import { db } from "@/lib/db/client"
import { Client, resources } from "coinbase-commerce-node"

// Mock Coinbase Commerce
jest.mock("coinbase-commerce-node", () => {
  return {
    Client: {
      init: jest.fn(),
    },
    resources: {
      Charge: {
        create: jest.fn().mockResolvedValue({
          id: "test-charge-id",
          hosted_url: "https://test-payment-url.com",
          payment_uri: "https://test-qr-code.com",
          expires_at: new Date(Date.now() + 3600000).toISOString(),
        }),
      },
    },
  }
})

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
          currency: "BTC",
          amountCrypto: "0.01",
          status: "pending",
          txReference: "test-charge-id",
          paymentUrl: "https://test-payment-url.com",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]),
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      query: {
        deposits: {
          findMany: jest.fn().mockResolvedValue([
            {
              id: 1,
              userId: 1,
              currency: "BTC",
              amountCrypto: "0.01",
              status: "pending",
              txReference: "test-charge-id",
              paymentUrl: "https://test-payment-url.com",
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ]),
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

describe("Deposit API", () => {
  let req: NextRequest

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks()
  })

  describe("POST /api/deposits", () => {
    it("should create a deposit successfully", async () => {
      // Arrange
      req = new NextRequest("http://localhost/api/deposits", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": "1",
        },
        body: JSON.stringify({
          amount: 0.01,
          currency: "BTC",
        }),
      })

      // Act
      const response = await createDeposit(req)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.status).toBe("success")
      expect(data.data).toHaveProperty("depositId")
      expect(data.data).toHaveProperty("paymentUrl")
      expect(data.data).toHaveProperty("qrCode")
      expect(data.data).toHaveProperty("expiresAt")
      expect(Client.init).toHaveBeenCalled()
      expect(resources.Charge.create).toHaveBeenCalled()
      expect(db.insert).toHaveBeenCalled()
    })

    it("should return 400 for invalid amount", async () => {
      // Arrange
      req = new NextRequest("http://localhost/api/deposits", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": "1",
        },
        body: JSON.stringify({
          amount: -0.01, // Negative amount
          currency: "BTC",
        }),
      })

      // Act
      const response = await createDeposit(req)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(data).toHaveProperty("error")
    })

    it("should return 400 for unsupported currency", async () => {
      // Arrange
      req = new NextRequest("http://localhost/api/deposits", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": "1",
        },
        body: JSON.stringify({
          amount: 0.01,
          currency: "XYZ", // Unsupported currency
        }),
      })

      // Act
      const response = await createDeposit(req)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(data).toHaveProperty("error")
    })

    it("should return 401 if user is not authenticated", async () => {
      // Arrange
      req = new NextRequest("http://localhost/api/deposits", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // No x-user-id header
        },
        body: JSON.stringify({
          amount: 0.01,
          currency: "BTC",
        }),
      })

      // Act
      const response = await createDeposit(req)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(401)
      expect(data).toHaveProperty("error")
    })
  })

  describe("GET /api/deposits", () => {
    it("should fetch user deposits successfully", async () => {
      // Arrange
      req = new NextRequest("http://localhost/api/deposits", {
        method: "GET",
        headers: {
          "x-user-id": "1",
        },
      })

      // Act
      const response = await getDeposits(req)
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
      req = new NextRequest("http://localhost/api/deposits", {
        method: "GET",
        headers: {
          // No x-user-id header
        },
      })

      // Act
      const response = await getDeposits(req)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(401)
      expect(data).toHaveProperty("error")
    })
  })
})
