/**
 * Tests for the token refresh API endpoint
 */

import { NextRequest } from "next/server"
import { POST } from "@/app/api/auth/refresh/route"
import { db } from "@/lib/db"
import { createJwtToken } from "@/lib/auth/jwt"
import { cookies } from "next/headers"
import { jest } from "@jest/globals"

// Mock dependencies
jest.mock("@/lib/db", () => ({
  db: {
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue([
      {
        id: 1,
        userId: 1,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day in the future
      },
    ]),
  },
}))

jest.mock("@/lib/auth/jwt", () => ({
  createJwtToken: jest.fn().mockReturnValue("new_token"),
}))

jest.mock("next/headers", () => ({
  cookies: jest.fn().mockReturnValue({
    get: jest.fn().mockReturnValue({ value: "refresh_token" }),
    set: jest.fn(),
  }),
}))

describe("Token Refresh API", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("should refresh token successfully", async () => {
    // Arrange
    const request = new NextRequest("http://localhost:3000/api/auth/refresh", {
      method: "POST",
    })

    // Mock user for the token
    jest.spyOn(db, "select").mockReturnValueOnce({
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([
        {
          id: 1,
          email: "test@example.com",
          role: "user",
        },
      ]),
    } as any)

    // Act
    const response = await POST(request)
    const responseData = await response.json()

    // Assert
    expect(response.status).toBe(200)
    expect(responseData).toHaveProperty("message", "Token refreshed successfully")
    expect(createJwtToken).toHaveBeenCalledWith({
      userId: 1,
      email: "test@example.com",
      role: "user",
    })
    expect(cookies().set).toHaveBeenCalledWith("token", "new_token", expect.any(Object))
  })

  it("should return 400 if refresh token is missing", async () => {
    // Arrange
    const request = new NextRequest("http://localhost:3000/api/auth/refresh", {
      method: "POST",
    })

    // Mock no refresh token
    jest.spyOn(cookies(), "get").mockReturnValueOnce(undefined)

    // Act
    const response = await POST(request)
    const responseData = await response.json()

    // Assert
    expect(response.status).toBe(400)
    expect(responseData).toHaveProperty("error", "Refresh token is required")
    expect(createJwtToken).not.toHaveBeenCalled()
    expect(cookies().set).not.toHaveBeenCalled()
  })

  it("should return 401 if refresh token is invalid", async () => {
    // Arrange
    const request = new NextRequest("http://localhost:3000/api/auth/refresh", {
      method: "POST",
    })

    // Mock invalid refresh token
    jest.spyOn(db, "select").mockReturnValueOnce({
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([]),
    } as any)

    // Act
    const response = await POST(request)
    const responseData = await response.json()

    // Assert
    expect(response.status).toBe(401)
    expect(responseData).toHaveProperty("error", "Invalid or expired refresh token")
    expect(createJwtToken).not.toHaveBeenCalled()
    expect(cookies().set).not.toHaveBeenCalled()
  })

  it("should return 404 if user is not found", async () => {
    // Arrange
    const request = new NextRequest("http://localhost:3000/api/auth/refresh", {
      method: "POST",
    })

    // Mock user not found
    jest
      .spyOn(db, "select")
      .mockReturnValueOnce({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([
          {
            id: 1,
            userId: 999,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          },
        ]),
      } as any)
      .mockReturnValueOnce({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      } as any)

    // Act
    const response = await POST(request)
    const responseData = await response.json()

    // Assert
    expect(response.status).toBe(404)
    expect(responseData).toHaveProperty("error", "User not found")
    expect(createJwtToken).not.toHaveBeenCalled()
    expect(cookies().set).not.toHaveBeenCalled()
  })
})
