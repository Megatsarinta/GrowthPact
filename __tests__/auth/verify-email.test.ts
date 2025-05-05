import { GET } from "@/app/api/auth/verify-email/route"
import { db } from "@/lib/db"
import { verifyEmailToken } from "@/lib/auth/jwt"
import { sendWelcomeEmail } from "@/lib/services/email-service"
import { NextRequest } from "next/server"

describe("GET /api/auth/verify-email", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("should verify email successfully", async () => {
    // Arrange
    const url = new URL("http://localhost:3000/api/auth/verify-email")
    url.searchParams.set("token", "valid_token")

    // Mock user data
    jest.spyOn(db, "select").mockReturnValueOnce({
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([
        {
          id: 1,
          fullName: "Test User",
          isVerified: false,
        },
      ]),
    } as any)

    const request = new NextRequest(url)

    // Act
    const response = await GET(request)

    // Assert
    expect(response.status).toBe(302) // Redirect
    expect(response.headers.get("Location")).toContain("/auth/login?verified=true")

    expect(verifyEmailToken).toHaveBeenCalledWith("valid_token")
    expect(db.update).toHaveBeenCalled()
    expect(db.set).toHaveBeenCalledWith({ isVerified: true })
    expect(sendWelcomeEmail).toHaveBeenCalledWith("test@example.com", "Test User")
  })

  it("should return 400 if token is missing", async () => {
    // Arrange
    const request = new NextRequest("http://localhost:3000/api/auth/verify-email")

    // Act
    const response = await GET(request)
    const responseData = await response.json()

    // Assert
    expect(response.status).toBe(400)
    expect(responseData).toHaveProperty("error", "Verification token is required")
    expect(verifyEmailToken).not.toHaveBeenCalled()
    expect(db.update).not.toHaveBeenCalled()
    expect(sendWelcomeEmail).not.toHaveBeenCalled()
  })

  it("should return 404 if user is not found", async () => {
    // Arrange
    const url = new URL("http://localhost:3000/api/auth/verify-email")
    url.searchParams.set("token", "valid_token")

    // Mock user not found
    jest.spyOn(db, "select").mockReturnValueOnce({
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([]),
    } as any)

    const request = new NextRequest(url)

    // Act
    const response = await GET(request)
    const responseData = await response.json()

    // Assert
    expect(response.status).toBe(404)
    expect(responseData).toHaveProperty("error", "User not found")
    expect(verifyEmailToken).toHaveBeenCalledWith("valid_token")
    expect(db.update).not.toHaveBeenCalled()
    expect(sendWelcomeEmail).not.toHaveBeenCalled()
  })

  it("should handle already verified emails", async () => {
    // Arrange
    const url = new URL("http://localhost:3000/api/auth/verify-email")
    url.searchParams.set("token", "valid_token")

    // Mock already verified user
    jest.spyOn(db, "select").mockReturnValueOnce({
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([
        {
          id: 1,
          fullName: "Test User",
          isVerified: true,
        },
      ]),
    } as any)

    const request = new NextRequest(url)

    // Act
    const response = await GET(request)
    const responseData = await response.json()

    // Assert
    expect(response.status).toBe(200)
    expect(responseData).toHaveProperty("message", "Email already verified")
    expect(verifyEmailToken).toHaveBeenCalledWith("valid_token")
    expect(db.update).not.toHaveBeenCalled()
    expect(sendWelcomeEmail).not.toHaveBeenCalled()
  })

  it("should redirect to error page on token verification failure", async () => {
    // Arrange
    const url = new URL("http://localhost:3000/api/auth/verify-email")
    url.searchParams.set("token", "invalid_token")

    // Mock token verification failure
    jest.spyOn(verifyEmailToken, "mockRejectedValueOnce").mockRejectedValueOnce(new Error("Invalid token"))

    const request = new NextRequest(url)

    // Act
    const response = await GET(request)

    // Assert
    expect(response.status).toBe(302) // Redirect
    expect(response.headers.get("Location")).toContain("/auth/verify-email-error")
    expect(verifyEmailToken).toHaveBeenCalledWith("invalid_token")
    expect(db.update).not.toHaveBeenCalled()
    expect(sendWelcomeEmail).not.toHaveBeenCalled()
  })
})
