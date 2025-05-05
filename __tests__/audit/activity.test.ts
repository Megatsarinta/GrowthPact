import { describe, expect, it, beforeEach, jest } from "@jest/globals"
import { NextRequest } from "next/server"
import { GET } from "@/app/api/dashboard/activity/route"
import { db } from "@/lib/db/client"

// Mock the database client
jest.mock("@/lib/db/client", () => ({
  db: {
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    fn: {
      count: jest.fn(),
    },
  },
}))

// Mock the logger
jest.mock("@/lib/logger", () => ({
  logger: {
    error: jest.fn(),
  },
}))

describe("Activity API", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("should return 401 if user is not authenticated", async () => {
    const request = new NextRequest("http://localhost:3000/api/dashboard/activity")
    const response = await GET(request)
    expect(response.status).toBe(401)
    const data = await response.json()
    expect(data.error).toBe("Unauthorized")
  })

  it("should fetch user activity logs", async () => {
    // Mock the database response
    const mockLogs = [
      {
        id: 1,
        action: "login",
        metadata: JSON.stringify({ device: "mobile" }),
        timestamp: new Date().toISOString(),
        ipAddress: "127.0.0.1",
        userAgent: "Mozilla/5.0",
      },
    ]

    const mockCountResult = [{ count: "1" }]

    // @ts-ignore - Mocking implementation
    db.select.mockImplementation(() => ({
      from: () => ({
        where: () => mockLogs,
      }),
    }))

    // @ts-ignore - Mocking implementation for count query
    db.select.mockImplementationOnce(() => ({
      from: () => ({
        where: () => mockCountResult,
      }),
    }))

    const headers = new Headers()
    headers.set("x-user-id", "1")

    const request = new NextRequest("http://localhost:3000/api/dashboard/activity", {
      headers,
    })

    const response = await GET(request)
    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data.status).toBe("success")
    expect(data.data).toBeDefined()
    expect(data.meta).toBeDefined()
    expect(data.meta.totalCount).toBe(1)
  })

  it("should handle errors gracefully", async () => {
    // Mock the database to throw an error
    // @ts-ignore - Mocking implementation
    db.select.mockImplementation(() => {
      throw new Error("Database error")
    })

    const headers = new Headers()
    headers.set("x-user-id", "1")

    const request = new NextRequest("http://localhost:3000/api/dashboard/activity", {
      headers,
    })

    const response = await GET(request)
    expect(response.status).toBe(500)

    const data = await response.json()
    expect(data.error).toBeDefined()
  })
})
