/**
 * Investment plan validation schemas
 *
 * This module provides Zod schemas for validating investment plan-related
 * request payloads.
 */

import { z } from "zod"

// Base schema for investment plan data
const planBaseSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100, "Name cannot exceed 100 characters"),
  dailyInterest: z
    .number()
    .min(0.01, "Daily interest must be at least 0.01%")
    .max(10, "Daily interest cannot exceed 10%"),
  minAmount: z.number().min(1, "Minimum amount must be at least 1"),
  maxAmount: z.number().min(1, "Maximum amount must be at least 1"),
  durationDays: z.number().int().min(1, "Duration must be at least 1 day"),
  sector: z.string().min(2, "Sector must be at least 2 characters").max(50, "Sector cannot exceed 50 characters"),
  projectId: z.number().int().positive("Project ID must be a positive integer"),
})

// Schema for creating a new investment plan
export const createPlanSchema = planBaseSchema

// Schema for updating an existing investment plan
export const updatePlanSchema = planBaseSchema.partial()

// Schema for filtering plans
export const planFilterSchema = z.object({
  sector: z.string().optional(),
  minDuration: z
    .string()
    .optional()
    .transform((val) => (val ? Number.parseInt(val, 10) : undefined)),
  maxDuration: z
    .string()
    .optional()
    .transform((val) => (val ? Number.parseInt(val, 10) : undefined)),
  minInterest: z
    .string()
    .optional()
    .transform((val) => (val ? Number.parseFloat(val) : undefined)),
  maxInterest: z
    .string()
    .optional()
    .transform((val) => (val ? Number.parseFloat(val) : undefined)),
})

// Schema for plan ID parameter
export const planIdSchema = z.object({
  id: z.string().refine((val) => !isNaN(Number.parseInt(val, 10)), {
    message: "Plan ID must be a valid number",
  }),
})
