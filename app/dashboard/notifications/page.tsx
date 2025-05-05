"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, CheckCircle } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { useSocket } from "@/lib/socket/client"

interface Notification {
  id: number
  type: string
  title: string
  message: string
  isRead: boolean
  createdAt: string
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const limit = 20
  const { isConnected, subscribe } = useSocket()

  // Fetch notifications on component mount and when page changes
  useEffect(() => {
    fetchNotifications()
  }, [page])

  // Subscribe to real-time notifications
  useEffect(() => {
    if (!isConnected) return

    const unsubscribe = subscribe("notification", (data: Notification) => {
      setNotifications((prev) => [data, ...prev])
    })

    return () => {
      unsubscribe()
    }
  }, [isConnected, subscribe])

  async function fetchNotifications() {
    setLoading(true)
    try {
      const response = await fetch(`/api/notifications?limit=${limit}&offset=${page * limit}`)
      if (!response.ok) {
        throw new Error("Failed to fetch notifications")
      }
      const data = await response.json()

      if (page === 0) {
        setNotifications(data.data)
      } else {
        setNotifications((prev) => [...prev, ...data.data])
      }

      setHasMore(data.data.length === limit)
    } catch (error) {
      console.error("Error fetching notifications:", error)
    } finally {
      setLoading(false)
    }
  }

  async function markAsRead(id: number) {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id }),
      })

      // Update local state
      setNotifications((prev) =>
        prev.map((notification) => (notification.id === id ? { ...notification, isRead: true } : notification)),
      )
    } catch (error) {
      console.error("Error marking notification as read:", error)
    }
  }

  async function markAllAsRead() {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ all: true }),
      })

      // Update local state
      setNotifications((prev) => prev.map((notification) => ({ ...notification, isRead: true })))
    } catch (error) {
      console.error("Error marking all notifications as read:", error)
    }
  }

  function getNotificationIcon(type: string) {
    switch (type) {
      case "deposit_confirmed":
        return "💰"
      case "withdrawal_processed":
        return "💸"
      case "interest_accrued":
        return "💹"
      case "kyc_verified":
        return "✅"
      case "kyc_rejected":
        return "❌"
      default:
        return "📣"
    }
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Notifications</h1>
        <Button variant="outline" onClick={markAllAsRead}>
          Mark all as read
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Notifications</CardTitle>
          <CardDescription>Stay updated with important information about your account and investments.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading && page === 0 ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <CheckCircle className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="text-lg font-medium">No notifications</p>
              <p className="text-sm text-muted-foreground">You're all caught up!</p>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`flex cursor-pointer items-start gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/50 ${
                      !notification.isRead ? "bg-muted/50" : ""
                    }`}
                    onClick={() => !notification.isRead && markAsRead(notification.id)}
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-xl">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium">{notification.title}</h3>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{notification.message}</p>
                    </div>
                  </div>
                ))}
              </div>

              {hasMore && (
                <div className="mt-6 flex justify-center">
                  <Button variant="outline" onClick={() => setPage((p) => p + 1)} disabled={loading}>
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Load more
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
