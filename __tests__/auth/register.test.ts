import { POST } from "@/app/api/auth/register/route"
import { db } from "@/lib/db"
import { hashPassword } from "@/lib/auth/password"
import { createEmailVerificationToken } from "@/lib/auth/jwt"
import { sendVerificationEmail } from "@/lib/services/email-service"
import { NextRequest } from "next/server"

describe("POST /api/auth/register", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(hashPassword, "hash").mockImplementation(async (password: string) => `hashed_${password}`)
    jest.spyOn(db, "insert").mockImplementation(
      () =>
        ({
          into: jest.fn().mockReturnThis(),
          values: jest.fn().mockReturnThis(),
          returning: jest.fn().mockResolvedValue([{ id: 1 }]),
        }) as any,
    )
    jest.spyOn(createEmailVerificationToken, "createToken").mockReturnValue("mock_verification_token")
    jest.spyOn(sendVerificationEmail, "sendVerificationEmail").mockResolvedValue(undefined)
    jest.spyOn(db, "select").mockReturnValue({
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([]),
    } as any)
  })

  it("should register a new user successfully", async () => {
    // Arrange
    const requestBody = {
      email: "test@example.com",
      password: "Password123!",
      fullName: "Test User",
      phone: "+1234567890",
    }

    const request = new NextRequest("http://localhost:3000/api/auth/register", {
      method: "POST",
      body: JSON.stringify(requestBody),
    })

    // Act
    const response = await POST(request)
    const responseData = await response.json()

    // Assert
    expect(response.status).toBe(201)
    expect(responseData).toHaveProperty(
      "message",
      "Registration successful. Please check your email to verify your account.",
    )
    expect(responseData).toHaveProperty("userId", 1)

    expect(hashPassword.hash).toHaveBeenCalledWith("Password123!")
    expect(db.insert).toHaveBeenCalled()
    expect(createEmailVerificationToken.createToken).toHaveBeenCalledWith(1, "test@example.com")
    expect(sendVerificationEmail.sendVerificationEmail).toHaveBeenCalledWith(
      "test@example.com",
      "mock_verification_token",
    )
  })

  it("should return 400 for invalid input", async () => {
    // Arrange
    const requestBody = {
      email: "invalid-email",
      password: "short",
      fullName: "",
    }

    const request = new NextRequest("http://localhost:3000/api/auth/register", {
      method: "POST",
      body: JSON.stringify(requestBody),
    })

    // Act
    const response = await POST(request)
    const responseData = await response.json()

    // Assert
    expect(response.status).toBe(400)
    expect(responseData).toHaveProperty("error", "Validation failed")
    expect(responseData).toHaveProperty("details")
    expect(hashPassword.hash).not.toHaveBeenCalled()
    expect(db.insert).not.toHaveBeenCalled()
    expect(sendVerificationEmail.sendVerificationEmail).not.toHaveBeenCalled()
  })

  it("should return 409 if user already exists", async () => {
    // Arrange
    const requestBody = {
      email: "existing@example.com",
      password: "Password123!",
      fullName: "Existing User",
    }

    // Mock existing user
    jest.spyOn(db, "select").mockReturnValueOnce({
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([{ id: 2 }]),
    } as any)

    const request = new NextRequest("http://localhost:3000/api/auth/register", {
      method: "POST",
      body: JSON.stringify(requestBody),
    })

    // Act
    const response = await POST(request)
    const responseData = await response.json()

    // Assert
    expect(response.status).toBe(409)
    expect(responseData).toHaveProperty("error", "User with this email already exists")
    expect(hashPassword.hash).not.toHaveBeenCalled()
    expect(db.insert).not.toHaveBeenCalled()
    expect(sendVerificationEmail.sendVerificationEmail).not.toHaveBeenCalled()
  })

  it("should handle server errors gracefully", async () => {
    // Arrange
    const requestBody = {
      email: "test@example.com",
      password: "Password123!",
      fullName: "Test User",
    }

    // Mock a server error
    jest.spyOn(db, "insert").mockImplementationOnce(() => {
      throw new Error("Database error")
    })

    const request = new NextRequest("http://localhost:3000/api/auth/register", {
      method: "POST",
      body: JSON.stringify(requestBody),
    })

    // Act
    const response = await POST(request)
    const responseData = await response.json()

    // Assert
    expect(response.status).toBe(500)
    expect(responseData).toHaveProperty("error", "Registration failed. Please try again later.")
    expect(hashPassword.hash).toHaveBeenCalled()
    expect(sendVerificationEmail.sendVerificationEmail).not.toHaveBeenCalled()
  })
})
