"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, AlertCircle, Search, RefreshCw, Clock } from "lucide-react"
import { DataTable } from "@/components/ui/data-table"
import type { ColumnDef } from "@tanstack/react-table"
import { useToast } from "@/components/ui/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"

interface ActivityLog {
  id: number
  action: string
  formattedAction: string
  metadata: any
  ipAddress: string | null
  userAgent: string | null
  timestamp: string
}

export default function ActivityPage() {
  const { toast } = useToast()
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [actionFilter, setActionFilter] = useState<string>("all")
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  useEffect(() => {
    fetchLogs()
  }, [page, pageSize, actionFilter])

  const fetchLogs = async () => {
    setLoading(true)
    setError(null)

    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      })

      if (actionFilter !== "all") {
        queryParams.append("action", actionFilter)
      }

      const response = await fetch(`/api/dashboard/activity?${queryParams.toString()}`)
      if (!response.ok) {
        throw new Error("Failed to fetch activity logs")
      }

      const data = await response.json()
      setLogs(data.data)
      setTotalPages(data.meta.totalPages)
    } catch (err) {
      setError("Could not load activity logs. Please try again later.")
      console.error(err)
      toast({
        title: "Error",
        description: "Failed to load activity logs",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const getActionBadgeVariant = (action: string) => {
    if (action.includes("login") || action.includes("register")) {
      return "outline"
    } else if (action.includes("approved") || action.includes("completed")) {
      return "default"
    } else if (action.includes("rejected")) {
      return "destructive"
    } else if (action.includes("created") || action.includes("requested")) {
      return "secondary"
    } else if (action.includes("updated") || action.includes("changed")) {
      return "outline"
    } else {
      return "secondary"
    }
  }

  // Apply search filter
  const getFilteredLogs = () => {
    return logs.filter((log) => {
      // Apply search filter
      const matchesSearch = !searchQuery
        ? true
        : log.formattedAction.toLowerCase().includes(searchQuery.toLowerCase()) ||
          log.id.toString().includes(searchQuery) ||
          (log.ipAddress && log.ipAddress.includes(searchQuery))

      return matchesSearch
    })
  }

  const filteredLogs = getFilteredLogs()

  const columns: ColumnDef<ActivityLog>[] = [
    {
      accessorKey: "timestamp",
      header: () => (
        <div className="flex items-center">
          <Clock className="mr-2 h-4 w-4" />
          Date & Time
        </div>
      ),
      cell: ({ row }) => new Date(row.original.timestamp).toLocaleString(),
    },
    {
      accessorKey: "formattedAction",
      header: "Activity",
      cell: ({ row }) => (
        <Badge variant={getActionBadgeVariant(row.original.action)}>{row.original.formattedAction}</Badge>
      ),
    },
    {
      accessorKey: "metadata",
      header: "Details",
      cell: ({ row }) => {
        const metadata = row.original.metadata
        if (!metadata || Object.keys(metadata).length === 0) return null

        // Format metadata based on action type
        try {
          // Render different details based on action type
          if (row.original.action === "deposit_created" || row.original.action === "deposit_completed") {
            return (
              <div className="text-sm">
                {metadata.amount && metadata.currency && (
                  <div>
                    Amount: {metadata.amount} {metadata.currency}
                  </div>
                )}
                {metadata.status && <div>Status: {metadata.status}</div>}
              </div>
            )
          } else if (
            row.original.action === "withdrawal_requested" ||
            row.original.action === "withdrawal_approved" ||
            row.original.action === "withdrawal_rejected"
          ) {
            return (
              <div className="text-sm">
                {metadata.amount && metadata.currency && (
                  <div>
                    Amount: {metadata.amount} {metadata.currency}
                  </div>
                )}
                {metadata.status && <div>Status: {metadata.status}</div>}
                {metadata.reason && <div>Reason: {metadata.reason}</div>}
              </div>
            )
          } else if (row.original.action === "investment_created") {
            return (
              <div className="text-sm">
                {metadata.planName && <div>Plan: {metadata.planName}</div>}
                {metadata.amount && <div>Amount: ₹{metadata.amount}</div>}
                {metadata.duration && <div>Duration: {metadata.duration} days</div>}
              </div>
            )
          } else if (row.original.action.includes("login")) {
            return (
              <div className="text-sm">
                <div>IP: {row.original.ipAddress || "Unknown"}</div>
                <div className="truncate max-w-xs">
                  {row.original.userAgent ? row.original.userAgent.substring(0, 30) + "..." : "Unknown device"}
                </div>
              </div>
            )
          }

          // Default rendering for other action types
          return (
            <div className="text-sm">
              {Object.entries(metadata).map(([key, value]) => (
                <div key={key}>
                  {key}: {typeof value === "object" ? JSON.stringify(value) : String(value)}
                </div>
              ))}
            </div>
          )
        } catch (e) {
          return <div className="text-sm text-muted-foreground">Additional details not available</div>
        }
      },
    },
    {
      accessorKey: "ipAddress",
      header: "IP Address",
      cell: ({ row }) => row.original.ipAddress || "N/A",
    },
  ]

  return (
    <div className="container mx-auto py-8">
      <h1 className="mb-6 text-2xl font-bold">Account Activity</h1>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search activity"
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by activity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Activities</SelectItem>
              <SelectItem value="login">Logins</SelectItem>
              <SelectItem value="kyc">KYC Activities</SelectItem>
              <SelectItem value="deposit">Deposits</SelectItem>
              <SelectItem value="withdrawal">Withdrawals</SelectItem>
              <SelectItem value="investment">Investments</SelectItem>
            </SelectContent>
          </Select>

          <Select value={pageSize.toString()} onValueChange={(value) => setPageSize(Number(value))}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Items per page" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10 per page</SelectItem>
              <SelectItem value="20">20 per page</SelectItem>
              <SelectItem value="50">50 per page</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button onClick={fetchLogs} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" /> Refresh
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Your Account Activity</CardTitle>
          <CardDescription>Track all actions and events related to your account</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : logs.length === 0 ? (
            <div className="flex h-32 items-center justify-center text-muted-foreground">No activity logs found</div>
          ) : (
            <DataTable columns={columns} data={filteredLogs} />
          )}
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={() => setPage(1)} disabled={page === 1 || loading}>
              First
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || loading}
            >
              Next
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(totalPages)}
              disabled={page === totalPages || loading}
            >
              Last
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
