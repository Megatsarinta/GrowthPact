"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DataTable } from "@/components/ui/data-table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, CheckCircle, XCircle } from "lucide-react"
import { formatCurrency, formatDate } from "@/lib/utils"
import { useToast } from "@/components/ui/use-toast"
import type { ColumnDef } from "@tanstack/react-table"

interface Withdrawal {
  id: number
  userId: number
  user?: {
    email: string
    fullName: string
  }
  currency: string
  amountInr: string
  fee: string
  amountCrypto: string | null
  status: "pending" | "processing" | "completed" | "failed"
  txReference: string | null
  walletAddress: string | null
  createdAt: string
  updatedAt: string
  rejectionReason: string | null
}

export default function AdminWithdrawalsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<Withdrawal | null>(null)
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false)
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [txReference, setTxReference] = useState("")
  const [rejectionReason, setRejectionReason] = useState("")
  const [activeTab, setActiveTab] = useState("pending")

  useEffect(() => {
    fetchWithdrawals()
  }, [activeTab])

  async function fetchWithdrawals() {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/admin/withdrawals?status=${activeTab}`)
      if (!response.ok) {
        throw new Error("Failed to fetch withdrawals")
      }
      const data = await response.json()
      setWithdrawals(data.data)
    } catch (error) {
      console.error("Error fetching withdrawals:", error)
      toast({
        title: "Error",
        description: "Failed to fetch withdrawals",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  async function handleApproveWithdrawal() {
    if (!selectedWithdrawal) return

    setIsProcessing(true)
    try {
      const response = await fetch(`/api/admin/withdrawals/${selectedWithdrawal.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "approve",
          txReference: txReference || undefined,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to approve withdrawal")
      }

      toast({
        title: "Withdrawal Approved",
        description: `Withdrawal #${selectedWithdrawal.id} has been approved and is now processing.`,
        variant: "default",
      })

      // Refresh the list
      fetchWithdrawals()
    } catch (error) {
      console.error("Error approving withdrawal:", error)
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
      setIsApproveDialogOpen(false)
      setTxReference("")
      setSelectedWithdrawal(null)
    }
  }

  async function handleRejectWithdrawal() {
    if (!selectedWithdrawal) return

    setIsProcessing(true)
    try {
      const response = await fetch(`/api/admin/withdrawals/${selectedWithdrawal.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "reject",
          rejectionReason: rejectionReason || undefined,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to reject withdrawal")
      }

      toast({
        title: "Withdrawal Rejected",
        description: `Withdrawal #${selectedWithdrawal.id} has been rejected and funds returned to the user.`,
        variant: "default",
      })

      // Refresh the list
      fetchWithdrawals()
    } catch (error) {
      console.error("Error rejecting withdrawal:", error)
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
      setIsRejectDialogOpen(false)
      setRejectionReason("")
      setSelectedWithdrawal(null)
    }
  }

  function viewUserDetails(userId: number) {
    router.push(`/admin/users/${userId}`)
  }

  // Define columns for withdrawals table
  const columns: ColumnDef<Withdrawal>[] = [
    {
      accessorKey: "id",
      header: "ID",
    },
    {
      accessorKey: "user",
      header: "User",
      cell: ({ row }) => {
        const userId = row.original.userId
        const user = row.original.user
        return (
          <div>
            {user ? (
              <div className="flex flex-col">
                <span className="font-medium">{user.fullName}</span>
                <span className="text-xs text-muted-foreground">{user.email}</span>
              </div>
            ) : (
              <span className="text-muted-foreground">User ID: {userId}</span>
            )}
            <Button variant="link" size="sm" className="h-auto p-0" onClick={() => viewUserDetails(userId)}>
              View User
            </Button>
          </div>
        )
      },
    },
    {
      accessorKey: "currency",
      header: "Currency",
    },
    {
      accessorKey: "amountInr",
      header: "Amount (INR)",
      cell: ({ row }) => `₹${formatCurrency(row.original.amountInr)}`,
    },
    {
      accessorKey: "fee",
      header: "Fee",
      cell: ({ row }) => `₹${formatCurrency(row.original.fee || "0")}`,
    },
    {
      accessorKey: "walletAddress",
      header: "Wallet Address",
      cell: ({ row }) => {
        const address = row.original.walletAddress
        if (!address) return "N/A"
        return (
          <div className="max-w-[200px] truncate" title={address}>
            {address}
          </div>
        )
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.original.status
        return (
          <div
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
              status === "completed"
                ? "bg-green-100 text-green-800"
                : status === "pending"
                  ? "bg-yellow-100 text-yellow-800"
                  : status === "processing"
                    ? "bg-blue-100 text-blue-800"
                    : "bg-red-100 text-red-800"
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </div>
        )
      },
    },
    {
      accessorKey: "createdAt",
      header: "Date",
      cell: ({ row }) => formatDate(row.original.createdAt),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const withdrawal = row.original
        if (withdrawal.status === "pending") {
          return (
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 bg-green-50 text-green-600 hover:bg-green-100 hover:text-green-700"
                onClick={() => {
                  setSelectedWithdrawal(withdrawal)
                  setIsApproveDialogOpen(true)
                }}
              >
                <CheckCircle className="mr-1 h-4 w-4" />
                Approve
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700"
                onClick={() => {
                  setSelectedWithdrawal(withdrawal)
                  setIsRejectDialogOpen(true)
                }}
              >
                <XCircle className="mr-1 h-4 w-4" />
                Reject
              </Button>
            </div>
          )
        }
        return null
      },
    },
  ]

  return (
    <div className="container mx-auto py-8">
      <h1 className="mb-6 text-3xl font-bold">Manage Withdrawals</h1>

      <Tabs defaultValue="pending" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="processing">Processing</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="failed">Failed</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab}>
          <Card>
            <CardHeader>
              <CardTitle>{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Withdrawals</CardTitle>
              <CardDescription>
                {activeTab === "pending"
                  ? "Review and approve or reject pending withdrawal requests."
                  : activeTab === "processing"
                    ? "Withdrawals that are currently being processed."
                    : activeTab === "completed"
                      ? "Successfully completed withdrawals."
                      : activeTab === "failed"
                        ? "Failed or rejected withdrawals."
                        : "All withdrawal requests."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : withdrawals.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  No {activeTab !== "all" ? activeTab : ""} withdrawals found.
                </div>
              ) : (
                <DataTable
                  columns={columns}
                  data={withdrawals}
                  searchColumn="user.email"
                  searchPlaceholder="Search by user email..."
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Approve Withdrawal Dialog */}
      <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Withdrawal</DialogTitle>
            <DialogDescription>
              Are you sure you want to approve this withdrawal request? This will initiate the transfer process.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="amount" className="text-right">
                Amount
              </Label>
              <div className="col-span-3">
                <p id="amount" className="font-medium">
                  ₹{formatCurrency(selectedWithdrawal?.amountInr || "0")} {selectedWithdrawal?.currency}
                </p>
              </div>
            </div>
            {selectedWithdrawal?.currency === "USDT" && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="wallet" className="text-right">
                  Wallet
                </Label>
                <div className="col-span-3">
                  <p id="wallet" className="font-medium break-all">
                    {selectedWithdrawal?.walletAddress}
                  </p>
                </div>
              </div>
            )}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="txReference" className="text-right">
                Transaction Reference
              </Label>
              <Input
                id="txReference"
                value={txReference}
                onChange={(e) => setTxReference(e.target.value)}
                placeholder="Optional reference ID"
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsApproveDialogOpen(false)} disabled={isProcessing}>
              Cancel
            </Button>
            <Button onClick={handleApproveWithdrawal} disabled={isProcessing}>
              {isProcessing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="mr-2 h-4 w-4" />
              )}{" "}
              Approve Withdrawal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Withdrawal Dialog */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Withdrawal</DialogTitle>
            <DialogDescription>
              Are you sure you want to reject this withdrawal request? The funds will be returned to the user's account.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="reject-amount" className="text-right">
                Amount
              </Label>
              <div className="col-span-3">
                <p id="reject-amount" className="font-medium">
                  ₹{formatCurrency(selectedWithdrawal?.amountInr || "0")} {selectedWithdrawal?.currency}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="rejectionReason" className="text-right">
                Reason
              </Label>
              <Textarea
                id="rejectionReason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Reason for rejection (optional)"
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRejectDialogOpen(false)} disabled={isProcessing}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRejectWithdrawal} disabled={isProcessing}>
              {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />}{" "}
              Reject Withdrawal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
