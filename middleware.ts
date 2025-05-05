import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { verifyJwtToken } from "@/lib/auth/jwt"
import { loggingMiddleware } from "@/lib/middleware/logging-middleware"
import { analyticsMiddleware } from "@/lib/middleware/analytics-middleware"
import { logger } from "@/lib/logger"

// Define paths that require authentication
const authPaths = ["/dashboard", "/api/auth/me", "/api/deposits", "/api/withdrawals", "/api/kyc"]

// Define paths that require admin access
const adminPaths = ["/admin", "/api/admin"]

// Define paths with rate limiting
const rateLimitedPaths = ["/api/auth/login", "/api/auth/register", "/api/auth/2fa/verify"]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Apply logging middleware
  const loggingResponse = await loggingMiddleware(request, async () => {
    // Apply analytics middleware
    return await analyticsMiddleware(request, async () => {
      // Apply rate limiting to sensitive routes
      if (rateLimitedPaths.some((path) => pathname.startsWith(path))) {
        // Simple IP-based rate limiting
        const ip = request.ip || "unknown"
        const rateLimitKey = `rate-limit:${ip}:${pathname}`

        // In a real implementation, you would use Redis or another store
        // For now, we'll just log it
        logger.debug(`Rate limit check for ${rateLimitKey}`)
      }

      // Check if the path requires authentication
      if (authPaths.some((path) => pathname.startsWith(path))) {
        // Get the token from the cookies
        const token = request.cookies.get("token")?.value

        if (!token) {
          // Redirect to login if no token is found
          return NextResponse.redirect(new URL("/auth/login", request.url))
        }

        try {
          // Verify the token
          const payload = await verifyJwtToken(token)

          // Check if the path requires admin access
          if (adminPaths.some((path) => pathname.startsWith(path))) {
            if (payload.role !== "admin") {
              // Return 403 Forbidden if the user is not an admin
              return new NextResponse(JSON.stringify({ error: "Insufficient permissions" }), {
                status: 403,
                headers: { "Content-Type": "application/json" },
              })
            }
          }

          // Add user info to headers for downstream use
          const requestHeaders = new Headers(request.headers)
          requestHeaders.set("x-user-id", payload.userId.toString())
          requestHeaders.set("x-user-email", payload.email)
          requestHeaders.set("x-user-role", payload.role)

          // Continue with the modified request
          return NextResponse.next({
            request: {
              headers: requestHeaders,
            },
          })
        } catch (error) {
          logger.error("Token verification failed:", error)
          // Redirect to login if token is invalid
          return NextResponse.redirect(new URL("/auth/login", request.url))
        }
      }

      // Continue for non-protected routes
      return NextResponse.next()
    })
  })

  return loggingResponse
}

// Configure the middleware to run only on specific paths
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/admin/:path*",
    "/api/auth/me",
    "/api/deposits/:path*",
    "/api/withdrawals/:path*",
    "/api/kyc/:path*",
    "/api/admin/:path*",
  ],
}
