"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Loader2, AlertCircle, CheckCircle2, Info } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DataTable } from "@/components/ui/data-table"
import type { ColumnDef } from "@tanstack/react-table"
import { formatCurrency, formatDate } from "@/lib/utils"
import { useToast } from "@/components/ui/use-toast"

// Form validation schema
const depositSchema = z.object({
  amount: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
    message: "Amount must be a positive number",
  }),
  currency: z.enum(["BTC", "ETH", "USDT"], {
    required_error: "Please select a currency",
  }),
})

interface Deposit {
  id: number
  currency: string
  amountCrypto: string
  amountInr: string | null
  status: "pending" | "processing" | "completed" | "failed"
  createdAt: string
  updatedAt: string
  paymentUrl: string | null
}

export default function DepositsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [deposits, setDeposits] = useState<Deposit[]>([])
  const [isLoadingDeposits, setIsLoadingDeposits] = useState(true)
  const [paymentDetails, setPaymentDetails] = useState<{
    paymentUrl: string
    qrCode: string
    depositId: number
    expiresAt: string
  } | null>(null)

  const form = useForm<z.infer<typeof depositSchema>>({
    resolver: zodResolver(depositSchema),
    defaultValues: {
      amount: "",
      currency: undefined,
    },
  })

  // Check for status in URL params (for redirect from payment)
  useEffect(() => {
    const status = searchParams.get("status")
    if (status === "success") {
      setSuccess("Your deposit has been initiated. It will be credited once confirmed.")
      toast({
        title: "Payment Initiated",
        description: "Your deposit has been initiated and will be credited once confirmed on the blockchain.",
        variant: "default",
      })
    } else if (status === "cancelled") {
      setError("The payment was cancelled. Please try again if you wish to deposit.")
      toast({
        title: "Payment Cancelled",
        description: "Your deposit was cancelled. You can try again if you wish to make a deposit.",
        variant: "destructive",
      })
    }

    // Fetch deposits
    fetchDeposits()

    // Set up polling for deposit status updates
    const intervalId = setInterval(fetchDeposits, 30000) // Poll every 30 seconds
    return () => clearInterval(intervalId)
  }, [searchParams, toast])

  async function fetchDeposits() {
    setIsLoadingDeposits(true)
    try {
      const response = await fetch("/api/deposits")
      if (!response.ok) {
        throw new Error("Failed to fetch deposits")
      }
      const data = await response.json()
      setDeposits(data.data)
    } catch (err) {
      console.error("Error fetching deposits:", err)
    } finally {
      setIsLoadingDeposits(false)
    }
  }

  async function onSubmit(values: z.infer<typeof depositSchema>) {
    setIsLoading(true)
    setError(null)
    setSuccess(null)
    setPaymentDetails(null)

    try {
      const response = await fetch("/api/deposits", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: Number.parseFloat(values.amount),
          currency: values.currency,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to create deposit")
      }

      // Set payment details
      setPaymentDetails({
        paymentUrl: data.data.paymentUrl,
        qrCode: data.data.qrCode,
        depositId: data.data.depositId,
        expiresAt: data.data.expiresAt,
      })

      toast({
        title: "Deposit Created",
        description: "Please complete the payment using the provided link or QR code.",
        variant: "default",
      })

      // Reset form
      form.reset()
    } catch (err) {
      setError(err.message)
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Define columns for deposits table
  const columns: ColumnDef<Deposit>[] = [
    {
      accessorKey: "id",
      header: "ID",
    },
    {
      accessorKey: "currency",
      header: "Currency",
    },
    {
      accessorKey: "amountCrypto",
      header: "Crypto Amount",
      cell: ({ row }) => `${row.original.amountCrypto} ${row.original.currency}`,
    },
    {
      accessorKey: "amountInr",
      header: "INR Amount",
      cell: ({ row }) => (row.original.amountInr ? `₹${formatCurrency(row.original.amountInr)}` : "Pending"),
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
      cell: ({ row }) => {
        // Only show payment link for pending deposits
        if (row.original.status === "pending" && row.original.paymentUrl) {
          return (
            <Button variant="outline" size="sm" onClick={() => window.open(row.original.paymentUrl!, "_blank")}>
              Pay Now
            </Button>
          )
        }
        return null
      },
    },
  ]

  return (
    <div className="container mx-auto py-8">
      <h1 className="mb-6 text-3xl font-bold">Deposits</h1>

      <Tabs defaultValue="new">
        <TabsList className="mb-4">
          <TabsTrigger value="new">New Deposit</TabsTrigger>
          <TabsTrigger value="history">Deposit History</TabsTrigger>
        </TabsList>

        <TabsContent value="new">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Make a Deposit</CardTitle>
                <CardDescription>
                  Deposit cryptocurrency to fund your account. The amount will be converted to INR at the current market
                  rate.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {error && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {success && (
                  <Alert className="mb-4 border-green-500 bg-green-50">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <AlertTitle className="text-green-700">Success</AlertTitle>
                    <AlertDescription className="text-green-700">{success}</AlertDescription>
                  </Alert>
                )}

                <div className="mb-6 rounded-md bg-blue-50 p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <Info className="h-5 w-5 text-blue-400" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-blue-800">Deposit Information</h3>
                      <div className="mt-2 text-sm text-blue-700">
                        <ul className="list-disc space-y-1 pl-5">
                          <li>Minimum deposit: 0.001 BTC / 0.01 ETH / 10 USDT</li>
                          <li>Deposits are typically credited within 2-3 network confirmations</li>
                          <li>The conversion rate is determined at the time of confirmation</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Amount</FormLabel>
                          <FormControl>
                            <Input placeholder="0.01" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="currency"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Currency</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select currency" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="BTC">Bitcoin (BTC)</SelectItem>
                              <SelectItem value="ETH">Ethereum (ETH)</SelectItem>
                              <SelectItem value="USDT">Tether (USDT)</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing
                        </>
                      ) : (
                        "Create Deposit"
                      )}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>

            {paymentDetails && (
              <Card>
                <CardHeader>
                  <CardTitle>Payment Details</CardTitle>
                  <CardDescription>
                    Complete your payment using the QR code or by clicking the payment link below.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center space-y-4">
                  <div className="rounded-md bg-white p-2">
                    <img
                      src={paymentDetails.qrCode || "/placeholder.svg?height=200&width=200"}
                      alt="Payment QR Code"
                      className="h-48 w-48"
                    />
                  </div>
                  <div className="text-center text-sm text-muted-foreground">
                    <p>Expires: {new Date(paymentDetails.expiresAt).toLocaleString()}</p>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => window.open(paymentDetails.paymentUrl, "_blank")}
                  >
                    Open Payment Page
                  </Button>
                </CardContent>
                <CardFooter className="text-center text-sm text-muted-foreground">
                  Your deposit will be credited to your account once the payment is confirmed on the blockchain.
                </CardFooter>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Deposit History</CardTitle>
              <CardDescription>View all your previous deposits and their status.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingDeposits ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : deposits.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">No deposits found.</div>
              ) : (
                <DataTable
                  columns={columns}
                  data={deposits}
                  filterColumn="status"
                  filterOptions={[
                    { label: "All", value: "all" },
                    { label: "Pending", value: "pending" },
                    { label: "Processing", value: "processing" },
                    { label: "Completed", value: "completed" },
                    { label: "Failed", value: "failed" },
                  ]}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
