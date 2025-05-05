import { POST } from "@/app/api/auth/login/route"
import { db } from "@/lib/db"
import { verifyPassword } from "@/lib/auth/password"
import { createJwtToken, createRefreshToken } from "@/lib/auth/jwt"
import { cookies } from "next/headers"
import { NextRequest } from "next/server"

describe("POST /api/auth/login", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(verifyPassword).mockClear()
    jest.spyOn(createJwtToken).mockClear()
    jest.spyOn(createRefreshToken).mockClear()
    jest.spyOn(db, "insert").mockClear()
    jest.spyOn(cookies(), "set").mockClear()
  })

  it("should login a user successfully", async () => {
    // Arrange
    const requestBody = {
      email: "test@example.com",
      password: "Password123!",
    }

    // Mock user data
    jest.spyOn(db, "select").mockReturnValueOnce({
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([
        {
          id: 1,
          email: "test@example.com",
          passwordHash: "hashed_password",
          isVerified: true,
          role: "user",
          twoFactorEnabled: false,
        },
      ]),
    } as any)

    jest.spyOn(verifyPassword, "mockImplementation").mockResolvedValue(true)
    jest.spyOn(createJwtToken, "mockImplementation").mockReturnValue("jwt_token")
    jest.spyOn(createRefreshToken, "mockImplementation").mockReturnValue("refresh_token")
    jest.spyOn(db, "insert").mockResolvedValue({} as any)
    jest.spyOn(cookies(), "set").mockImplementation(() => {
      return
    })

    const request = new NextRequest("http://localhost:3000/api/auth/login", {
      method: "POST",
      body: JSON.stringify(requestBody),
    })

    // Act
    const response = await POST(request)
    const responseData = await response.json()

    // Assert
    expect(response.status).toBe(200)
    expect(responseData).toHaveProperty("message", "Login successful")
    expect(responseData).toHaveProperty("user")
    expect(responseData.user).toHaveProperty("id", 1)
    expect(responseData.user).toHaveProperty("email", "test@example.com")

    expect(verifyPassword).toHaveBeenCalledWith("Password123!", "hashed_password")
    expect(createJwtToken).toHaveBeenCalledWith({
      userId: 1,
      email: "test@example.com",
      role: "user",
    })
    expect(createRefreshToken).toHaveBeenCalledWith(1)
    expect(db.insert).toHaveBeenCalled() // For refresh token
    expect(cookies().set).toHaveBeenCalledTimes(2) // token and refreshToken
  })

  it("should return 400 for invalid input", async () => {
    // Arrange
    const requestBody = {
      email: "invalid-email",
      password: "",
    }

    const request = new NextRequest("http://localhost:3000/api/auth/login", {
      method: "POST",
      body: JSON.stringify(requestBody),
    })

    // Act
    const response = await POST(request)
    const responseData = await response.json()

    // Assert
    expect(response.status).toBe(400)
    expect(responseData).toHaveProperty("error", "Validation failed")
    expect(verifyPassword).not.toHaveBeenCalled()
    expect(createJwtToken).not.toHaveBeenCalled()
    expect(cookies().set).not.toHaveBeenCalled()
  })

  it("should return 401 for invalid credentials", async () => {
    // Arrange
    const requestBody = {
      email: "test@example.com",
      password: "WrongPassword123!",
    }

    // Mock user data
    jest.spyOn(db, "select").mockReturnValueOnce({
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([
        {
          id: 1,
          email: "test@example.com",
          passwordHash: "hashed_password",
          isVerified: true,
          role: "user",
          twoFactorEnabled: false,
        },
      ]),
    } as any)

    jest.spyOn(verifyPassword, "mockImplementation").mockResolvedValue(false)

    const request = new NextRequest("http://localhost:3000/api/auth/login", {
      method: "POST",
      body: JSON.stringify(requestBody),
    })

    // Act
    const response = await POST(request)
    const responseData = await response.json()

    // Assert
    expect(response.status).toBe(401)
    expect(responseData).toHaveProperty("error", "Invalid email or password")
    expect(verifyPassword).toHaveBeenCalledWith("WrongPassword123!", "hashed_password")
    expect(createJwtToken).not.toHaveBeenCalled()
    expect(cookies().set).not.toHaveBeenCalled()
  })

  it("should return 403 if email is not verified", async () => {
    // Arrange
    const requestBody = {
      email: "unverified@example.com",
      password: "Password123!",
    }

    // Mock unverified user
    jest.spyOn(db, "select").mockReturnValueOnce({
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([
        {
          id: 2,
          email: "unverified@example.com",
          passwordHash: "hashed_password",
          isVerified: false,
          role: "user",
          twoFactorEnabled: false,
        },
      ]),
    } as any)

    jest.spyOn(verifyPassword, "mockImplementation").mockResolvedValue(true)

    const request = new NextRequest("http://localhost:3000/api/auth/login", {
      method: "POST",
      body: JSON.stringify(requestBody),
    })

    // Act
    const response = await POST(request)
    const responseData = await response.json()

    // Assert
    expect(response.status).toBe(403)
    expect(responseData).toHaveProperty("error", "Please verify your email before logging in")
    expect(verifyPassword).toHaveBeenCalled()
    expect(createJwtToken).not.toHaveBeenCalled()
    expect(cookies().set).not.toHaveBeenCalled()
  })

  it("should require 2FA if enabled", async () => {
    // Arrange
    const requestBody = {
      email: "2fa@example.com",
      password: "Password123!",
    }

    // Mock user with 2FA enabled
    jest.spyOn(db, "select").mockReturnValueOnce({
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([
        {
          id: 3,
          email: "2fa@example.com",
          passwordHash: "hashed_password",
          isVerified: true,
          role: "user",
          twoFactorEnabled: true,
          twoFactorSecret: "secret",
        },
      ]),
    } as any)

    jest.spyOn(verifyPassword, "mockImplementation").mockResolvedValue(true)
    jest.spyOn(createJwtToken, "mockImplementation").mockReturnValue("temp_token")

    const request = new NextRequest("http://localhost:3000/api/auth/login", {
      method: "POST",
      body: JSON.stringify(requestBody),
    })

    // Act
    const response = await POST(request)
    const responseData = await response.json()

    // Assert
    expect(response.status).toBe(200)
    expect(responseData).toHaveProperty("message", "2FA verification required")
    expect(responseData).toHaveProperty("requiresTwoFactor", true)
    expect(responseData).toHaveProperty("tempToken", "temp_token")

    expect(verifyPassword).toHaveBeenCalled()
    expect(createJwtToken).toHaveBeenCalledWith(
      {
        userId: 3,
        email: "2fa@example.com",
        role: "user",
        twoFactorVerified: false,
      },
      "5m",
    )
    expect(cookies().set).not.toHaveBeenCalled()
  })

  it("should handle server errors gracefully", async () => {
    // Arrange
    const requestBody = {
      email: "test@example.com",
      password: "Password123!",
    }

    // Mock a server error
    jest.spyOn(db, "select").mockImplementationOnce(() => {
      throw new Error("Database error")
    })

    const request = new NextRequest("http://localhost:3000/api/auth/login", {
      method: "POST",
      body: JSON.stringify(requestBody),
    })

    // Act
    const response = await POST(request)
    const responseData = await response.json()

    // Assert
    expect(response.status).toBe(500)
    expect(responseData).toHaveProperty("error", "Login failed. Please try again later.")
    expect(verifyPassword).not.toHaveBeenCalled()
    expect(createJwtToken).not.toHaveBeenCalled()
    expect(cookies().set).not.toHaveBeenCalled()
  })
})
