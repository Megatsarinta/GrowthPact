/**
 * Tests for the admin investment plans API endpoints
 */

import { NextRequest } from "next/server"
import { GET as getAdminPlans, POST as createPlan } from "@/app/api/admin/plans/route"
import { PUT as updatePlan, DELETE as deletePlan } from "@/app/api/admin/plans/[id]/route"
import { db } from "@/lib/db"
import { jest } from "@jest/globals"

// Mock the database
jest.mock("@/lib/db", () => ({
  db: {
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn(),
    insert: jest.fn().mockReturnThis(),
    values: jest.fn().mockReturnThis(),
    returning: jest.fn(),
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
  },
}))

describe("Admin Investment Plans API", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("GET /api/admin/plans", () => {
    it("should return all plans for admin", async () => {
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
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
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
          isActive: false, // Including inactive plans
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      // Mock the database response
      jest.spyOn(db, "orderBy").mockResolvedValue(mockPlans)

      // Create request with admin role header
      const headers = new Headers()
      headers.set("x-user-role", "admin")
      const request = new NextRequest("http://localhost:3000/api/admin/plans", {
        headers,
      })

      // Act
      const response = await getAdminPlans(request)
      const responseData = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(responseData).toHaveProperty("status", "success")
      expect(responseData).toHaveProperty("data")
      expect(responseData.data).toHaveLength(2)
      expect(responseData.data[0]).toHaveProperty("name", "Renewable Energy")
      expect(responseData.data[1]).toHaveProperty("name", "Agriculture Growth")
      expect(responseData.data[1]).toHaveProperty("isActive", false)
    })

    it("should return 403 for non-admin users", async () => {
      // Arrange
      // Create request with non-admin role header
      const headers = new Headers()
      headers.set("x-user-role", "user")
      const request = new NextRequest("http://localhost:3000/api/admin/plans", {
        headers,
      })

      // Act
      const response = await getAdminPlans(request)
      const responseData = await response.json()

      // Assert
      expect(response.status).toBe(403)
      expect(responseData).toHaveProperty("status", "error")
      expect(responseData).toHaveProperty("message", "Unauthorized access")
    })
  })

  describe("POST /api/admin/plans", () => {
    it("should create a new investment plan", async () => {
      // Arrange
      const mockPlan = {
        id: 3,
        name: "Real Estate Fund",
        dailyInterest: 0.7,
        minAmount: 25000,
        maxAmount: 250000,
        durationDays: 365,
        sector: "Real Estate",
        projectId: 3,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      // Mock project exists check
      jest.spyOn(db, "limit").mockResolvedValueOnce([{ id: 3 }])

      // Mock the database insert response
      jest.spyOn(db, "returning").mockResolvedValue([mockPlan])

      // Create request with admin role header and plan data
      const headers = new Headers()
      headers.set("x-user-role", "admin")
      const request = new NextRequest("http://localhost:3000/api/admin/plans", {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: "Real Estate Fund",
          dailyInterest: 0.7,
          minAmount: 25000,
          maxAmount: 250000,
          durationDays: 365,
          sector: "Real Estate",
          projectId: 3,
        }),
      })

      // Act
      const response = await createPlan(request)
      const responseData = await response.json()

      // Assert
      expect(response.status).toBe(201)
      expect(responseData).toHaveProperty("status", "success")
      expect(responseData).toHaveProperty("message", "Investment plan created successfully")
      expect(responseData).toHaveProperty("data")
      expect(responseData.data).toHaveProperty("name", "Real Estate Fund")
    })

    it("should return 400 for invalid plan data", async () => {
      // Arrange
      // Create request with admin role header and invalid plan data
      const headers = new Headers()
      headers.set("x-user-role", "admin")
      const request = new NextRequest("http://localhost:3000/api/admin/plans", {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: "Invalid Plan",
          // Missing required fields
        }),
      })

      // Act
      const response = await createPlan(request)
      const responseData = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(responseData).toHaveProperty("status", "error")
      expect(responseData).toHaveProperty("message", "Validation failed")
    })

    it("should return 404 if project does not exist", async () => {
      // Arrange
      // Mock project does not exist
      jest.spyOn(db, "limit").mockResolvedValueOnce([])

      // Create request with admin role header and plan data with non-existent project
      const headers = new Headers()
      headers.set("x-user-role", "admin")
      const request = new NextRequest("http://localhost:3000/api/admin/plans", {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: "Real Estate Fund",
          dailyInterest: 0.7,
          minAmount: 25000,
          maxAmount: 250000,
          durationDays: 365,
          sector: "Real Estate",
          projectId: 999, // Non-existent project ID
        }),
      })

      // Act
      const response = await createPlan(request)
      const responseData = await response.json()

      // Assert
      expect(response.status).toBe(404)
      expect(responseData).toHaveProperty("status", "error")
      expect(responseData).toHaveProperty("message", "Project not found")
    })
  })

  describe("PUT /api/admin/plans/:id", () => {
    it("should update an existing investment plan", async () => {
      // Arrange
      const mockUpdatedPlan = {
        id: 1,
        name: "Updated Renewable Energy",
        dailyInterest: 0.55,
        minAmount: 12000,
        maxAmount: 120000,
        durationDays: 200,
        sector: "Energy",
        projectId: 1,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      // Mock plan exists check
      jest.spyOn(db, "limit").mockResolvedValueOnce([{ id: 1 }])

      // Mock the database update response
      jest.spyOn(db, "returning").mockResolvedValue([mockUpdatedPlan])

      // Create request with admin role header and updated plan data
      const headers = new Headers()
      headers.set("x-user-role", "admin")
      const request = new NextRequest("http://localhost:3000/api/admin/plans/1", {
        method: "PUT",
        headers,
        body: JSON.stringify({
          name: "Updated Renewable Energy",
          dailyInterest: 0.55,
          minAmount: 12000,
          maxAmount: 120000,
          durationDays: 200,
        }),
      })

      // Act
      const response = await updatePlan(request, { params: { id: "1" } })
      const responseData = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(responseData).toHaveProperty("status", "success")
      expect(responseData).toHaveProperty("message", "Investment plan updated successfully")
      expect(responseData).toHaveProperty("data")
      expect(responseData.data).toHaveProperty("name", "Updated Renewable Energy")
    })

    it("should return 404 if plan does not exist", async () => {
      // Arrange
      // Mock plan does not exist
      jest.spyOn(db, "limit").mockResolvedValueOnce([])

      // Create request with admin role header
      const headers = new Headers()
      headers.set("x-user-role", "admin")
      const request = new NextRequest("http://localhost:3000/api/admin/plans/999", {
        method: "PUT",
        headers,
        body: JSON.stringify({
          name: "Updated Plan",
          dailyInterest: 0.6,
        }),
      })

      // Act
      const response = await updatePlan(request, { params: { id: "999" } })
      const responseData = await response.json()

      // Assert
      expect(response.status).toBe(404)
      expect(responseData).toHaveProperty("status", "error")
      expect(responseData).toHaveProperty("message", "Investment plan not found")
    })
  })

  describe("DELETE /api/admin/plans/:id", () => {
    it("should soft delete an investment plan", async () => {
      // Arrange
      // Mock plan exists check
      jest.spyOn(db, "limit").mockResolvedValueOnce([{ id: 1 }])

      // Mock the database update
      jest.spyOn(db, "where").mockResolvedValueOnce(undefined)

      // Create request with admin role header
      const headers = new Headers()
      headers.set("x-user-role", "admin")
      const request = new NextRequest("http://localhost:3000/api/admin/plans/1", {
        method: "DELETE",
        headers,
      })

      // Act
      const response = await deletePlan(request, { params: { id: "1" } })
      const responseData = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(responseData).toHaveProperty("status", "success")
      expect(responseData).toHaveProperty("message", "Investment plan deleted successfully")

      // Verify that isActive was set to false (soft delete)
      expect(db.update).toHaveBeenCalled()
      expect(db.set).toHaveBeenCalledWith(
        expect.objectContaining({
          isActive: false,
        }),
      )
    })

    it("should return 404 if plan does not exist", async () => {
      // Arrange
      // Mock plan does not exist
      jest.spyOn(db, "limit").mockResolvedValueOnce([])

      // Create request with admin role header
      const headers = new Headers()
      headers.set("x-user-role", "admin")
      const request = new NextRequest("http://localhost:3000/api/admin/plans/999", {
        method: "DELETE",
        headers,
      })

      // Act
      const response = await deletePlan(request, { params: { id: "999" } })
      const responseData = await response.json()

      // Assert
      expect(response.status).toBe(404)
      expect(responseData).toHaveProperty("status", "error")
      expect(responseData).toHaveProperty("message", "Investment plan not found")
    })
  })
})
