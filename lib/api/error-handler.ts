import { NextResponse } from "next/server"
import { logger } from "@/lib/logger"
import { ZodError } from "zod"
import { DrizzleError } from "drizzle-orm"

export function handleApiError(error: unknown, path: string) {
  // Log the error
  logger.error(`API Error in ${path}:`, error)

  // Handle different types of errors
  if (error instanceof ZodError) {
    // Validation errors
    return NextResponse.json(
      {
        status: "error",
        message: "Validation failed",
        errors: error.errors.map((e) => ({
          path: e.path.join("."),
          message: e.message,
        })),
      },
      { status: 400 },
    )
  } else if (error instanceof DrizzleError) {
    // Database errors
    return NextResponse.json(
      {
        status: "error",
        message: "Database operation failed",
      },
      { status: 500 },
    )
  } else if (error instanceof Error) {
    // Generic errors
    const statusCode = error.name === "UnauthorizedError" ? 401 : 500
    return NextResponse.json(
      {
        status: "error",
        message: error.message || "An unexpected error occurred",
      },
      { status: statusCode },
    )
  }

  // Unknown errors
  return NextResponse.json(
    {
      status: "error",
      message: "An unexpected error occurred",
    },
    { status: 500 },
  )
}
