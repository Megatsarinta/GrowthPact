"use client"

import { useEffect, useState } from "react"
import { io, type Socket } from "socket.io-client"

let socket: Socket | null = null

export function useSocket() {
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Initialize socket connection
    const initSocket = async () => {
      try {
        // Get token from localStorage
        const token = localStorage.getItem("token")
        if (!token) {
          setError("No authentication token found")
          return
        }

        if (!socket) {
          socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3000", {
            auth: { token },
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
          })
        }

        socket.on("connect", () => {
          console.log("Socket connected")
          setIsConnected(true)
          setError(null)
        })

        socket.on("disconnect", () => {
          console.log("Socket disconnected")
          setIsConnected(false)
        })

        socket.on("connect_error", (err) => {
          console.error("Socket connection error:", err.message)
          setError(`Connection error: ${err.message}`)
          setIsConnected(false)
        })
      } catch (err) {
        console.error("Socket initialization error:", err)
        setError(`Initialization error: ${err.message}`)
      }
    }

    initSocket()

    // Cleanup on unmount
    return () => {
      if (socket) {
        socket.off("connect")
        socket.off("disconnect")
        socket.off("connect_error")
      }
    }
  }, [])

  // Function to subscribe to events
  const subscribe = (event: string, callback: (data: any) => void) => {
    if (!socket) return () => {}

    socket.on(event, callback)
    return () => {
      socket.off(event, callback)
    }
  }

  // Function to emit events
  const emit = (event: string, data: any) => {
    if (!socket || !isConnected) return false
    socket.emit(event, data)
    return true
  }

  return {
    socket,
    isConnected,
    error,
    subscribe,
    emit,
  }
}

// Helper to get the socket instance directly
export function getSocket() {
  return socket
}
