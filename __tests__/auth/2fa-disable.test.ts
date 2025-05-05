import { POST } from "@/app/api/auth/2fa/disable/route"
import { db } from "@/lib/db"
import { verifyJwtToken } from "@/lib/auth/jwt"
import { cookies } from "next/headers"
import { NextRequest } from "next/server"

describe("POST /api/auth/2fa/disable", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("should disable 2FA successfully", async () => {
    // Arrange
    // Mock authenticated user
    jest.spyOn(cookies(), "get").mockReturnValueOnce({ value: "valid_token" })

    jest.spyOn(verifyJwtToken as jest.Mock, "mockResolvedValueOnce").mockResolvedValueOnce({
      userId: 1,
      email: "test@example.com",
      role: "user",
    })

    // Mock user data
    jest.spyOn(db, "select").mockReturnValueOnce({
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([
        {
          id: 1,
          email: "test@example.com",
          twoFactorEnabled: true,
        },
      ]),
    } as any)

    const request = new NextRequest("http://localhost:3000/api/auth/2fa/disable", {
      method: "POST",
    })

    // Act
    const response = await POST(request)
    const responseData = await response.json()

    // Assert
    expect(response.status).toBe(200)
    expect(responseData).toHaveProperty("message", "Two-factor authentication disabled successfully")

    expect(verifyJwtToken).toHaveBeenCalledWith("valid_token")
    expect(db.update).toHaveBeenCalled()
    expect(db.set).toHaveBeenCalledWith({
      twoFactorEnabled: false,
      twoFactorSecret: null,
    })
  })

  it("should return 401 if not authenticated", async () => {
    // Arrange
    // Mock no token
    jest.spyOn(cookies(), "get").mockReturnValueOnce(undefined)

    const request = new NextRequest("http://localhost:3000/api/auth/2fa/disable", {
      method: "POST",
    })

    // Act
    const response = await POST(request)
    const responseData = await response.json()

    // Assert
    expect(response.status).toBe(401)
    expect(responseData).toHaveProperty("error", "Authentication required")
    expect(verifyJwtToken).not.toHaveBeenCalled()
    expect(db.update).not.toHaveBeenCalled()
  })

  it("should return 401 if token is invalid", async () => {
    // Arrange
    // Mock invalid token
    jest.spyOn(cookies(), "get").mockReturnValueOnce({ value: "invalid_token" })

    jest.spyOn(verifyJwtToken as jest.Mock, "mockRejectedValueOnce").mockRejectedValueOnce(new Error("Invalid token"))

    const request = new NextRequest("http://localhost:3000/api/auth/2fa/disable", {
      method: "POST",
    })

    // Act
    const response = await POST(request)
    const responseData = await response.json()

    // Assert
    expect(response.status).toBe(401)
    expect(responseData).toHaveProperty("error", "Authentication failed")
    expect(verifyJwtToken).toHaveBeenCalledWith("invalid_token")
    expect(db.update).not.toHaveBeenCalled()
  })

  it("should return 404 if user is not found", async () => {
    // Arrange
    // Mock authenticated user
    jest.spyOn(cookies(), "get").mockReturnValueOnce({ value: "valid_token" })

    jest.spyOn(verifyJwtToken as jest.Mock, "mockResolvedValueOnce").mockResolvedValueOnce({
      userId: 999,
      email: "nonexistent@example.com",
      role: "user",
    })

    // Mock user not found
    jest.spyOn(db, "select").mockReturnValueOnce({
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([]),
    } as any)

    const request = new NextRequest("http://localhost:3000/api/auth/2fa/disable", {
      method: "POST",
    })

    // Act
    const response = await POST(request)
    const responseData = await response.json()

    // Assert
    expect(response.status).toBe(404)
    expect(responseData).toHaveProperty("error", "User not found")
    expect(verifyJwtToken).toHaveBeenCalledWith("valid_token")
    expect(db.update).not.toHaveBeenCalled()
  })

  it("should return 400 if 2FA is not enabled", async () => {
    // Arrange
    // Mock authenticated user
    jest.spyOn(cookies(), "get").mockReturnValueOnce({ value: "valid_token" })

    jest.spyOn(verifyJwtToken as jest.Mock, "mockResolvedValueOnce").mockResolvedValueOnce({
      userId: 1,
      email: "test@example.com",
      role: "user",
    })

    // Mock user with 2FA not enabled
    jest.spyOn(db, "select").mockReturnValueOnce({
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([
        {
          id: 1,
          email: "test@example.com",
          twoFactorEnabled: false,
        },
      ]),
    } as any)

    const request = new NextRequest("http://localhost:3000/api/auth/2fa/disable", {
      method: "POST",
    })

    // Act
    const response = await POST(request)
    const responseData = await response.json()

    // Assert
    expect(response.status).toBe(400)
    expect(responseData).toHaveProperty("error", "Two-factor authentication is not enabled")
    expect(verifyJwtToken).toHaveBeenCalledWith("valid_token")
    expect(db.update).not.toHaveBeenCalled()
  })

  it("should handle server errors gracefully", async () => {
    // Arrange
    // Mock authenticated user
    jest.spyOn(cookies(), "get").mockReturnValueOnce({ value: "valid_token" })

    jest.spyOn(verifyJwtToken as jest.Mock, "mockResolvedValueOnce").mockResolvedValueOnce({
      userId: 1,
      email: "test@example.com",
      role: "user",
    })

    // Mock user data
    jest.spyOn(db, "select").mockReturnValueOnce({
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([
        {
          id: 1,
          email: "test@example.com",
          twoFactorEnabled: true,
        },
      ]),
    } as any)

    // Mock a server error
    jest.spyOn(db, "update").mockImplementationOnce(() => {
      throw new Error("Database error")
    })

    const request = new NextRequest("http://localhost:3000/api/auth/2fa/disable", {
      method: "POST",
    })

    // Act
    const response = await POST(request)
    const responseData = await response.json()

    // Assert
    expect(response.status).toBe(500)
    expect(responseData).toHaveProperty("error", "Failed to disable two-factor authentication. Please try again later.")
    expect(verifyJwtToken).toHaveBeenCalledWith("valid_token")
    expect(db.update).toHaveBeenCalled()
  })
})
