import type { NextRequest, NextResponse } from "next/server"
import { logger } from "@/lib/logger"

interface AnalyticsEvent {
  path: string
  method: string
  timestamp: number
  userId?: string
  userAgent?: string
  referrer?: string
  duration?: number
}

// In-memory analytics store (in a real app, you'd use a database)
const analyticsEvents: AnalyticsEvent[] = []

export async function analyticsMiddleware(request: NextRequest, next: () => Promise<NextResponse>) {
  const startTime = Date.now()
  const { pathname, search } = request.nextUrl
  const method = request.method
  const userId = request.headers.get("x-user-id")
  const userAgent = request.headers.get("user-agent")
  const referrer = request.headers.get("referer")

  // Process the request
  const response = await next()

  // Record analytics
  const duration = Date.now() - startTime
  const event: AnalyticsEvent = {
    path: pathname + search,
    method,
    timestamp: startTime,
    userId: userId || undefined,
    userAgent: userAgent || undefined,
    referrer: referrer || undefined,
    duration,
  }

  // Store the event
  analyticsEvents.push(event)
  if (analyticsEvents.length > 10000) {
    analyticsEvents.shift() // Limit the size of the in-memory store
  }

  // Log the event
  logger.debug("Analytics event recorded", { path: event.path, duration: event.duration })

  return response
}

// Function to get analytics data
export function getAnalytics(options?: {
  path?: string
  startTime?: number
  endTime?: number
  userId?: string
  limit?: number
}) {
  let filtered = analyticsEvents

  if (options?.path) {
    filtered = filtered.filter((event) => event.path.includes(options.path))
  }

  if (options?.startTime) {
    filtered = filtered.filter((event) => event.timestamp >= options.startTime!)
  }

  if (options?.endTime) {
    filtered = filtered.filter((event) => event.timestamp <= options.endTime!)
  }

  if (options?.userId) {
    filtered = filtered.filter((event) => event.userId === options.userId)
  }

  // Sort by timestamp (newest first)
  filtered.sort((a, b) => b.timestamp - a.timestamp)

  // Apply limit
  if (options?.limit && options.limit > 0) {
    filtered = filtered.slice(0, options.limit)
  }

  return filtered
}
