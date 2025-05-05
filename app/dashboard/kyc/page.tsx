"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { StatusBadge } from "@/components/ui/status-badge"
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  Upload,
  FileText,
  Camera,
  Home,
  RefreshCw,
  Eye,
  X,
  Info,
} from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

// Define the KYC record interface
interface KycRecord {
  id: number
  status: "pending" | "approved" | "rejected"
  idDocumentFront: string | null
  idDocumentBack: string | null
  selfieDocument: string | null
  addressDocument: string | null
  rejectionReason: string | null
  createdAt: string
  updatedAt: string
}

// Form validation schema
const kycFormSchema = z.object({
  documentType: z.enum(["passport", "national_id", "drivers_license"], {
    required_error: "Please select a document type",
  }),
  documentNumber: z.string().min(3, "Document number must be at least 3 characters"),
  address: z.string().min(10, "Address must be at least 10 characters"),
  idFront: z
    .instanceof(File, { message: "Front ID document is required" })
    .refine((file) => file.size > 0, "Front ID document is required")
    .refine((file) => file.size <= 5 * 1024 * 1024, "File must be less than 5MB")
    .refine(
      (file) => ["image/jpeg", "image/png", "image/jpg", "application/pdf"].includes(file.type),
      "File must be JPEG, PNG or PDF",
    ),
  idBack: z
    .instanceof(File, { message: "Back ID document is required" })
    .refine((file) => file.size > 0, "Back ID document is required")
    .refine((file) => file.size <= 5 * 1024 * 1024, "File must be less than 5MB")
    .refine(
      (file) => ["image/jpeg", "image/png", "image/jpg", "application/pdf"].includes(file.type),
      "File must be JPEG, PNG or PDF",
    ),
  selfie: z
    .instanceof(File, { message: "Selfie is required" })
    .refine((file) => file.size > 0, "Selfie is required")
    .refine((file) => file.size <= 5 * 1024 * 1024, "File must be less than 5MB")
    .refine((file) => ["image/jpeg", "image/png", "image/jpg"].includes(file.type), "File must be JPEG or PNG"),
  addressProof: z
    .instanceof(File, { message: "Address proof is required" })
    .refine((file) => file.size > 0, "Address proof is required")
    .refine((file) => file.size <= 5 * 1024 * 1024, "File must be less than 5MB")
    .refine(
      (file) => ["image/jpeg", "image/png", "image/jpg", "application/pdf"].includes(file.type),
      "File must be JPEG, PNG or PDF",
    ),
})

export default function KycVerificationPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [kycRecord, setKycRecord] = useState<KycRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState("status")
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewTitle, setPreviewTitle] = useState("")

  // File input refs for resetting
  const idFrontRef = useRef<HTMLInputElement>(null)
  const idBackRef = useRef<HTMLInputElement>(null)
  const selfieRef = useRef<HTMLInputElement>(null)
  const addressProofRef = useRef<HTMLInputElement>(null)

  // Initialize form
  const form = useForm<z.infer<typeof kycFormSchema>>({
    resolver: zodResolver(kycFormSchema),
    defaultValues: {
      documentType: undefined,
      documentNumber: "",
      address: "",
    },
  })

  // Fetch KYC status on component mount
  useEffect(() => {
    fetchKycStatus()
  }, [])

  const fetchKycStatus = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/kyc/status")
      if (!response.ok) {
        throw new Error("Failed to fetch KYC status")
      }

      const data = await response.json()
      setKycRecord(data.data)

      // Set active tab based on KYC status
      if (data.data) {
        if (data.data.status === "rejected") {
          setActiveTab("submit")
        } else {
          setActiveTab("status")
        }
      } else {
        setActiveTab("submit")
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Could not load KYC status. Please try again later.",
        variant: "destructive",
      })
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Handle file preview
  const handlePreview = (url: string | null, title: string) => {
    if (!url) return
    setPreviewImage(url)
    setPreviewTitle(title)
    setPreviewOpen(true)
  }

  // Handle form submission
  const onSubmit = async (values: z.infer<typeof kycFormSchema>) => {
    setSubmitting(true)

    try {
      // Create form data
      const formData = new FormData()
      formData.append("documentType", values.documentType)
      formData.append("documentNumber", values.documentNumber)
      formData.append("address", values.address)
      formData.append("idFront", values.idFront)
      formData.append("idBack", values.idBack)
      formData.append("selfie", values.selfie)
      formData.append("addressProof", values.addressProof)

      const response = await fetch("/api/kyc/submit", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to submit KYC documents")
      }

      const data = await response.json()
      setKycRecord(data.data)

      // Show success toast
      toast({
        title: "KYC Submitted",
        description: "Your KYC documents have been submitted successfully and are pending review.",
        variant: "default",
      })

      // Reset form and switch to status tab
      form.reset()
      setActiveTab("status")

      // Reset file inputs
      if (idFrontRef.current) idFrontRef.current.value = ""
      if (idBackRef.current) idBackRef.current.value = ""
      if (selfieRef.current) selfieRef.current.value = ""
      if (addressProofRef.current) addressProofRef.current.value = ""
    } catch (err) {
      toast({
        title: "Submission Failed",
        description: err.message || "An error occurred while submitting your KYC documents",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  // Render KYC status card
  const renderKycStatus = () => {
    if (!kycRecord) {
      return (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>No KYC Record</AlertTitle>
          <AlertDescription>
            You haven't submitted your KYC documents yet. Please complete the verification process to unlock all
            platform features.
          </AlertDescription>
        </Alert>
      )
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>KYC Verification Status</span>
            <StatusBadge status={kycRecord.status} />
          </CardTitle>
          <CardDescription>Your know-your-customer verification details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {kycRecord.status === "rejected" && kycRecord.rejectionReason && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Verification Rejected</AlertTitle>
              <AlertDescription>Reason: {kycRecord.rejectionReason}</AlertDescription>
            </Alert>
          )}

          {kycRecord.status === "approved" && (
            <Alert className="border-green-500 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <AlertTitle className="text-green-700">Verification Approved</AlertTitle>
              <AlertDescription className="text-green-700">
                Your KYC verification has been approved. You now have full access to all platform features.
              </AlertDescription>
            </Alert>
          )}

          {kycRecord.status === "pending" && (
            <Alert className="border-yellow-500 bg-yellow-50">
              <Info className="h-4 w-4 text-yellow-500" />
              <AlertTitle className="text-yellow-700">Verification Pending</AlertTitle>
              <AlertDescription className="text-yellow-700">
                Your KYC verification is currently under review. This process typically takes 24-48 hours.
              </AlertDescription>
            </Alert>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <div className="font-medium">ID Document (Front)</div>
              <div className="flex items-center gap-2 rounded-md bg-muted p-2 text-sm">
                <span>{kycRecord.idDocumentFront ? "Uploaded" : "Not uploaded"}</span>
                {kycRecord.idDocumentFront && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-auto h-6 w-6 p-0"
                    onClick={() => handlePreview(kycRecord.idDocumentFront, "ID Document (Front)")}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <div className="font-medium">ID Document (Back)</div>
              <div className="flex items-center gap-2 rounded-md bg-muted p-2 text-sm">
                <span>{kycRecord.idDocumentBack ? "Uploaded" : "Not uploaded"}</span>
                {kycRecord.idDocumentBack && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-auto h-6 w-6 p-0"
                    onClick={() => handlePreview(kycRecord.idDocumentBack, "ID Document (Back)")}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <div className="font-medium">Selfie Verification</div>
              <div className="flex items-center gap-2 rounded-md bg-muted p-2 text-sm">
                <span>{kycRecord.selfieDocument ? "Uploaded" : "Not uploaded"}</span>
                {kycRecord.selfieDocument && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-auto h-6 w-6 p-0"
                    onClick={() => handlePreview(kycRecord.selfieDocument, "Selfie Verification")}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <div className="font-medium">Address Proof</div>
              <div className="flex items-center gap-2 rounded-md bg-muted p-2 text-sm">
                <span>{kycRecord.addressDocument ? "Uploaded" : "Not uploaded"}</span>
                {kycRecord.addressDocument && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-auto h-6 w-6 p-0"
                    onClick={() => handlePreview(kycRecord.addressDocument, "Address Proof")}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="font-medium">Submission Date</div>
            <div className="rounded-md bg-muted p-2 text-sm">{new Date(kycRecord.createdAt).toLocaleString()}</div>
          </div>

          {kycRecord.status === "rejected" && (
            <Button className="w-full" onClick={() => setActiveTab("submit")} variant="default">
              <RefreshCw className="mr-2 h-4 w-4" />
              Resubmit Documents
            </Button>
          )}
        </CardContent>
      </Card>
    )
  }

  // Render KYC submission form
  const renderKycForm = () => {
    // Don't show the form if already approved
    if (kycRecord?.status === "approved") {
      return (
        <Alert className="border-green-500 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <AlertTitle className="text-green-700">Already Verified</AlertTitle>
          <AlertDescription className="text-green-700">
            Your KYC verification has already been approved. No further action is needed.
          </AlertDescription>
        </Alert>
      )
    }

    // Don't show the form if pending, unless rejected
    if (kycRecord?.status === "pending" && kycRecord?.status !== "rejected") {
      return (
        <Alert className="border-yellow-500 bg-yellow-50">
          <Info className="h-4 w-4 text-yellow-500" />
          <AlertTitle className="text-yellow-700">Verification In Progress</AlertTitle>
          <AlertDescription className="text-yellow-700">
            Your KYC verification is currently under review. You cannot submit new documents at this time.
          </AlertDescription>
        </Alert>
      )
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle>Submit KYC Documents</CardTitle>
          <CardDescription>
            Please upload clear, high-quality images of the following documents to verify your identity.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="documentType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Document Type <span className="text-red-500">*</span>
                      </FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select document type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="passport">Passport</SelectItem>
                          <SelectItem value="national_id">National ID Card</SelectItem>
                          <SelectItem value="drivers_license">Driver's License</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>Choose the type of ID document you'll be uploading</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="documentNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Document Number <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="Enter document number" {...field} />
                      </FormControl>
                      <FormDescription>Enter the ID number exactly as it appears on your document</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Residential Address <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter your full address including city, state/province, and postal code"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>This should match the address on your proof of address document</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-6 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="idFront"
                  render={({ field: { value, onChange, ...fieldProps } }) => (
                    <FormItem>
                      <FormLabel>
                        ID Document (Front) <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <div className="flex flex-col items-center gap-4">
                          <div className="flex h-40 w-full cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100">
                            <div className="flex flex-col items-center justify-center p-4 text-center">
                              <FileText className="mb-2 h-8 w-8 text-gray-400" />
                              <p className="mb-1 text-sm font-medium text-gray-700">
                                {value instanceof File && value.name ? value.name : "Click to upload"}
                              </p>
                              <p className="text-xs text-gray-500">PNG, JPG or PDF (max 5MB)</p>
                            </div>
                            <Input
                              type="file"
                              ref={idFrontRef}
                              accept="image/png,image/jpeg,image/jpg,application/pdf"
                              className="absolute h-full w-full cursor-pointer opacity-0"
                              onChange={(e) => {
                                const file = e.target.files?.[0]
                                if (file) onChange(file)
                              }}
                              {...fieldProps}
                            />
                          </div>
                        </div>
                      </FormControl>
                      <FormDescription>Upload a clear photo of the front of your ID document</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="idBack"
                  render={({ field: { value, onChange, ...fieldProps } }) => (
                    <FormItem>
                      <FormLabel>
                        ID Document (Back) <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <div className="flex flex-col items-center gap-4">
                          <div className="flex h-40 w-full cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100">
                            <div className="flex flex-col items-center justify-center p-4 text-center">
                              <FileText className="mb-2 h-8 w-8 text-gray-400" />
                              <p className="mb-1 text-sm font-medium text-gray-700">
                                {value instanceof File && value.name ? value.name : "Click to upload"}
                              </p>
                              <p className="text-xs text-gray-500">PNG, JPG or PDF (max 5MB)</p>
                            </div>
                            <Input
                              type="file"
                              ref={idBackRef}
                              accept="image/png,image/jpeg,image/jpg,application/pdf"
                              className="absolute h-full w-full cursor-pointer opacity-0"
                              onChange={(e) => {
                                const file = e.target.files?.[0]
                                if (file) onChange(file)
                              }}
                              {...fieldProps}
                            />
                          </div>
                        </div>
                      </FormControl>
                      <FormDescription>Upload a clear photo of the back of your ID document</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="selfie"
                  render={({ field: { value, onChange, ...fieldProps } }) => (
                    <FormItem>
                      <FormLabel>
                        Selfie with ID <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <div className="flex flex-col items-center gap-4">
                          <div className="flex h-40 w-full cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100">
                            <div className="flex flex-col items-center justify-center p-4 text-center">
                              <Camera className="mb-2 h-8 w-8 text-gray-400" />
                              <p className="mb-1 text-sm font-medium text-gray-700">
                                {value instanceof File && value.name ? value.name : "Click to upload"}
                              </p>
                              <p className="text-xs text-gray-500">PNG or JPG (max 5MB)</p>
                            </div>
                            <Input
                              type="file"
                              ref={selfieRef}
                              accept="image/png,image/jpeg,image/jpg"
                              className="absolute h-full w-full cursor-pointer opacity-0"
                              onChange={(e) => {
                                const file = e.target.files?.[0]
                                if (file) onChange(file)
                              }}
                              {...fieldProps}
                            />
                          </div>
                        </div>
                      </FormControl>
                      <FormDescription>Upload a selfie of yourself holding your ID document</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="addressProof"
                  render={({ field: { value, onChange, ...fieldProps } }) => (
                    <FormItem>
                      <FormLabel>
                        Proof of Address <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <div className="flex flex-col items-center gap-4">
                          <div className="flex h-40 w-full cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100">
                            <div className="flex flex-col items-center justify-center p-4 text-center">
                              <Home className="mb-2 h-8 w-8 text-gray-400" />
                              <p className="mb-1 text-sm font-medium text-gray-700">
                                {value instanceof File && value.name ? value.name : "Click to upload"}
                              </p>
                              <p className="text-xs text-gray-500">PNG, JPG or PDF (max 5MB)</p>
                            </div>
                            <Input
                              type="file"
                              ref={addressProofRef}
                              accept="image/png,image/jpeg,image/jpg,application/pdf"
                              className="absolute h-full w-full cursor-pointer opacity-0"
                              onChange={(e) => {
                                const file = e.target.files?.[0]
                                if (file) onChange(file)
                              }}
                              {...fieldProps}
                            />
                          </div>
                        </div>
                      </FormControl>
                      <FormDescription>
                        Upload a utility bill, bank statement, or other document showing your name and address
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" /> Submit Documents
                  </>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex justify-center border-t px-6 py-4">
          <p className="text-center text-sm text-muted-foreground">
            Your documents will be reviewed within 24-48 hours. You will be notified once verified.
          </p>
        </CardFooter>
      </Card>
    )
  }

  // Render KYC guide
  const renderKycGuide = () => {
    return (
      <Card>
        <CardHeader>
          <CardTitle>KYC Verification Guide</CardTitle>
          <CardDescription>Learn about the KYC process and how to prepare your documents</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <h3 className="text-lg font-medium">What is KYC?</h3>
            <p className="text-muted-foreground">
              Know Your Customer (KYC) is a process that verifies the identity of our users. This is a regulatory
              requirement for financial platforms and helps prevent fraud, money laundering, and other illegal
              activities.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-medium">Required Documents</h3>
            <ul className="list-inside list-disc space-y-1 text-muted-foreground">
              <li>Government-issued ID (passport, driver's license, national ID card)</li>
              <li>Selfie with your ID document</li>
              <li>Proof of address (utility bill, bank statement, etc. issued within the last 3 months)</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-medium">Document Guidelines</h3>
            <ul className="list-inside list-disc space-y-1 text-muted-foreground">
              <li>All documents must be valid and not expired</li>
              <li>Images must be clear, in color, and all text must be legible</li>
              <li>File formats accepted: JPG, PNG, PDF</li>
              <li>Maximum file size: 5MB per document</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-medium">Verification Process</h3>
            <ol className="list-inside list-decimal space-y-1 text-muted-foreground">
              <li>Submit all required documents through the form</li>
              <li>Our team will review your documents (typically within 1-2 business days)</li>
              <li>You'll receive an email notification once your verification is complete</li>
              <li>If rejected, you'll be notified of the reason and can resubmit your documents</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="mb-6 text-3xl font-bold">KYC Verification</h1>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="status">Verification Status</TabsTrigger>
          <TabsTrigger value="submit" disabled={kycRecord?.status === "approved" || kycRecord?.status === "pending"}>
            Submit Documents
          </TabsTrigger>
          <TabsTrigger value="guide">Verification Guide</TabsTrigger>
        </TabsList>

        <TabsContent value="status">{renderKycStatus()}</TabsContent>
        <TabsContent value="submit">{renderKycForm()}</TabsContent>
        <TabsContent value="guide">{renderKycGuide()}</TabsContent>
      </Tabs>

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
          <Button variant="outline" className="absolute right-2 top-2" onClick={() => setPreviewOpen(false)}>
            <X className="h-4 w-4" />
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  )
}
