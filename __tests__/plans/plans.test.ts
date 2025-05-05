/**
 * Tests for the public investment plans API endpoints
 */

import { NextRequest } from "next/server"
import { GET as getPlans } from "@/app/api/plans/route"
import { GET as getPlanById } from "@/app/api/plans/[id]/route"
import { db } from "@/lib/db"
import { jest } from "@jest/globals"

// Mock the database
jest.mock("@/lib/db", () => ({
  db: {
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn(),
  },
}))

describe("Investment Plans API", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("GET /api/plans", () => {
    it("should return a list of active plans", async () => {
      // Arrange
      const mockPlans = [
        {
          id: 1,
          name: "Renewable Energy",
          dailyInterest: 0.5,
          minAmount: 10000,
          maxAmount: 100000,
          durationDays: 180,
          sector: "Energy",
          projectId: 1,
          createdAt: new Date(),
        },
        {
          id: 2,
          name: "Agriculture Growth",
          dailyInterest: 0.6,
          minAmount: 15000,
          maxAmount: 150000,
          durationDays: 240,
          sector: "Agriculture",
          projectId: 2,
          createdAt: new Date(),
        },
      ]

      // Mock the database response
      jest.spyOn(db, "limit").mockResolvedValue(mockPlans)

      const request = new NextRequest("http://localhost:3000/api/plans")

      // Act
      const response = await getPlans(request)
      const responseData = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(responseData).toHaveProperty("status", "success")
      expect(responseData).toHaveProperty("data")
      expect(responseData.data).toHaveLength(2)
      expect(responseData.data[0]).toHaveProperty("name", "Renewable Energy")
      expect(responseData.data[1]).toHaveProperty("name", "Agriculture Growth")
    })

    it("should filter plans by sector", async () => {
      // Arrange
      const mockPlans = [
        {
          id: 1,
          name: "Renewable Energy",
          dailyInterest: 0.5,
          minAmount: 10000,
          maxAmount: 100000,
          durationDays: 180,
          sector: "Energy",
          projectId: 1,
          createdAt: new Date(),
        },
      ]

      // Mock the database response
      jest.spyOn(db, "limit").mockResolvedValue(mockPlans)

      const request = new NextRequest("http://localhost:3000/api/plans?sector=Energy")

      // Act
      const response = await getPlans(request)
      const responseData = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(responseData).toHaveProperty("status", "success")
      expect(responseData).toHaveProperty("data")
      expect(responseData.data).toHaveLength(1)
      expect(responseData.data[0]).toHaveProperty("sector", "Energy")
    })

    it("should handle invalid query parameters", async () => {
      // Arrange
      const request = new NextRequest("http://localhost:3000/api/plans?minDuration=invalid")

      // Act
      const response = await getPlans(request)
      const responseData = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(responseData).toHaveProperty("status", "error")
      expect(responseData).toHaveProperty("message", "Invalid query parameters")
    })
  })

  describe("GET /api/plans/:id", () => {
    it("should return a specific plan by ID", async () => {
      // Arrange
      const mockPlan = [
        {
          plan: {
            id: 1,
            name: "Renewable Energy",
            dailyInterest: 0.5,
            minAmount: 10000,
            maxAmount: 100000,
            durationDays: 180,
            sector: "Energy",
            projectId: 1,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          project: {
            id: 1,
            name: "Solar Energy Farms",
            description: "Investment in solar energy farms",
            imageUrl: "/images/solar.jpg",
            sector: "Energy",
          },
        },
      ]

      // Mock the database response
      jest.spyOn(db, "limit").mockResolvedValue(mockPlan)

      const request = new NextRequest("http://localhost:3000/api/plans/1")
      const params = { id: "1" }

      // Act
      const response = await getPlanById(request, { params })
      const responseData = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(responseData).toHaveProperty("status", "success")
      expect(responseData).toHaveProperty("data")
      expect(responseData.data).toHaveProperty("name", "Renewable Energy")
      expect(responseData.data).toHaveProperty("project")
      expect(responseData.data.project).toHaveProperty("name", "Solar Energy Farms")
      expect(responseData.data).toHaveProperty("metrics")
      expect(responseData.data.metrics).toHaveProperty("totalReturn")
      expect(responseData.data.metrics).toHaveProperty("annualizedReturn")
    })

    it("should return 404 if plan is not found", async () => {
      // Arrange
      // Mock empty database response
      jest.spyOn(db, "limit").mockResolvedValue([])

      const request = new NextRequest("http://localhost:3000/api/plans/999")
      const params = { id: "999" }

      // Act
      const response = await getPlanById(request, { params })
      const responseData = await response.json()

      // Assert
      expect(response.status).toBe(404)
      expect(responseData).toHaveProperty("status", "error")
      expect(responseData).toHaveProperty("message", "Investment plan not found")
    })

    it("should handle invalid plan ID", async () => {
      // Arrange
      const request = new NextRequest("http://localhost:3000/api/plans/invalid")
      const params = { id: "invalid" }

      // Act
      const response = await getPlanById(request, { params })
      const responseData = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(responseData).toHaveProperty("status", "error")
      expect(responseData).toHaveProperty("message", "Invalid plan ID")
    })
  })
})
