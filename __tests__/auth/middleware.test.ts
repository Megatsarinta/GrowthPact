/**
 * Tests for the authentication middleware
 */

import { NextRequest, NextResponse } from "next/server"
import { middleware } from "@/middleware"
import { verifyJwtToken } from "@/lib/auth/jwt"
import { jest } from "@jest/globals"

// Mock dependencies
jest.mock("@/lib/auth/jwt", () => ({
  verifyJwtToken: jest.fn(),
}))

jest.mock("next/server", () => {
  const originalModule = jest.requireActual("next/server")
  return {
    ...originalModule,
    NextResponse: {
      ...originalModule.NextResponse,
      next: jest.fn().mockReturnValue({ status: 200 }),
      redirect: jest.fn().mockReturnValue({ status: 302 }),
      json: jest.fn().mockReturnValue({ status: 403 }),
    },
  }
})

describe("Authentication Middleware", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("should allow access to protected routes with valid token", async () => {
    // Arrange
    const headers = new Headers()
    const cookies = new Map([["token", "valid_token"]])

    const request = new NextRequest("http://localhost:3000/dashboard", {
      method: "GET",
      headers,
    })

    // Mock cookies
    Object.defineProperty(request, "cookies", {
      get: jest.fn().mockReturnValue({
        get: jest.fn().mockImplementation((name) => ({ value: cookies.get(name) })),
        getAll: jest.fn().mockReturnValue([...cookies.entries()].map(([name, value]) => ({ name, value }))),
      }),
    })(
      // Mock token verification
      verifyJwtToken as jest.Mock,
    ).mockResolvedValueOnce({
      userId: 1,
      email: "test@example.com",
      role: "user",
    })

    // Act
    await middleware(request)

    // Assert
    expect(verifyJwtToken).toHaveBeenCalledWith("valid_token")
    expect(NextResponse.next).toHaveBeenCalled()
  })

  it("should redirect to login for protected routes without token", async () => {
    // Arrange
    const headers = new Headers()

    const request = new NextRequest("http://localhost:3000/dashboard", {
      method: "GET",
      headers,
    })

    // Mock empty cookies
    Object.defineProperty(request, "cookies", {
      get: jest.fn().mockReturnValue({
        get: jest.fn().mockReturnValue(undefined),
        getAll: jest.fn().mockReturnValue([]),
      }),
    })

    // Act
    await middleware(request)

    // Assert
    expect(verifyJwtToken).not.toHaveBeenCalled()
    expect(NextResponse.redirect).toHaveBeenCalledWith(expect.any(URL))
  })

  it("should return 403 for admin routes with non-admin user", async () => {
    // Arrange
    const headers = new Headers()
    const cookies = new Map([["token", "valid_token"]])

    const request = new NextRequest("http://localhost:3000/admin/dashboard", {
      method: "GET",
      headers,
    })

    // Mock cookies
    Object.defineProperty(request, "cookies", {
      get: jest.fn().mockReturnValue({
        get: jest.fn().mockImplementation((name) => ({ value: cookies.get(name) })),
        getAll: jest.fn().mockReturnValue([...cookies.entries()].map(([name, value]) => ({ name, value }))),
      }),
    })(
      // Mock token verification for non-admin user
      verifyJwtToken as jest.Mock,
    ).mockResolvedValueOnce({
      userId: 1,
      email: "test@example.com",
      role: "user",
    })

    // Act
    await middleware(request)

    // Assert
    expect(verifyJwtToken).toHaveBeenCalledWith("valid_token")
    expect(NextResponse.json).toHaveBeenCalledWith(
      { error: "Insufficient permissions" },
      { status: 403, headers: { "Content-Type": "application/json" } },
    )
  })

  it("should allow access to admin routes with admin user", async () => {
    // Arrange
    const headers = new Headers()
    const cookies = new Map([["token", "valid_token"]])

    const request = new NextRequest("http://localhost:3000/admin/dashboard", {
      method: "GET",
      headers,
    })

    // Mock cookies
    Object.defineProperty(request, "cookies", {
      get: jest.fn().mockReturnValue({
        get: jest.fn().mockImplementation((name) => ({ value: cookies.get(name) })),
        getAll: jest.fn().mockReturnValue([...cookies.entries()].map(([name, value]) => ({ name, value }))),
      }),
    })(
      // Mock token verification for admin user
      verifyJwtToken as jest.Mock,
    ).mockResolvedValueOnce({
      userId: 1,
      email: "admin@example.com",
      role: "admin",
    })

    // Act
    await middleware(request)

    // Assert
    expect(verifyJwtToken).toHaveBeenCalledWith("valid_token")
    expect(NextResponse.next).toHaveBeenCalled()
  })
})
