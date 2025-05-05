"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, AlertCircle, ArrowLeft, UserCheck, UserX, Shield, Wallet, CreditCard, Clock } from "lucide-react"
import { StatusBadge } from "@/components/ui/status-badge"
import { DataTable } from "@/components/ui/data-table"
import type { ColumnDef } from "@tanstack/react-table"

interface User {
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
}

interface Investment {
  id: number
  planId: number
  amount: string
  startDate: string
  endDate: string
  isActive: boolean
  totalInterestEarned: string
  planName: string
}

interface Transaction {
  id: number
  type: "deposit" | "withdrawal"
  amount: string
  status: "pending" | "processing" | "completed" | "failed"
  currency: string
  createdAt: string
}

interface KycRecord {
  id: number
  status: "pending" | "approved" | "rejected"
  createdAt: string
}

export default function AdminUserDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const userId = Number.parseInt(params.id)

  const [user, setUser] = useState<User | null>(null)
  const [investments, setInvestments] = useState<Investment[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [kycRecords, setKycRecords] = useState<KycRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isNaN(userId)) {
      setError("Invalid user ID")
      setLoading(false)
      return
    }

    fetchUserData()
  }, [userId])

  const fetchUserData = async () => {
    setLoading(true)
    setError(null)

    try {
      // Fetch user details
      const userResponse = await fetch(`/api/admin/users/${userId}`)
      if (!userResponse.ok) {
        throw new Error("Failed to fetch user details")
      }
      const userData = await userResponse.json()
      setUser(userData.data.user)
      setInvestments(userData.data.investments)
      setTransactions(userData.data.transactions)
      setKycRecords(userData.data.kycRecords)
    } catch (err) {
      setError("Could not load user data. Please try again later.")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const investmentColumns: ColumnDef<Investment>[] = [
    {
      accessorKey: "id",
      header: "ID",
    },
    {
      accessorKey: "planName",
      header: "Plan",
    },
    {
      accessorKey: "amount",
      header: "Amount",
      cell: ({ row }) =>
        `₹${Number.parseFloat(row.original.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
    },
    {
      accessorKey: "startDate",
      header: "Start Date",
      cell: ({ row }) => new Date(row.original.startDate).toLocaleDateString(),
    },
    {
      accessorKey: "endDate",
      header: "End Date",
      cell: ({ row }) => new Date(row.original.endDate).toLocaleDateString(),
    },
    {
      accessorKey: "isActive",
      header: "Status",
      cell: ({ row }) => <StatusBadge status={row.original.isActive ? "active" : "inactive"} />,
    },
    {
      accessorKey: "totalInterestEarned",
      header: "Interest Earned",
      cell: ({ row }) =>
        `₹${Number.parseFloat(row.original.totalInterestEarned).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
    },
  ]

  const transactionColumns: ColumnDef<Transaction>[] = [
    {
      accessorKey: "id",
      header: "ID",
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => <span className="capitalize">{row.original.type}</span>,
    },
    {
      accessorKey: "amount",
      header: "Amount",
      cell: ({ row }) =>
        `₹${Number.parseFloat(row.original.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
    },
    {
      accessorKey: "currency",
      header: "Currency",
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: "createdAt",
      header: "Date",
      cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString(),
    },
  ]

  const kycColumns: ColumnDef<KycRecord>[] = [
    {
      accessorKey: "id",
      header: "ID",
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: "createdAt",
      header: "Submitted",
      cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString(),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <Button variant="outline" size="sm" onClick={() => router.push(`/admin/users/kyc?id=${row.original.id}`)}>
          View
        </Button>
      ),
    },
  ]

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error || !user) {
    return (
      <div className="container mx-auto py-8">
        <Button variant="outline" className="mb-4" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error || "User not found"}</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8">
      <Button variant="outline" className="mb-4" onClick={() => router.back()}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Back
      </Button>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>{user.fullName}</CardTitle>
            <CardDescription>{user.email}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <div className="text-sm font-medium text-muted-foreground">User ID</div>
                <div>{user.id}</div>
              </div>
              <div className="space-y-1">
                <div className="text-sm font-medium text-muted-foreground">Role</div>
                <div className="flex items-center">
                  <span className="capitalize">{user.role}</span>
                  {user.role === "admin" && <Shield className="ml-1 h-4 w-4 text-blue-500" />}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-sm font-medium text-muted-foreground">Phone</div>
                <div>{user.phone || "Not provided"}</div>
              </div>
              <div className="space-y-1">
                <div className="text-sm font-medium text-muted-foreground">Verification Status</div>
                <div className="flex items-center">
                  {user.isVerified ? (
                    <div className="flex items-center text-green-600">
                      <UserCheck className="mr-1 h-4 w-4" />
                      <span>Verified</span>
                    </div>
                  ) : (
                    <div className="flex items-center text-red-600">
                      <UserX className="mr-1 h-4 w-4" />
                      <span>Not Verified</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-sm font-medium text-muted-foreground">2FA Status</div>
                <div>{user.twoFactorEnabled ? "Enabled" : "Disabled"}</div>
              </div>
              <div className="space-y-1">
                <div className="text-sm font-medium text-muted-foreground">Referral Code</div>
                <div>{user.referralCode || "None"}</div>
              </div>
              <div className="space-y-1">
                <div className="text-sm font-medium text-muted-foreground">Referred By</div>
                <div>
                  {user.referredBy ? (
                    <Button
                      variant="link"
                      className="h-auto p-0"
                      onClick={() => router.push(`/admin/users/${user.referredBy}`)}
                    >
                      User #{user.referredBy}
                    </Button>
                  ) : (
                    "None"
                  )}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-sm font-medium text-muted-foreground">Registered On</div>
                <div>{new Date(user.createdAt).toLocaleString()}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Balance</CardTitle>
            <CardDescription>User's current balance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center">
              <Wallet className="mr-2 h-6 w-6 text-primary" />
              <span className="text-3xl font-bold">
                ₹{Number.parseFloat(user.balanceInr).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </CardContent>
          <CardFooter className="flex justify-center gap-2">
            <Button variant="outline" size="sm" onClick={() => router.push(`/admin/users/${userId}/transactions`)}>
              <Clock className="mr-2 h-4 w-4" /> Transaction History
            </Button>
          </CardFooter>
        </Card>
      </div>

      <Tabs defaultValue="investments" className="mt-6">
        <TabsList>
          <TabsTrigger value="investments">Investments</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="kyc">KYC Records</TabsTrigger>
        </TabsList>

        <TabsContent value="investments">
          <Card>
            <CardHeader>
              <CardTitle>Investments</CardTitle>
              <CardDescription>User's investment portfolio</CardDescription>
            </CardHeader>
            <CardContent>
              {investments.length === 0 ? (
                <div className="flex h-24 items-center justify-center text-muted-foreground">
                  <CreditCard className="mr-2 h-5 w-5" />
                  No investments found
                </div>
              ) : (
                <DataTable columns={investmentColumns} data={investments} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions">
          <Card>
            <CardHeader>
              <CardTitle>Transactions</CardTitle>
              <CardDescription>User's deposit and withdrawal history</CardDescription>
            </CardHeader>
            <CardContent>
              {transactions.length === 0 ? (
                <div className="flex h-24 items-center justify-center text-muted-foreground">
                  <Wallet className="mr-2 h-5 w-5" />
                  No transactions found
                </div>
              ) : (
                <DataTable columns={transactionColumns} data={transactions} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="kyc">
          <Card>
            <CardHeader>
              <CardTitle>KYC Records</CardTitle>
              <CardDescription>User's verification history</CardDescription>
            </CardHeader>
            <CardContent>
              {kycRecords.length === 0 ? (
                <div className="flex h-24 items-center justify-center text-muted-foreground">
                  <UserCheck className="mr-2 h-5 w-5" />
                  No KYC records found
                </div>
              ) : (
                <DataTable columns={kycColumns} data={kycRecords} />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
