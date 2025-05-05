import { POST } from "@/app/api/auth/2fa/verify/route"
import { db } from "@/lib/db"
import { verifyTOTP } from "@/lib/auth/two-factor"
import { verifyJwtToken, createJwtToken } from "@/lib/auth/jwt"
import { send2FASetupEmail } from "@/lib/services/email-service"
import { cookies } from "next/headers"
import { NextRequest } from "next/server"

describe("POST /api/auth/2fa/verify", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("should verify 2FA login successfully", async () => {
    // Arrange
    const requestBody = {
      token: "123456",
      tempToken: "temp_token",
    }

    // Mock temp token verification
    const verifyJwtTokenMock = jest.spyOn(verifyJwtToken as any, "mockResolvedValueOnce")
    verifyJwtTokenMock.mockResolvedValueOnce({
      userId: 1,
      email: "test@example.com",
      role: "user",
      twoFactorVerified: false,
    })

    // Mock user data
    const dbSelectMock = jest.spyOn(db, "select").mockReturnValue({
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([
        {
          id: 1,
          email: "test@example.com",
          role: "user",
          twoFactorSecret: "secret",
        },
      ]),
    } as any)

    // Mock new token creation
    const createJwtTokenMock = jest.spyOn(createJwtToken as any, "mockReturnValueOnce")
    createJwtTokenMock.mockReturnValueOnce("new_token")

    const request = new NextRequest("http://localhost:3000/api/auth/2fa/verify", {
      method: "POST",
      body: JSON.stringify(requestBody),
    })

    // Mock cookies
    const cookiesSetMock = jest.spyOn(cookies(), "set")

    // Mock TOTP verification
    const verifyTOTPMock = jest.spyOn(verifyTOTP as any, "mockReturnValue")
    verifyTOTPMock.mockReturnValue(true)

    // Act
    const response = await POST(request)
    const responseData = await response.json()

    // Assert
    expect(response.status).toBe(200)
    expect(responseData).toHaveProperty("message", "2FA verification successful")
    expect(responseData).toHaveProperty("user")
    expect(responseData.user).toHaveProperty("id", 1)
    expect(responseData.user).toHaveProperty("email", "test@example.com")

    expect(verifyJwtToken).toHaveBeenCalledWith("temp_token")
    expect(verifyTOTP).toHaveBeenCalledWith("123456", "secret")
    expect(createJwtToken).toHaveBeenCalledWith({
      userId: 1,
      email: "test@example.com",
      role: "user",
      twoFactorVerified: true,
    })
    expect(cookiesSetMock).toHaveBeenCalledWith("token", "new_token", expect.any(Object))
  })

  it("should enable 2FA setup successfully", async () => {
    // Arrange
    const requestBody = {
      token: "123456",
    }

    // Mock authenticated user
    const cookiesGetMock = jest.spyOn(cookies(), "get").mockReturnValueOnce({ value: "valid_token" } as any)

    const verifyJwtTokenMock = jest.spyOn(verifyJwtToken as any, "mockResolvedValueOnce")
    verifyJwtTokenMock.mockResolvedValueOnce({
      userId: 1,
      email: "test@example.com",
      role: "user",
    })

    // Mock user data
    const dbSelectMock = jest.spyOn(db, "select").mockReturnValue({
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([
        {
          id: 1,
          email: "test@example.com",
          twoFactorSecret: "secret",
          twoFactorEnabled: false,
        },
      ]),
    } as any)

    const request = new NextRequest("http://localhost:3000/api/auth/2fa/verify", {
      method: "POST",
      body: JSON.stringify(requestBody),
    })

    // Mock TOTP verification
    const verifyTOTPMock = jest.spyOn(verifyTOTP as any, "mockReturnValue")
    verifyTOTPMock.mockReturnValue(true)

    // Mock db update
    const dbUpdateMock = jest.spyOn(db, "update").mockReturnValue({
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      returning: jest.fn().mockResolvedValue([]),
    } as any)

    const send2FASetupEmailMock = jest.spyOn(send2FASetupEmail as any, "mockResolvedValue")

    // Act
    const response = await POST(request)
    const responseData = await response.json()

    // Assert
    expect(response.status).toBe(200)
    expect(responseData).toHaveProperty("message", "Two-factor authentication enabled successfully")

    expect(verifyJwtToken).toHaveBeenCalledWith("valid_token")
    expect(verifyTOTP).toHaveBeenCalledWith("123456", "secret")
    expect(db.update).toHaveBeenCalled()
    expect(dbUpdateMock.mock.calls[0][0]).toEqual({ twoFactorEnabled: true })
    expect(send2FASetupEmail).toHaveBeenCalledWith("test@example.com")
  })

  it("should return 400 for invalid input", async () => {
    // Arrange
    const requestBody = {
      token: "",
    }

    const request = new NextRequest("http://localhost:3000/api/auth/2fa/verify", {
      method: "POST",
      body: JSON.stringify(requestBody),
    })

    // Act
    const response = await POST(request)
    const responseData = await response.json()

    // Assert
    expect(response.status).toBe(400)
    expect(responseData).toHaveProperty("error", "Validation failed")
    expect(verifyJwtToken).not.toHaveBeenCalled()
    expect(verifyTOTP).not.toHaveBeenCalled()
    expect(db.update).not.toHaveBeenCalled()
  })

  it("should return 401 for invalid verification code during login", async () => {
    // Arrange
    const requestBody = {
      token: "123456",
      tempToken: "temp_token",
    }

    // Mock temp token verification
    const verifyJwtTokenMock = jest.spyOn(verifyJwtToken as any, "mockResolvedValueOnce")
    verifyJwtTokenMock.mockResolvedValueOnce({
      userId: 1,
      email: "test@example.com",
      role: "user",
      twoFactorVerified: false,
    })

    // Mock user data
    const dbSelectMock = jest.spyOn(db, "select").mockReturnValue({
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([
        {
          id: 1,
          email: "test@example.com",
          role: "user",
          twoFactorSecret: "secret",
        },
      ]),
    } as any)

    // Mock TOTP verification failure
    const verifyTOTPMock = jest.spyOn(verifyTOTP as any, "mockReturnValue")
    verifyTOTPMock.mockReturnValue(false)

    const request = new NextRequest("http://localhost:3000/api/auth/2fa/verify", {
      method: "POST",
      body: JSON.stringify(requestBody),
    })

    // Mock cookies
    const cookiesSetMock = jest.spyOn(cookies(), "set")

    // Act
    const response = await POST(request)
    const responseData = await response.json()

    // Assert
    expect(response.status).toBe(401)
    expect(responseData).toHaveProperty("error", "Invalid verification code")
    expect(verifyJwtToken).toHaveBeenCalledWith("temp_token")
    expect(verifyTOTP).toHaveBeenCalledWith("123456", "secret")
    expect(createJwtToken).not.toHaveBeenCalled()
    expect(cookiesSetMock).not.toHaveBeenCalled()
  })

  it("should return 401 for invalid verification code during setup", async () => {
    // Arrange
    const requestBody = {
      token: "123456",
    }

    // Mock authenticated user
    const cookiesGetMock = jest.spyOn(cookies(), "get").mockReturnValueOnce({ value: "valid_token" } as any)

    const verifyJwtTokenMock = jest.spyOn(verifyJwtToken as any, "mockResolvedValueOnce")
    verifyJwtTokenMock.mockResolvedValueOnce({
      userId: 1,
      email: "test@example.com",
      role: "user",
    })

    // Mock user data
    const dbSelectMock = jest.spyOn(db, "select").mockReturnValue({
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([
        {
          id: 1,
          email: "test@example.com",
          twoFactorSecret: "secret",
          twoFactorEnabled: false,
        },
      ]),
    } as any)

    // Mock TOTP verification failure
    const verifyTOTPMock = jest.spyOn(verifyTOTP as any, "mockReturnValue")
    verifyTOTPMock.mockReturnValue(false)

    const request = new NextRequest("http://localhost:3000/api/auth/2fa/verify", {
      method: "POST",
      body: JSON.stringify(requestBody),
    })

    // Act
    const response = await POST(request)
    const responseData = await response.json()

    // Assert
    expect(response.status).toBe(401)
    expect(responseData).toHaveProperty("error", "Invalid verification code")
    expect(verifyJwtToken).toHaveBeenCalledWith("valid_token")
    expect(verifyTOTP).toHaveBeenCalledWith("123456", "secret")
    expect(db.update).not.toHaveBeenCalled()
    expect(send2FASetupEmail).not.toHaveBeenCalled()
  })

  it("should handle server errors gracefully", async () => {
    // Arrange
    const requestBody = {
      token: "123456",
      tempToken: "temp_token",
    }

    // Mock a server error
    const verifyJwtTokenMock = jest.spyOn(verifyJwtToken as any, "mockImplementationOnce")
    verifyJwtTokenMock.mockImplementationOnce(() => {
      throw new Error("Server error")
    })

    const request = new NextRequest("http://localhost:3000/api/auth/2fa/verify", {
      method: "POST",
      body: JSON.stringify(requestBody),
    })

    // Act
    const response = await POST(request)
    const responseData = await response.json()

    // Assert
    expect(response.status).toBe(500)
    expect(responseData).toHaveProperty("error", "Verification failed. Please try again later.")
    expect(verifyJwtToken).toHaveBeenCalled()
    expect(verifyTOTP).not.toHaveBeenCalled()
    expect(db.update).not.toHaveBeenCalled()
  })
})
