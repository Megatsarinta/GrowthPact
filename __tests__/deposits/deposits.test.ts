import { describe, expect, it, jest, beforeEach } from "@jest/globals"
import { NextRequest } from "next/server"
import { POST as createDeposit } from "@/app/api/deposits/route"
import { POST as handleWebhook } from "@/app/api/webhooks/coinbase/route"
import { db } from "@/lib/db/client"
import { addJob } from "@/lib/queue/client"
import crypto from "crypto"

// Mock dependencies
jest.mock("@/lib/db/client", () => ({
  db: {
    insert: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    values: jest.fn().mockReturnThis(),
    returning: jest.fn().mockResolvedValue([
      {
        id: 1,
        userId: 123,
        currency: "BTC",
        amountCrypto: "0.01",
        status: "pending",
        txReference: "charge_123",
        paymentUrl: "https://commerce.coinbase.com/charges/charge_123",
      },
    ]),
    limit: jest.fn().mockReturnThis(),
  },
  query: {
    deposits: {
      findMany: jest.fn().mockResolvedValue([]),
    },
  },
}))

jest.mock("@/lib/queue/client", () => ({
  addJob: jest.fn().mockResolvedValue({}),
}))

jest.mock("coinbase-commerce-node", () => ({
  Client: {
    init: jest.fn(),
  },
  resources: {
    Charge: {
      create: jest.fn().mockResolvedValue({
        id: "charge_123",
        hosted_url: "https://commerce.coinbase.com/charges/charge_123",
        payment_uri: "bitcoin:address?amount=0.01",
        expires_at: "2023-12-31T23:59:59Z",
      }),
    },
  },
}))

describe("Deposit API", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("should create a deposit and return payment details", async () => {
    const request = new NextRequest("http://localhost/api/deposits", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": "123",
      },
      body: JSON.stringify({
        amount: 0.01,
        currency: "BTC",
      }),
    })

    const response = await createDeposit(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.status).toBe("success")
    expect(data.data).toHaveProperty("paymentUrl")
    expect(data.data).toHaveProperty("qrCode")
    expect(data.data).toHaveProperty("depositId")
  })

  it("should validate deposit request data", async () => {
    const request = new NextRequest("http://localhost/api/deposits", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": "123",
      },
      body: JSON.stringify({
        amount: -1, // Invalid amount
        currency: "BTC",
      }),
    })

    const response = await createDeposit(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data).toHaveProperty("error")
  })

  it("should process a valid Coinbase webhook", async () => {
    const webhookData = {
      event: {
        type: "charge:confirmed",
        data: {
          id: "charge_123",
        },
      },
    }

    // Mock db.select().from().where().limit() to return a deposit
    jest.spyOn(db, "select").mockImplementation(
      () =>
        ({
          from: () => ({
            where: () => ({
              limit: () => [
                {
                  id: 1,
                  userId: 123,
                  amountCrypto: "0.01",
                  currency: "BTC",
                },
              ],
            }),
          }),
        }) as any,
    )

    // Create a valid signature
    const rawBody = JSON.stringify(webhookData)
    const hmac = crypto.createHmac("sha256", "webhook_secret")
    hmac.update(rawBody)
    const signature = hmac.digest("hex")

    const request = new NextRequest("http://localhost/api/webhooks/coinbase", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-cc-webhook-signature": signature,
      },
      body: rawBody,
    })

    // Mock process.env for the webhook secret
    const originalEnv = process.env
    process.env.COINBASE_COMMERCE_WEBHOOK_SECRET = "webhook_secret"

    try {
      const response = await handleWebhook(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.status).toBe("success")
      expect(addJob).toHaveBeenCalledWith("convertCrypto", expect.any(Object))
    } finally {
      process.env = originalEnv
    }
  })
})
