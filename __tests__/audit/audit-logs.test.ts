import { describe, expect, it, beforeEach, jest } from "@jest/globals"
import { NextRequest } from "next/server"
import { GET } from "@/app/api/admin/audit-logs/route"
import { db } from "@/lib/db/client"

// Mock the database client
jest.mock("@/lib/db/client", () => ({
  db: {
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
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

describe("Admin Audit Logs API", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("should return 403 if user is not an admin", async () => {
    const headers = new Headers()
    headers.set("x-user-role", "user")

    const request = new NextRequest("http://localhost:3000/api/admin/audit-logs", {
      headers,
    })

    const response = await GET(request)
    expect(response.status).toBe(403)
    const data = await response.json()
    expect(data.error).toBe("Unauthorized")
  })

  it("should fetch audit logs for admin users", async () => {
    // Mock the database response
    const mockLogs = [
      {
        id: 1,
        action: "login",
        metadata: JSON.stringify({ device: "mobile" }),
        timestamp: new Date().toISOString(),
        ipAddress: "127.0.0.1",
        userAgent: "Mozilla/5.0",
        user: {
          email: "user@example.com",
          fullName: "Test User",
        },
      },
    ]

    const mockCountResult = [{ count: "1" }]

    // @ts-ignore - Mocking implementation
    db.select.mockImplementation(() => ({
      from: () => ({
        leftJoin: () => ({
          where: () => ({
            orderBy: () => ({
              limit: () => ({
                offset: () => mockLogs,
              }),
            }),
          }),
        }),
      }),
    }))

    // @ts-ignore - Mocking implementation for count query
    db.select.mockImplementationOnce(() => ({
      from: () => ({
        where: () => mockCountResult,
      }),
    }))

    const headers = new Headers()
    headers.set("x-user-role", "admin")

    const request = new NextRequest("http://localhost:3000/api/admin/audit-logs", {
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
    headers.set("x-user-role", "admin")

    const request = new NextRequest("http://localhost:3000/api/admin/audit-logs", {
      headers,
    })

    const response = await GET(request)
    expect(response.status).toBe(500)

    const data = await response.json()
    expect(data.error).toBeDefined()
  })
})
