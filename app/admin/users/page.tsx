"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Loader2,
  AlertCircle,
  Search,
  UserCheck,
  UserX,
  Shield,
  Eye,
  Filter,
  Download,
  RefreshCw,
  BarChart3,
} from "lucide-react"
import { DataTable } from "@/components/ui/data-table"
import type { ColumnDef } from "@tanstack/react-table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/use-toast"
import { Badge } from "@/components/ui/badge"

interface UserType {
  id: number
  email: string
  fullName: string
  phone: string | null
  isVerified: boolean
  role: "user" | "admin" | "support"
  twoFactorEnabled: boolean
  balanceInr: string
  referralCode: string | null
  referredBy: number | null
  createdAt: string
  updatedAt: string
  stats?: {
    totalInvestments: number
    activeInvestments: number
    totalDeposits: number
    totalWithdrawals: number
  }
}

export default function AdminUsersPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [users, setUsers] = useState<UserType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null)
  const [showRoleDialog, setShowRoleDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [newRole, setNewRole] = useState<"user" | "admin" | "support">("user")
  const [processing, setProcessing] = useState(false)
  const [activeTab, setActiveTab] = useState("all")
  const [roleFilter, setRoleFilter] = useState<string>("all")
  const [verificationFilter, setVerificationFilter] = useState<string>("all")
  const [sortColumn, setSortColumn] = useState<string>("createdAt")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")
  const [showExportDialog, setShowExportDialog] = useState(false)
  const [exportFormat, setExportFormat] = useState<"csv" | "json">("csv")

  // Ref for tracking audit logs
  const actionLogRef = useRef<
    {
      action: string
      userId: number
      targetUserId: number
      timestamp: Date
    }[]
  >([])

  useEffect(() => {
    fetchUsers()
  }, [activeTab])

  const fetchUsers = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/admin/users?tab=${activeTab}`)
      if (!response.ok) {
        throw new Error("Failed to fetch users")
      }

      const data = await response.json()
      setUsers(data.data)
    } catch (err) {
      setError("Could not load users. Please try again later.")
      console.error(err)
      toast({
        title: "Error",
        description: "Failed to load users",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleViewUser = (userId: number) => {
    router.push(`/admin/users/${userId}`)
  }

  const handleChangeRole = async () => {
    if (!selectedUser) return

    setProcessing(true)
    try {
      const response = await fetch(`/api/admin/users/${selectedUser.id}/role`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ role: newRole }),
      })

      if (!response.ok) {
        throw new Error("Failed to update user role")
      }

      // Update the user in the state
      setUsers((prev) => prev.map((user) => (user.id === selectedUser.id ? { ...user, role: newRole } : user)))

      // Log the action
      actionLogRef.current.push({
        action: "change_role",
        userId: Number(selectedUser.id),
        targetUserId: Number(selectedUser.id),
        timestamp: new Date(),
      })

      // Show success toast
      toast({
        title: "Role Updated",
        description: `User role has been updated to ${newRole}`,
        variant: "default",
      })

      // Close the dialog
      setShowRoleDialog(false)
      setSelectedUser(null)
    } catch (err) {
      setError("Failed to update user role. Please try again.")
      console.error(err)
      toast({
        title: "Error",
        description: "Failed to update user role",
        variant: "destructive",
      })
    } finally {
      setProcessing(false)
    }
  }

  const handleExportUsers = () => {
    // Get filtered users
    const dataToExport = getFilteredUsers()

    let exportData
    let fileName
    let fileType

    if (exportFormat === "csv") {
      // Create CSV content
      const headers = ["ID", "Name", "Email", "Role", "Verified", "Balance", "Created At"]
      const csvContent = [
        headers.join(","),
        ...dataToExport.map((user) =>
          [
            user.id,
            `"${user.fullName.replace(/"/g, '""')}"`, // Escape quotes in CSV
            `"${user.email.replace(/"/g, '""')}"`,
            user.role,
            user.isVerified ? "Yes" : "No",
            user.balanceInr,
            new Date(user.createdAt).toISOString(),
          ].join(","),
        ),
      ].join("\n")

      exportData = csvContent
      fileName = `users-export-${new Date().toISOString().split("T")[0]}.csv`
      fileType = "text/csv"
    } else {
      // Create JSON content
      exportData = JSON.stringify(dataToExport, null, 2)
      fileName = `users-export-${new Date().toISOString().split("T")[0]}.json`
      fileType = "application/json"
    }

    // Create download link
    const blob = new Blob([exportData], { type: fileType })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    // Close dialog
    setShowExportDialog(false)

    // Show success toast
    toast({
      title: "Export Successful",
      description: `${dataToExport.length} users exported to ${exportFormat.toUpperCase()}`,
      variant: "default",
    })
  }

  // Apply all filters and sorting
  const getFilteredUsers = () => {
    return users
      .filter((user) => {
        // Apply search filter
        const matchesSearch = !searchQuery
          ? true
          : user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (user.phone && user.phone.includes(searchQuery)) ||
            user.id.toString().includes(searchQuery)

        // Apply role filter
        const matchesRole = roleFilter === "all" ? true : user.role === roleFilter

        // Apply verification filter
        const matchesVerification =
          verificationFilter === "all" ? true : verificationFilter === "verified" ? user.isVerified : !user.isVerified

        return matchesSearch && matchesRole && matchesVerification
      })
      .sort((a, b) => {
        // Apply sorting
        let valueA, valueB

        if (sortColumn === "createdAt" || sortColumn === "updatedAt") {
          valueA = new Date(a[sortColumn]).getTime()
          valueB = new Date(b[sortColumn]).getTime()
        } else if (sortColumn === "balanceInr") {
          valueA = Number.parseFloat(a[sortColumn])
          valueB = Number.parseFloat(b[sortColumn])
        } else {
          valueA = a[sortColumn]
          valueB = b[sortColumn]
        }

        return sortDirection === "asc" ? (valueA > valueB ? 1 : -1) : valueA < valueB ? 1 : -1
      })
  }

  const filteredUsers = getFilteredUsers()

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

  const columns: ColumnDef<UserType>[] = [
    {
      accessorKey: "id",
      header: () => (
        <div className="cursor-pointer flex items-center" onClick={() => handleSort("id")}>
          ID {sortColumn === "id" && (sortDirection === "asc" ? "↑" : "↓")}
        </div>
      ),
    },
    {
      accessorKey: "fullName",
      header: () => (
        <div className="cursor-pointer flex items-center" onClick={() => handleSort("fullName")}>
          Name {sortColumn === "fullName" && (sortDirection === "asc" ? "↑" : "↓")}
        </div>
      ),
    },
    {
      accessorKey: "email",
      header: () => (
        <div className="cursor-pointer flex items-center" onClick={() => handleSort("email")}>
          Email {sortColumn === "email" && (sortDirection === "asc" ? "↑" : "↓")}
        </div>
      ),
    },
    {
      accessorKey: "role",
      header: "Role",
      cell: ({ row }) => (
        <div className="flex items-center">
          <Badge
            variant={
              row.original.role === "admin" ? "default" : row.original.role === "support" ? "outline" : "secondary"
            }
          >
            <span className="capitalize">{row.original.role}</span>
          </Badge>
        </div>
      ),
    },
    {
      accessorKey: "isVerified",
      header: "Verified",
      cell: ({ row }) => (
        <div className="flex items-center">
          {row.original.isVerified ? (
            <div className="flex items-center text-green-600">
              <UserCheck className="mr-1 h-4 w-4" />
              <span>Yes</span>
            </div>
          ) : (
            <div className="flex items-center text-red-600">
              <UserX className="mr-1 h-4 w-4" />
              <span>No</span>
            </div>
          )}
        </div>
      ),
    },
    {
      accessorKey: "balanceInr",
      header: () => (
        <div className="cursor-pointer flex items-center" onClick={() => handleSort("balanceInr")}>
          Balance (INR) {sortColumn === "balanceInr" && (sortDirection === "asc" ? "↑" : "↓")}
        </div>
      ),
      cell: ({ row }) =>
        `₹${Number.parseFloat(row.original.balanceInr).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
    },
    {
      accessorKey: "createdAt",
      header: () => (
        <div className="cursor-pointer flex items-center" onClick={() => handleSort("createdAt")}>
          Registered {sortColumn === "createdAt" && (sortDirection === "asc" ? "↑" : "↓")}
        </div>
      ),
      cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString(),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <Filter className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => handleViewUser(row.original.id)}>
              <Eye className="mr-2 h-4 w-4" /> View Details
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                setSelectedUser(row.original)
                setNewRole(row.original.role)
                setShowRoleDialog(true)
              }}
            >
              <Shield className="mr-2 h-4 w-4" /> Change Role
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push(`/admin/users/${row.original.id}/investments`)}>
              <BarChart3 className="mr-2 h-4 w-4" /> View Investments
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push(`/admin/users/${row.original.id}/transactions`)}>
              <BarChart3 className="mr-2 h-4 w-4" /> View Transactions
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  return (
    <div className="container mx-auto py-8">
      <h1 className="mb-6 text-3xl font-bold">User Management</h1>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users"
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="user">Users</SelectItem>
              <SelectItem value="admin">Admins</SelectItem>
              <SelectItem value="support">Support</SelectItem>
            </SelectContent>
          </Select>

          <Select value={verificationFilter} onValueChange={setVerificationFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by verification" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Users</SelectItem>
              <SelectItem value="verified">Verified Only</SelectItem>
              <SelectItem value="unverified">Unverified Only</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowExportDialog(true)}>
            <Download className="mr-2 h-4 w-4" /> Export
          </Button>
          <Button onClick={fetchUsers}>
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="all" onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="all">All Users</TabsTrigger>
          <TabsTrigger value="recent">Recent (7 days)</TabsTrigger>
          <TabsTrigger value="verified">Verified</TabsTrigger>
          <TabsTrigger value="unverified">Unverified</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Users</span>
                <Badge variant="outline" className="ml-2">
                  {filteredUsers.length} {filteredUsers.length === 1 ? "user" : "users"}
                </Badge>
              </CardTitle>
              <CardDescription>Manage platform users and their permissions</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex h-64 items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <DataTable columns={columns} data={filteredUsers} />
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              <div className="text-sm text-muted-foreground">
                Showing {filteredUsers.length} of {users.length} users
              </div>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Role Change Dialog */}
      <Dialog open={showRoleDialog} onOpenChange={setShowRoleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change User Role</DialogTitle>
            <DialogDescription>
              Update the role for {selectedUser?.fullName} ({selectedUser?.email})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select value={newRole} onValueChange={(value) => setNewRole(value as any)}>
                <SelectTrigger id="role">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="support">Support</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRoleDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleChangeRole} disabled={processing}>
              {processing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Export Dialog */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export Users</DialogTitle>
            <DialogDescription>Export {filteredUsers.length} users to a file</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="exportFormat">Export Format</Label>
              <Select value={exportFormat} onValueChange={(value) => setExportFormat(value as any)}>
                <SelectTrigger id="exportFormat">
                  <SelectValue placeholder="Select format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="json">JSON</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExportDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleExportUsers}>
              <Download className="mr-2 h-4 w-4" /> Export
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
