import { describe, expect, it, beforeEach, jest } from "@jest/globals"
import { NextRequest } from "next/server"
import { POST } from "@/app/api/account/delete/route"
import { db } from "@/lib/db/client"

// Mock the database client
jest.mock("@/lib/db/client", () => ({
  db: {
    query: {
      users: {
        findFirst: jest.fn(),
      },
    },
    transaction: jest.fn(),
  },
}))

// Mock the logger
jest.mock("@/lib/logger", () => ({
  logger: {
    error: jest.fn(),
  },
}))

// Mock the audit log
jest.mock("@/lib/audit", () => ({
  createAuditLog: jest.fn(),
}))

// Mock the cookies
jest.mock("next/headers", () => ({
  cookies: () => ({
    delete: jest.fn(),
  }),
}))

describe("Account Deletion API", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("should return 401 if user is not authenticated", async () => {
    const request = new NextRequest("http://localhost:3000/api/account/delete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ password: "password123", reason: "Testing" }),
    })

    const response = await POST(request)
    expect(response.status).toBe(401)
    const data = await response.json()
    expect(data.error).toBe("Unauthorized")
  })

  it("should delete user account successfully", async () => {
    // Mock the user query
    // @ts-ignore - Mocking implementation
    db.query.users.findFirst.mockResolvedValue({
      id: 1,
      email: "user@example.com",
      passwordHash: "hashed_password",
    })

    // Mock the transaction
    // @ts-ignore - Mocking implementation
    db.transaction.mockImplementation(async (callback) => {
      await callback({
        update: () => ({
          set: () => ({
            where: jest.fn().mockResolvedValue([]),
          }),
        }),
        delete: () => ({
          where: jest.fn().mockResolvedValue([]),
        }),
      })
    })

    const headers = new Headers()
    headers.set("x-user-id", "1")

    const request = new NextRequest("http://localhost:3000/api/account/delete", {
      method: "POST",
      headers,
      body: JSON.stringify({ password: "password123", reason: "Testing" }),
    })

    const response = await POST(request)
    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data.status).toBe("success")
    expect(data.message).toBe("Account successfully deleted")
  })

  it("should handle errors gracefully", async () => {
    // Mock the user query to throw an error
    // @ts-ignore - Mocking implementation
    db.query.users.findFirst.mockImplementation(() => {
      throw new Error("Database error")
    })

    const headers = new Headers()
    headers.set("x-user-id", "1")

    const request = new NextRequest("http://localhost:3000/api/account/delete", {
      method: "POST",
      headers,
      body: JSON.stringify({ password: "password123", reason: "Testing" }),
    })

    const response = await POST(request)
    expect(response.status).toBe(500)

    const data = await response.json()
    expect(data.error).toBeDefined()
  })
})
