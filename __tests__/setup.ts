import { createServer } from "http"
import { apiResolver } from "next/dist/server/api-utils/node"
import type { NextApiRequest, NextApiResponse } from "next"
import request from "supertest"
import { jest } from "@jest/globals"

// Helper function to create a test server for Next.js API routes
export function createTestServer(handler: any) {
  const server = createServer((req, res) => {
    return apiResolver(
      req as unknown as NextApiRequest,
      res as unknown as NextApiResponse,
      undefined,
      handler,
      {
        previewModeId: "",
        previewModeEncryptionKey: "",
        previewModeSigningKey: "",
      },
      false,
    )
  })

  return request(server)
}

// Mock database and external services
jest.mock("@/lib/db", () => {
  const mockDb = {
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnValue([]),
    insert: jest.fn().mockReturnThis(),
    values: jest.fn().mockReturnThis(),
    returning: jest.fn().mockResolvedValue([{ id: 1, email: "test@example.com" }]),
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
  }

  return {
    db: mockDb,
  }
})

jest.mock("@/lib/auth/password", () => ({
  hashPassword: jest.fn().mockResolvedValue("hashed_password"),
  verifyPassword: jest.fn().mockResolvedValue(true),
}))

jest.mock("@/lib/auth/jwt", () => ({
  createJwtToken: jest.fn().mockReturnValue("mock_token"),
  createRefreshToken: jest.fn().mockReturnValue("mock_refresh_token"),
  createEmailVerificationToken: jest.fn().mockReturnValue("mock_verification_token"),
  verifyJwtToken: jest.fn().mockResolvedValue({ userId: 1, email: "test@example.com", role: "user" }),
  verifyEmailToken: jest.fn().mockResolvedValue({ userId: 1, email: "test@example.com" }),
}))

jest.mock("@/lib/services/email-service", () => ({
  sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
  sendWelcomeEmail: jest.fn().mockResolvedValue(undefined),
  send2FASetupEmail: jest.fn().mockResolvedValue(undefined),
}))

jest.mock("@/lib/auth/two-factor", () => ({
  generateTOTPSecret: jest.fn().mockResolvedValue({
    secret: "test_secret",
    otpauth_url: "otpauth://totp/InvestSafe:test@example.com?secret=test_secret",
    qrCodeDataURL: "data:image/png;base64,mockQRCode",
  }),
  verifyTOTP: jest.fn().mockReturnValue(true),
}))

jest.mock("next/headers", () => {
  const mockCookieStore = {
    get: jest.fn().mockReturnValue({ value: "mock_token" }),
    set: jest.fn(),
    delete: jest.fn(),
  }

  return {
    cookies: jest.fn().mockReturnValue(mockCookieStore),
  }
})
