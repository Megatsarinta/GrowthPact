import { POST } from "@/app/api/auth/2fa/setup/route"
import { db } from "@/lib/db"
import { generateTOTPSecret } from "@/lib/auth/two-factor"
import { verifyJwtToken } from "@/lib/auth/jwt"
import { cookies } from "next/headers"
import { NextRequest } from "next/server"

describe("POST /api/auth/2fa/setup", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("should set up 2FA successfully", async () => {
    // Arrange
    // Mock authenticated user
    jest.spyOn(cookies(), "get").mockReturnValueOnce({ value: "valid_token" })

    const verifyJwtTokenMock = jest.spyOn(verifyJwtToken as jest.Mock, "mockResolvedValueOnce").mockResolvedValueOnce({
      userId: 1,
      email: "test@example.com",
      role: "user",
    })

    // Mock user data
    const dbSelectMock = jest.spyOn(db, "select").mockReturnValueOnce({
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

    const generateTOTPSecretMock = jest.spyOn(generateTOTPSecret, "mockResolvedValue").mockResolvedValue({
      secret: "test_secret",
      otpauthUrl: "otpauth://test",
    })

    const qrCodeDataURL = "data:image/png;base64,mockQRCode"
    const generateQRCodeDataURLMock = jest.fn().mockResolvedValue(qrCodeDataURL)

    const request = new NextRequest("http://localhost:3000/api/auth/2fa/setup", {
      method: "POST",
    })

    // Act
    const response = await POST(request)
    const responseData = await response.json()

    // Assert
    expect(response.status).toBe(200)
    expect(responseData).toHaveProperty("message", "Two-factor authentication setup initiated")
    expect(responseData).toHaveProperty("qrCodeDataURL", "data:image/png;base64,mockQRCode")

    expect(verifyJwtTokenMock).toHaveBeenCalledWith("valid_token")
    expect(generateTOTPSecretMock).toHaveBeenCalledWith("test@example.com")
    expect(db.update).toHaveBeenCalled()
    expect(db.set).toHaveBeenCalledWith({ twoFactorSecret: "test_secret" })
  })

  it("should return 401 if not authenticated", async () => {
    // Arrange
    // Mock no token
    jest.spyOn(cookies(), "get").mockReturnValueOnce(undefined)

    const request = new NextRequest("http://localhost:3000/api/auth/2fa/setup", {
      method: "POST",
    })

    // Act
    const response = await POST(request)
    const responseData = await response.json()

    // Assert
    expect(response.status).toBe(401)
    expect(responseData).toHaveProperty("error", "Authentication required")
    expect(verifyJwtToken).not.toHaveBeenCalled()
    expect(generateTOTPSecret).not.toHaveBeenCalled()
    expect(db.update).not.toHaveBeenCalled()
  })

  it("should return 401 if token is invalid", async () => {
    // Arrange
    // Mock invalid token
    jest.spyOn(cookies(), "get").mockReturnValueOnce({ value: "invalid_token" })

    const verifyJwtTokenMock = jest
      .spyOn(verifyJwtToken as jest.Mock, "mockRejectedValueOnce")
      .mockRejectedValueOnce(new Error("Invalid token"))

    const request = new NextRequest("http://localhost:3000/api/auth/2fa/setup", {
      method: "POST",
    })

    // Act
    const response = await POST(request)
    const responseData = await response.json()

    // Assert
    expect(response.status).toBe(401)
    expect(responseData).toHaveProperty("error", "Authentication failed")
    expect(verifyJwtTokenMock).toHaveBeenCalledWith("invalid_token")
    expect(generateTOTPSecret).not.toHaveBeenCalled()
    expect(db.update).not.toHaveBeenCalled()
  })

  it("should return 404 if user is not found", async () => {
    // Arrange
    // Mock authenticated user
    jest.spyOn(cookies(), "get").mockReturnValueOnce({ value: "valid_token" })

    const verifyJwtTokenMock = jest.spyOn(verifyJwtToken as jest.Mock, "mockResolvedValueOnce").mockResolvedValueOnce({
      userId: 999,
      email: "nonexistent@example.com",
      role: "user",
    })

    // Mock user not found
    const dbSelectMock = jest.spyOn(db, "select").mockReturnValueOnce({
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([]),
    } as any)

    const request = new NextRequest("http://localhost:3000/api/auth/2fa/setup", {
      method: "POST",
    })

    // Act
    const response = await POST(request)
    const responseData = await response.json()

    // Assert
    expect(response.status).toBe(404)
    expect(responseData).toHaveProperty("error", "User not found")
    expect(verifyJwtTokenMock).toHaveBeenCalledWith("valid_token")
    expect(generateTOTPSecret).not.toHaveBeenCalled()
    expect(db.update).not.toHaveBeenCalled()
  })

  it("should return 400 if 2FA is already enabled", async () => {
    // Arrange
    // Mock authenticated user
    jest.spyOn(cookies(), "get").mockReturnValueOnce({ value: "valid_token" })

    const verifyJwtTokenMock = jest.spyOn(verifyJwtToken as jest.Mock, "mockResolvedValueOnce").mockResolvedValueOnce({
      userId: 1,
      email: "test@example.com",
      role: "user",
    })

    // Mock user with 2FA already enabled
    const dbSelectMock = jest.spyOn(db, "select").mockReturnValueOnce({
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

    const request = new NextRequest("http://localhost:3000/api/auth/2fa/setup", {
      method: "POST",
    })

    // Act
    const response = await POST(request)
    const responseData = await response.json()

    // Assert
    expect(response.status).toBe(400)
    expect(responseData).toHaveProperty("error", "Two-factor authentication is already enabled")
    expect(verifyJwtTokenMock).toHaveBeenCalledWith("valid_token")
    expect(generateTOTPSecret).not.toHaveBeenCalled()
    expect(db.update).not.toHaveBeenCalled()
  })

  it("should handle server errors gracefully", async () => {
    // Arrange
    // Mock authenticated user
    jest.spyOn(cookies(), "get").mockReturnValueOnce({ value: "valid_token" })

    const verifyJwtTokenMock = jest.spyOn(verifyJwtToken as jest.Mock, "mockResolvedValueOnce").mockResolvedValueOnce({
      userId: 1,
      email: "test@example.com",
      role: "user",
    })

    // Mock user data
    const dbSelectMock = jest.spyOn(db, "select").mockReturnValueOnce({
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

    // Mock a server error
    const generateTOTPSecretMock = jest
      .spyOn(generateTOTPSecret as jest.Mock, "mockRejectedValueOnce")
      .mockRejectedValueOnce(new Error("Failed to generate TOTP secret"))

    const request = new NextRequest("http://localhost:3000/api/auth/2fa/setup", {
      method: "POST",
    })

    // Act
    const response = await POST(request)
    const responseData = await response.json()

    // Assert
    expect(response.status).toBe(500)
    expect(responseData).toHaveProperty("error", "Failed to set up two-factor authentication. Please try again later.")
    expect(verifyJwtTokenMock).toHaveBeenCalledWith("valid_token")
    expect(generateTOTPSecretMock).toHaveBeenCalled()
    expect(db.update).not.toHaveBeenCalled()
  })
})
