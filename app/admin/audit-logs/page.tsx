"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, AlertCircle, Search, RefreshCw, Clock, User, Shield } from "lucide-react"
import { DataTable } from "@/components/ui/data-table"
import type { ColumnDef } from "@tanstack/react-table"
import { useToast } from "@/components/ui/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"

interface AuditLog {
  id: number
  userId: number
  action: string
  metadata: any
  ipAddress: string | null
  userAgent: string | null
  timestamp: string
  user?: {
    email: string
    fullName: string
  }
}

export default function AuditLogsPage() {
  const { toast } = useToast()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [actionFilter, setActionFilter] = useState<string>("all")
  const [sortColumn, setSortColumn] = useState<string>("timestamp")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [pageSize, setPageSize] = useState(50)

  useEffect(() => {
    fetchLogs()
  }, [page, pageSize, actionFilter])

  const fetchLogs = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/admin/audit-logs?page=${page}&pageSize=${pageSize}&action=${actionFilter}`)
      if (!response.ok) {
        throw new Error("Failed to fetch audit logs")
      }

      const data = await response.json()
      setLogs(data.data)
      setTotalPages(data.meta.totalPages)
    } catch (err) {
      setError("Could not load audit logs. Please try again later.")
      console.error(err)
      toast({
        title: "Error",
        description: "Failed to load audit logs",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const getActionLabel = (action: string) => {
    switch (action) {
      case "login":
        return "User Login"
      case "logout":
        return "User Logout"
      case "register":
        return "User Registration"
      case "kyc_approved":
        return "KYC Approved"
      case "kyc_rejected":
        return "KYC Rejected"
      case "role_changed":
        return "Role Changed"
      case "deposit_created":
        return "Deposit Created"
      case "withdrawal_approved":
        return "Withdrawal Approved"
      case "withdrawal_rejected":
        return "Withdrawal Rejected"
      case "investment_created":
        return "Investment Created"
      case "admin_login":
        return "Admin Login"
      default:
        return action.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
    }
  }

  const getActionBadgeVariant = (action: string) => {
    if (action.includes("login") || action.includes("register")) {
      return "outline"
    } else if (action.includes("approved")) {
      return "default"
    } else if (action.includes("rejected")) {
      return "destructive"
    } else if (action.includes("created")) {
      return "secondary"
    } else if (action.includes("changed")) {
      return "outline"
    } else {
      return "secondary"
    }
  }

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      // Toggle direction if same column
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      // Set new column and default to descending
      setSortColumn(column)
      setSortDirection("desc")
    }
  }

  // Apply all filters and sorting
  const getFilteredLogs = () => {
    return logs
      .filter((log) => {
        // Apply search filter
        const matchesSearch = !searchQuery
          ? true
          : log.user?.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            log.user?.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
            log.id.toString().includes(searchQuery) ||
            log.userId.toString().includes(searchQuery)

        return matchesSearch
      })
      .sort((a, b) => {
        // Apply sorting
        let valueA, valueB

        if (sortColumn === "timestamp") {
          valueA = new Date(a[sortColumn]).getTime()
          valueB = new Date(b[sortColumn]).getTime()
        } else if (sortColumn === "user.fullName") {
          valueA = a.user?.fullName || ""
          valueB = b.user?.fullName || ""
        } else if (sortColumn === "user.email") {
          valueA = a.user?.email || ""
          valueB = b.user?.email || ""
        } else {
          valueA = a[sortColumn]
          valueB = b[sortColumn]
        }

        return sortDirection === "asc" ? (valueA > valueB ? 1 : -1) : valueA < valueB ? 1 : -1
      })
  }

  const filteredLogs = getFilteredLogs()

  const columns: ColumnDef<AuditLog>[] = [
    {
      accessorKey: "id",
      header: () => (
        <div className="cursor-pointer flex items-center" onClick={() => handleSort("id")}>
          ID {sortColumn === "id" && (sortDirection === "asc" ? "↑" : "↓")}
        </div>
      ),
    },
    {
      accessorKey: "timestamp",
      header: () => (
        <div className="cursor-pointer flex items-center" onClick={() => handleSort("timestamp")}>
          <Clock className="mr-2 h-4 w-4" />
          Timestamp {sortColumn === "timestamp" && (sortDirection === "asc" ? "↑" : "↓")}
        </div>
      ),
      cell: ({ row }) => new Date(row.original.timestamp).toLocaleString(),
    },
    {
      accessorKey: "user.fullName",
      header: () => (
        <div className="cursor-pointer flex items-center" onClick={() => handleSort("user.fullName")}>
          <User className="mr-2 h-4 w-4" />
          User {sortColumn === "user.fullName" && (sortDirection === "asc" ? "↑" : "↓")}
        </div>
      ),
      cell: ({ row }) => (
        <div>
          <div>{row.original.user?.fullName || `User #${row.original.userId}`}</div>
          <div className="text-xs text-muted-foreground">{row.original.user?.email || ""}</div>
        </div>
      ),
    },
    {
      accessorKey: "action",
      header: () => (
        <div className="cursor-pointer flex items-center" onClick={() => handleSort("action")}>
          <Shield className="mr-2 h-4 w-4" />
          Action {sortColumn === "action" && (sortDirection === "asc" ? "↑" : "↓")}
        </div>
      ),
      cell: ({ row }) => (
        <Badge variant={getActionBadgeVariant(row.original.action)}>{getActionLabel(row.original.action)}</Badge>
      ),
    },
    {
      accessorKey: "metadata",
      header: "Details",
      cell: ({ row }) => {
        const metadata = row.original.metadata
        if (!metadata) return null

        // Format metadata based on action type
        try {
          const metadataObj = typeof metadata === "string" ? JSON.parse(metadata) : metadata

          // Render different details based on action type
          if (row.original.action === "kyc_approved" || row.original.action === "kyc_rejected") {
            return (
              <div className="text-sm">
                <div>KYC ID: {metadataObj.kycId}</div>
                {metadataObj.reason && <div>Reason: {metadataObj.reason}</div>}
              </div>
            )
          } else if (row.original.action === "role_changed") {
            return (
              <div className="text-sm">
                <div>
                  New Role: <Badge>{metadataObj.newRole}</Badge>
                </div>
                <div>User ID: {metadataObj.targetUserId}</div>
              </div>
            )
          } else if (row.original.action.includes("login")) {
            return (
              <div className="text-sm">
                <div>IP: {row.original.ipAddress || "Unknown"}</div>
                <div className="truncate max-w-xs">
                  {row.original.userAgent ? row.original.userAgent.substring(0, 50) + "..." : "Unknown device"}
                </div>
              </div>
            )
          }

          // Default rendering for other action types
          return (
            <div className="text-sm">
              {Object.entries(metadataObj).map(([key, value]) => (
                <div key={key}>
                  {key}: {typeof value === "object" ? JSON.stringify(value) : String(value)}
                </div>
              ))}
            </div>
          )
        } catch (e) {
          return <div className="text-sm text-muted-foreground">{String(metadata)}</div>
        }
      },
    },
  ]

  return (
    <div className="container mx-auto py-8">
      <h1 className="mb-6 text-3xl font-bold">Audit Logs</h1>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search logs"
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              <SelectItem value="login">Login</SelectItem>
              <SelectItem value="kyc">KYC Actions</SelectItem>
              <SelectItem value="role">Role Changes</SelectItem>
              <SelectItem value="deposit">Deposits</SelectItem>
              <SelectItem value="withdrawal">Withdrawals</SelectItem>
              <SelectItem value="investment">Investments</SelectItem>
            </SelectContent>
          </Select>

          <Select value={pageSize.toString()} onValueChange={(value) => setPageSize(Number(value))}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Page size" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="25">25 per page</SelectItem>
              <SelectItem value="50">50 per page</SelectItem>
              <SelectItem value="100">100 per page</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button onClick={fetchLogs}>
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
          <CardTitle>System Audit Logs</CardTitle>
          <CardDescription>Track all administrative actions and system events</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <DataTable columns={columns} data={filteredLogs} />
          )}
        </CardContent>
      </Card>

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
    </div>
  )
}
