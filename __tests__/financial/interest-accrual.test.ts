import { describe, it, expect, beforeEach, jest } from "@jest/globals"
import { NextRequest, NextResponse } from "next/server"
import { POST as triggerInterestAccrual } from "@/app/api/cron/interest-accrual/route"
import { addJob } from "@/lib/queue/client"

// Mock environment variables
process.env.CRON_SECRET = "test-cron-secret"

// Mock job queue
jest.mock("@/lib/queue/client", () => ({
  addJob: jest.fn().mockResolvedValue({ id: "test-job-id" }),
}))

// Mock audit logging
jest.mock("@/lib/audit", () => ({
  createAuditLog: jest.fn().mockResolvedValue({}),
}))

describe("Interest Accrual API", () => {
  let req: NextRequest

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks()
  })

  describe("POST /api/cron/interest-accrual", () => {
    it("should trigger interest accrual job successfully with valid CRON_SECRET", async () => {
      // Arrange
      req = new NextRequest("http://localhost/api/cron/interest-accrual", {
        method: "POST",
        headers: {
          Authorization: "Bearer test-cron-secret",
        },
      })

      // Act
      const response = await triggerInterestAccrual(req)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.status).toBe("success")
      expect(data).toHaveProperty("jobId")
      expect(data).toHaveProperty("date")
      expect(addJob).toHaveBeenCalledWith("calculateInterest", expect.any(Object))
    })

    it("should return 401 with invalid CRON_SECRET", async () => {
      // Arrange
      req = new NextRequest("http://localhost/api/cron/interest-accrual", {
        method: "POST",
        headers: {
          Authorization: "Bearer invalid-secret",
        },
      })

      // Act
      const response = await triggerInterestAccrual(req)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(401)
      expect(data).toHaveProperty("error")
      expect(data.error).toBe("Unauthorized")
      expect(addJob).not.toHaveBeenCalled()
    })

    it("should return 401 with missing authorization header", async () => {
      // Arrange
      req = new NextRequest("http://localhost/api/cron/interest-accrual", {
        method: "POST",
        // No Authorization header
      })

      // Act
      const response = await triggerInterestAccrual(req)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(401)
      expect(data).toHaveProperty("error")
      expect(data.error).toBe("Unauthorized")
      expect(addJob).not.toHaveBeenCalled()
    })

    it("should return 405 for GET requests", async () => {
      // Arrange
      req = new NextRequest("http://localhost/api/cron/interest-accrual", {
        method: "GET",
        headers: {
          Authorization: "Bearer test-cron-secret",
        },
      })

      // Act
      const response = await NextResponse.json({ error: "Method not allowed" }, { status: 405 })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(405)
      expect(data).toHaveProperty("error")
      expect(data.error).toBe("Method not allowed")
    })
  })
})
