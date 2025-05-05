import { type NextRequest, NextResponse } from "next/server"
import { logger } from "@/lib/logger"

export async function loggingMiddleware(request: NextRequest, next: () => Promise<NextResponse>) {
  const startTime = Date.now()
  const { pathname, search } = request.nextUrl
  const method = request.method

  // Log the request
  logger.info(`API Request: ${method} ${pathname}${search}`)

  try {
    // Process the request
    const response = await next()

    // Log the response
    const duration = Date.now() - startTime
    logger.info(`API Response: ${method} ${pathname}${search} - ${response.status} (${duration}ms)`)

    return response
  } catch (error) {
    // Log the error
    const duration = Date.now() - startTime
    logger.error(`API Error: ${method} ${pathname}${search} - (${duration}ms)`, error)

    // Return an error response
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
