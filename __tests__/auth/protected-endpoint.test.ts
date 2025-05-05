/**
 * Tests for the protected API endpoint
 */

import { NextRequest } from "next/server"
import { GET } from "@/app/api/protected-example/route"

describe("Protected API Endpoint", () => {
  it("should return data for authenticated users", async () => {
    // Arrange
    const headers = new Headers()
    headers.set("x-user-id", "1")
    headers.set("x-user-email", "test@example.com")
    headers.set("x-user-role", "user")

    const request = new NextRequest("http://localhost:3000/api/protected-example", {
      method: "GET",
      headers,
    })

    // Act
    const response = await GET(request)
    const responseData = await response.json()

    // Assert
    expect(response.status).toBe(200)
    expect(responseData).toHaveProperty("message", "This is a protected endpoint")
    expect(responseData).toHaveProperty("user")
    expect(responseData.user).toHaveProperty("id", "1")
    expect(responseData.user).toHaveProperty("email", "test@example.com")
    expect(responseData.user).toHaveProperty("role", "user")
    expect(responseData).toHaveProperty("timestamp")
  })

  it("should return 401 for unauthenticated users", async () => {
    // Arrange
    const request = new NextRequest("http://localhost:3000/api/protected-example", {
      method: "GET",
    })

    // Act
    const response = await GET(request)
    const responseData = await response.json()

    // Assert
    expect(response.status).toBe(401)
    expect(responseData).toHaveProperty("error", "Authentication required")
  })
})
