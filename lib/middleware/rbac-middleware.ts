import { type NextRequest, NextResponse } from "next/server"
import { verifyJwtToken } from "@/lib/auth/jwt"
import { logger } from "@/lib/logger"

type Role = "user" | "admin"

export function rbacMiddleware(allowedRoles: Role[]) {
  return async function middleware(request: NextRequest) {
    try {
      // Get the token from the cookies
      const token = request.cookies.get("token")?.value

      if (!token) {
        logger.warn(`RBAC: Access denied - No token provided for ${request.nextUrl.pathname}`)
        return NextResponse.json({ error: "Authentication required" }, { status: 401 })
      }

      // Verify the token
      const payload = await verifyJwtToken(token)

      // Check if the user's role is allowed
      if (!allowedRoles.includes(payload.role as Role)) {
        logger.warn(
          `RBAC: Access denied - User ${payload.userId} with role ${payload.role} attempted to access ${request.nextUrl.pathname}`,
        )
        return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
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
      logger.error(`RBAC: Token verification failed for ${request.nextUrl.pathname}`, error)
      return NextResponse.json({ error: "Authentication failed" }, { status: 401 })
    }
  }
}
