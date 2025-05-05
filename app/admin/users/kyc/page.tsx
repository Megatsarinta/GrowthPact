"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { StatusBadge } from "@/components/ui/status-badge"
import {
  Loader2,
  AlertCircle,
  Search,
  CheckCircle,
  XCircle,
  Eye,
  ArrowLeft,
  FileText,
  Camera,
  Home,
} from "lucide-react"
import { DataTable } from "@/components/ui/data-table"
import type { ColumnDef } from "@tanstack/react-table"
import { useToast } from "@/components/ui/use-toast"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface KycRecord {
  id: number
  userId: number
  status: "pending" | "approved" | "rejected"
  idDocumentFront: string | null
  idDocumentBack: string | null
  selfieDocument: string | null
  addressDocument: string | null
  rejectionReason: string | null
  createdAt: string
  updatedAt: string
  metadata?: {
    documentType?: string
    documentNumber?: string
    address?: string
  }
  user?: {
    email: string
    fullName: string
  }
}

export default function AdminKycPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [kycRecords, setKycRecords] = useState<KycRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedRecord, setSelectedRecord] = useState<KycRecord | null>(null)
  const [rejectionReason, setRejectionReason] = useState("")
  const [processing, setProcessing] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("pending")
  const [showApproveDialog, setShowApproveDialog] = useState(false)
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewTitle, setPreviewTitle] = useState("")
  const [sortColumn, setSortColumn] = useState<string>("createdAt")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")

  // Refs for tracking audit logs
  const actionLogRef = useRef<
    {
      action: string
      kycId: number
      userId: number
      timestamp: Date
    }[]
  >([])

  useEffect(() => {
    // Check if we have a specific KYC ID to view
    const kycId = searchParams.get("id")
    if (kycId) {
      fetchKycRecord(Number(kycId))
    } else {
      fetchKycRecords()
    }
  }, [activeTab, searchParams])

  const fetchKycRecords = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/admin/kyc?status=${activeTab}`)
      if (!response.ok) {
        throw new Error("Failed to fetch KYC records")
      }

      const data = await response.json()
      setKycRecords(data.data)
    } catch (err) {
      setError("Could not load KYC records. Please try again later.")
      console.error(err)
      toast({
        title: "Error",
        description: "Failed to load KYC records",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchKycRecord = async (id: number) => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/admin/kyc/${id}`)
      if (!response.ok) {
        throw new Error("Failed to fetch KYC record")
      }

      const data = await response.json()
      setSelectedRecord(data.data)

      // Set the active tab based on the record's status
      setActiveTab(data.data.status)
    } catch (err) {
      setError("Could not load KYC record. Please try again later.")
      console.error(err)
      toast({
        title: "Error",
        description: "Failed to load KYC record",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (id: number) => {
    setProcessing(true)
    try {
      const response = await fetch(`/api/admin/kyc/${id}/approve`, {
        method: "POST",
      })

      if (!response.ok) {
        throw new Error("Failed to approve KYC record")
      }

      // Update the record in the state
      setKycRecords((prev) => prev.filter((record) => record.id !== id))

      // Log the action
      actionLogRef.current.push({
        action: "approve_kyc",
        kycId: id,
        userId: selectedRecord?.userId || 0,
        timestamp: new Date(),
      })

      // Show success toast
      toast({
        title: "KYC Approved",
        description: "The KYC verification has been approved successfully.",
        variant: "default",
      })

      // Clear the selected record
      setSelectedRecord(null)
      setShowApproveDialog(false)
    } catch (err) {
      setError("Failed to approve KYC record. Please try again.")
      console.error(err)
      toast({
        title: "Error",
        description: "Failed to approve KYC record",
        variant: "destructive",
      })
    } finally {
      setProcessing(false)
    }
  }

  const handleReject = async (id: number) => {
    if (!rejectionReason.trim()) {
      toast({
        title: "Validation Error",
        description: "Please provide a reason for rejection",
        variant: "destructive",
      })
      return
    }

    setProcessing(true)
    try {
      const response = await fetch(`/api/admin/kyc/${id}/reject`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reason: rejectionReason }),
      })

      if (!response.ok) {
        throw new Error("Failed to reject KYC record")
      }

      // Update the record in the state
      setKycRecords((prev) => prev.filter((record) => record.id !== id))

      // Log the action
      actionLogRef.current.push({
        action: "reject_kyc",
        kycId: id,
        userId: selectedRecord?.userId || 0,
        timestamp: new Date(),
      })

      // Show success toast
      toast({
        title: "KYC Rejected",
        description: "The KYC verification has been rejected with the provided reason.",
        variant: "default",
      })

      // Clear the selected record and rejection reason
      setSelectedRecord(null)
      setRejectionReason("")
      setShowRejectDialog(false)
    } catch (err) {
      setError("Failed to reject KYC record. Please try again.")
      console.error(err)
      toast({
        title: "Error",
        description: "Failed to reject KYC record",
        variant: "destructive",
      })
    } finally {
      setProcessing(false)
    }
  }

  // Handle document preview
  const handlePreview = (url: string | null, title: string) => {
    if (!url) return
    setPreviewImage(url)
    setPreviewTitle(title)
    setPreviewOpen(true)
  }

  const filteredRecords = kycRecords.filter((record) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      record.user?.email.toLowerCase().includes(query) ||
      record.user?.fullName.toLowerCase().includes(query) ||
      record.id.toString().includes(query) ||
      record.userId.toString().includes(query)
    )
  })

  // Sort records
  const sortedRecords = [...filteredRecords].sort((a, b) => {
    let valueA, valueB

    // Handle different column types
    if (sortColumn === "createdAt" || sortColumn === "updatedAt") {
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

    // Compare based on direction
    if (sortDirection === "asc") {
      return valueA > valueB ? 1 : -1
    } else {
      return valueA < valueB ? 1 : -1
    }
  })

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

  const columns: ColumnDef<KycRecord>[] = [
    {
      accessorKey: "id",
      header: () => (
        <div className="cursor-pointer flex items-center" onClick={() => handleSort("id")}>
          ID {sortColumn === "id" && (sortDirection === "asc" ? "↑" : "↓")}
        </div>
      ),
    },
    {
      accessorKey: "user.fullName",
      header: () => (
        <div className="cursor-pointer flex items-center" onClick={() => handleSort("user.fullName")}>
          User Name {sortColumn === "user.fullName" && (sortDirection === "asc" ? "↑" : "↓")}
        </div>
      ),
    },
    {
      accessorKey: "user.email",
      header: () => (
        <div className="cursor-pointer flex items-center" onClick={() => handleSort("user.email")}>
          Email {sortColumn === "user.email" && (sortDirection === "asc" ? "↑" : "↓")}
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: "createdAt",
      header: () => (
        <div className="cursor-pointer flex items-center" onClick={() => handleSort("createdAt")}>
          Submitted {sortColumn === "createdAt" && (sortDirection === "asc" ? "↑" : "↓")}
        </div>
      ),
      cell: ({ row }) => new Date(row.original.createdAt).toLocaleString(),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" onClick={() => setSelectedRecord(row.original)}>
            <Eye className="mr-1 h-4 w-4" /> Review
          </Button>
          {row.original.status === "pending" && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="text-green-600 hover:bg-green-50 hover:text-green-700"
                onClick={() => {
                  setSelectedRecord(row.original)
                  setShowApproveDialog(true)
                }}
              >
                <CheckCircle className="mr-1 h-4 w-4" /> Approve
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-red-600 hover:bg-red-50 hover:text-red-700"
                onClick={() => {
                  setSelectedRecord(row.original)
                  setShowRejectDialog(true)
                }}
              >
                <XCircle className="mr-1 h-4 w-4" /> Reject
              </Button>
            </>
          )}
        </div>
      ),
    },
  ]

  // Render KYC detail view
  const renderKycDetail = () => {
    if (!selectedRecord) return null

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={() => setSelectedRecord(null)}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to List
          </Button>
          <StatusBadge status={selectedRecord.status} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>User Information</CardTitle>
            <CardDescription>Details of the user who submitted this KYC verification</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <Label>User ID</Label>
              <div className="rounded-md bg-muted p-2 text-sm">{selectedRecord.userId}</div>
            </div>
            <div className="space-y-1">
              <Label>Full Name</Label>
              <div className="rounded-md bg-muted p-2 text-sm">{selectedRecord.user?.fullName || "N/A"}</div>
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <div className="rounded-md bg-muted p-2 text-sm">{selectedRecord.user?.email || "N/A"}</div>
            </div>
            <div className="space-y-1">
              <Label>Submission Date</Label>
              <div className="rounded-md bg-muted p-2 text-sm">
                {new Date(selectedRecord.createdAt).toLocaleString()}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Document Information</CardTitle>
            <CardDescription>Details of the submitted documents</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <Label>Document Type</Label>
              <div className="rounded-md bg-muted p-2 text-sm capitalize">
                {selectedRecord.metadata?.documentType?.replace("_", " ") || "N/A"}
              </div>
            </div>
            <div className="space-y-1">
              <Label>Document Number</Label>
              <div className="rounded-md bg-muted p-2 text-sm">{selectedRecord.metadata?.documentNumber || "N/A"}</div>
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>Address</Label>
              <div className="rounded-md bg-muted p-2 text-sm">{selectedRecord.metadata?.address || "N/A"}</div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="mr-2 h-5 w-5" /> ID Document (Front)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-hidden rounded-md border">
                {selectedRecord.idDocumentFront ? (
                  <div className="relative aspect-video bg-muted">
                    <div className="flex h-full items-center justify-center">
                      <Button
                        variant="outline"
                        onClick={() => handlePreview(selectedRecord.idDocumentFront, "ID Document (Front)")}
                      >
                        <Eye className="mr-2 h-4 w-4" /> View Document
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex aspect-video items-center justify-center bg-muted">
                    <p className="text-sm text-muted-foreground">No document uploaded</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="mr-2 h-5 w-5" /> ID Document (Back)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-hidden rounded-md border">
                {selectedRecord.idDocumentBack ? (
                  <div className="relative aspect-video bg-muted">
                    <div className="flex h-full items-center justify-center">
                      <Button
                        variant="outline"
                        onClick={() => handlePreview(selectedRecord.idDocumentBack, "ID Document (Back)")}
                      >
                        <Eye className="mr-2 h-4 w-4" /> View Document
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex aspect-video items-center justify-center bg-muted">
                    <p className="text-sm text-muted-foreground">No document uploaded</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Camera className="mr-2 h-5 w-5" /> Selfie with ID
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-hidden rounded-md border">
                {selectedRecord.selfieDocument ? (
                  <div className="relative aspect-video bg-muted">
                    <div className="flex h-full items-center justify-center">
                      <Button
                        variant="outline"
                        onClick={() => handlePreview(selectedRecord.selfieDocument, "Selfie with ID")}
                      >
                        <Eye className="mr-2 h-4 w-4" /> View Document
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex aspect-video items-center justify-center bg-muted">
                    <p className="text-sm text-muted-foreground">No document uploaded</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Home className="mr-2 h-5 w-5" /> Address Proof
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-hidden rounded-md border">
                {selectedRecord.addressDocument ? (
                  <div className="relative aspect-video bg-muted">
                    <div className="flex h-full items-center justify-center">
                      <Button
                        variant="outline"
                        onClick={() => handlePreview(selectedRecord.addressDocument, "Address Proof")}
                      >
                        <Eye className="mr-2 h-4 w-4" /> View Document
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex aspect-video items-center justify-center bg-muted">
                    <p className="text-sm text-muted-foreground">No document uploaded</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {selectedRecord.status === "rejected" && selectedRecord.rejectionReason && (
          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="text-red-700">Rejection Reason</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-red-700">{selectedRecord.rejectionReason}</p>
            </CardContent>
          </Card>
        )}

        {selectedRecord.status === "pending" && (
          <Card>
            <CardHeader>
              <CardTitle>Review Decision</CardTitle>
              <CardDescription>Approve or reject this KYC verification</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="rejectionReason">Rejection Reason (Required for rejection)</Label>
                <Textarea
                  id="rejectionReason"
                  placeholder="Provide a reason for rejection"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                />
              </div>
            </CardContent>
            <CardFooter className="flex justify-end space-x-2">
              <Button
                variant="outline"
                className="border-red-200 bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-800"
                onClick={() => setShowRejectDialog(true)}
                disabled={processing}
              >
                <XCircle className="mr-2 h-4 w-4" /> Reject
              </Button>
              <Button
                variant="outline"
                className="border-green-200 bg-green-50 text-green-700 hover:bg-green-100 hover:text-green-800"
                onClick={() => setShowApproveDialog(true)}
                disabled={processing}
              >
                <CheckCircle className="mr-2 h-4 w-4" /> Approve
              </Button>
            </CardFooter>
          </Card>
        )}
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="mb-6 text-3xl font-bold">KYC Verification Management</h1>

      {selectedRecord ? (
        renderKycDetail()
      ) : (
        <>
          <div className="mb-6 flex items-center justify-between">
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email"
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button onClick={fetchKycRecords}>Refresh</Button>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Tabs defaultValue="pending" onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="approved">Approved</TabsTrigger>
              <TabsTrigger value="rejected">Rejected</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab}>
              {loading ? (
                <div className="flex h-64 items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <DataTable columns={columns} data={sortedRecords} />
              )}
            </TabsContent>
          </Tabs>
        </>
      )}

      {/* Document Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{previewTitle}</DialogTitle>
            <DialogDescription>Document preview</DialogDescription>
          </DialogHeader>
          <div className="relative aspect-video w-full overflow-hidden rounded-md border">
            {previewImage && (
              <div className="flex h-full items-center justify-center bg-muted">
                <img
                  src={previewImage || "/placeholder.svg"}
                  alt={previewTitle}
                  className="max-h-full max-w-full object-contain p-2"
                />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Approve Confirmation Dialog */}
      <AlertDialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve KYC Verification</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to approve this KYC verification? This will grant the user full access to the
              platform.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedRecord && handleApprove(selectedRecord.id)}
              disabled={processing}
              className="bg-green-600 text-white hover:bg-green-700"
            >
              {processing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Approve
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Confirmation Dialog */}
      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject KYC Verification</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to reject this KYC verification? The user will be notified with the reason provided.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="confirmRejectionReason" className="mb-2 block">
              Rejection Reason <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="confirmRejectionReason"
              placeholder="Provide a clear reason for rejection"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="mb-2"
            />
            {!rejectionReason.trim() && <p className="text-sm text-red-500">A rejection reason is required</p>}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedRecord && handleReject(selectedRecord.id)}
              disabled={processing || !rejectionReason.trim()}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {processing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Reject
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
