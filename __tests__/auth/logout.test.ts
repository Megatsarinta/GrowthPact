/**
 * Tests for the logout API endpoint
 */

import { NextRequest } from "next/server"
import { POST } from "@/app/api/auth/logout/route"
import { db } from "@/lib/db"
import { cookies } from "next/headers"
import { jest } from "@jest/globals"

// Mock dependencies
jest.mock("@/lib/db", () => ({
  db: {
    delete: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
  },
}))

jest.mock("next/headers", () => ({
  cookies: jest.fn().mockReturnValue({
    get: jest.fn().mockReturnValue({ value: "refresh_token" }),
    delete: jest.fn(),
  }),
}))

describe("Logout API", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("should logout successfully", async () => {
    // Arrange
    const request = new NextRequest("http://localhost:3000/api/auth/logout", {
      method: "POST",
    })

    // Act
    const response = await POST(request)
    const responseData = await response.json()

    // Assert
    expect(response.status).toBe(200)
    expect(responseData).toHaveProperty("message", "Logout successful")
    expect(db.delete).toHaveBeenCalled()
    expect(db.where).toHaveBeenCalled()
    expect(cookies().delete).toHaveBeenCalledTimes(2) // token and refreshToken
  })

  it("should handle logout without refresh token", async () => {
    // Arrange
    const request = new NextRequest("http://localhost:3000/api/auth/logout", {
      method: "POST",
    })

    // Mock no refresh token
    jest.spyOn(cookies(), "get").mockReturnValueOnce(undefined)

    // Act
    const response = await POST(request)
    const responseData = await response.json()

    // Assert
    expect(response.status).toBe(200)
    expect(responseData).toHaveProperty("message", "Logout successful")
    expect(db.delete).not.toHaveBeenCalled()
    expect(cookies().delete).toHaveBeenCalledTimes(2) // token and refreshToken
  })
})
