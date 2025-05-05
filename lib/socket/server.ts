import type { Server as HttpServer } from "http"
import { Server } from "socket.io"
import { verifyJwtToken } from "@/lib/auth/jwt"

let io: Server | null = null

export function initSocketServer(httpServer: HttpServer) {
  if (io) return io

  io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true,
    },
  })

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token
      if (!token) {
        return next(new Error("Authentication error: Token not provided"))
      }

      const decoded = await verifyJwtToken(token)
      if (!decoded) {
        return next(new Error("Authentication error: Invalid token"))
      }

      // Attach user data to socket
      socket.data.user = {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role,
      }

      next()
    } catch (error) {
      next(new Error("Authentication error"))
    }
  })

  // Connection handler
  io.on("connection", (socket) => {
    const userId = socket.data.user.id
    const userRole = socket.data.user.role

    console.log(`User connected: ${userId}, role: ${userRole}`)

    // Join user-specific room
    socket.join(`user:${userId}`)

    // Join admin room if user is admin
    if (userRole === "admin") {
      socket.join("admin")
    }

    // Handle disconnection
    socket.on("disconnect", () => {
      console.log(`User disconnected: ${userId}`)
    })
  })

  console.log("Socket.io server initialized")
  return io
}

export function getSocketServer() {
  if (!io) {
    throw new Error("Socket.io server not initialized")
  }
  return io
}

// Helper functions to emit events
export function emitToUser(userId: number, event: string, data: any) {
  if (!io) return
  io.to(`user:${userId}`).emit(event, data)
}

export function emitToAdmin(event: string, data: any) {
  if (!io) return
  io.to("admin").emit(event, data)
}

export function emitToAll(event: string, data: any) {
  if (!io) return
  io.emit(event, data)
}
