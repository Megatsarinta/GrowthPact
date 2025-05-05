import { GET } from "@/app/api/auth/me/route"
import { db } from "@/lib/db"
import { NextRequest } from "next/server"

describe("GET /api/auth/me", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("should return user profile successfully", async () => {
    // Arrange
    const headers = new Headers()
    headers.set("x-user-id", "1")

    // Mock user data
    jest.spyOn(db, "select").mockReturnValueOnce({
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([
        {
          id: 1,
          email: "test@example.com",
          fullName: "Test User",
          phone: "+1234567890",
          role: "user",
          isVerified: true,
          twoFactorEnabled: false,
          balanceInr: "1000.00",
          referralCode: "ABC123",
          createdAt: new Date("2023-01-01"),
        },
      ]),
    } as any)

    const request = new NextRequest("http://localhost:3000/api/auth/me", {
      method: "GET",
      headers,
    })

    // Act
    const response = await GET(request)
    const responseData = await response.json()

    // Assert
    expect(response.status).toBe(200)
    expect(responseData).toHaveProperty("user")
    expect(responseData.user).toHaveProperty("id", 1)
    expect(responseData.user).toHaveProperty("email", "test@example.com")
    expect(responseData.user).toHaveProperty("fullName", "Test User")
    expect(responseData.user).toHaveProperty("phone", "+1234567890")
    expect(responseData.user).toHaveProperty("role", "user")
    expect(responseData.user).toHaveProperty("isVerified", true)
    expect(responseData.user).toHaveProperty("twoFactorEnabled", false)
    expect(responseData.user).toHaveProperty("balanceInr", "1000.00")
    expect(responseData.user).toHaveProperty("referralCode", "ABC123")
    expect(responseData.user).toHaveProperty("createdAt")

    expect(db.select).toHaveBeenCalled()
    expect(db.where).toHaveBeenCalledWith(expect.anything())
  })

  it("should return 401 if user ID is missing", async () => {
    // Arrange
    const request = new NextRequest("http://localhost:3000/api/auth/me", {
      method: "GET",
    })

    // Act
    const response = await GET(request)
    const responseData = await response.json()

    // Assert
    expect(response.status).toBe(401)
    expect(responseData).toHaveProperty("error", "Authentication required")
    expect(db.select).not.toHaveBeenCalled()
  })

  it("should return 404 if user is not found", async () => {
    // Arrange
    const headers = new Headers()
    headers.set("x-user-id", "999")

    // Mock user not found
    jest.spyOn(db, "select").mockReturnValueOnce({
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([]),
    } as any)

    const request = new NextRequest("http://localhost:3000/api/auth/me", {
      method: "GET",
      headers,
    })

    // Act
    const response = await GET(request)
    const responseData = await response.json()

    // Assert
    expect(response.status).toBe(404)
    expect(responseData).toHaveProperty("error", "User not found")
    expect(db.select).toHaveBeenCalled()
  })

  it("should handle server errors gracefully", async () => {
    // Arrange
    const headers = new Headers()
    headers.set("x-user-id", "1")

    // Mock a server error
    jest.spyOn(db, "select").mockImplementationOnce(() => {
      throw new Error("Database error")
    })

    const request = new NextRequest("http://localhost:3000/api/auth/me", {
      method: "GET",
      headers,
    })

    // Act
    const response = await GET(request)
    const responseData = await response.json()

    // Assert
    expect(response.status).toBe(500)
    expect(responseData).toHaveProperty("error", "Failed to retrieve user profile. Please try again later.")
    expect(db.select).toHaveBeenCalled()
  })
})
