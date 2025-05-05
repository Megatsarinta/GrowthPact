"use client"

import { useState, useEffect } from "react"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Loader2, AlertCircle, CheckCircle2, Info, ShieldAlert } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DataTable } from "@/components/ui/data-table"
import type { ColumnDef } from "@tanstack/react-table"
import { formatCurrency, formatDate } from "@/lib/utils"
import { useToast } from "@/components/ui/use-toast"

// Form validation schema
const withdrawalSchema = z.object({
  amount: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
    message: "Amount must be a positive number",
  }),
  currency: z.enum(["INR", "USDT"], {
    required_error: "Please select a currency",
  }),
  walletAddress: z
    .string()
    .optional()
    .refine(
      (val, ctx) => {
        // If currency is USDT, wallet address is required
        if (ctx.path[0] === "walletAddress" && ctx.data.currency === "USDT") {
          return val && val.length > 0
        }
        return true
      },
      { message: "Wallet address is required for crypto withdrawals" },
    ),
})

interface Withdrawal {
  id: number
  currency: string
  amountInr: string
  amountCrypto: string | null
  status: "pending" | "processing" | "completed" | "failed"
  createdAt: string
  updatedAt: string
  walletAddress: string | null
}

interface UserBalance {
  balanceInr: string
}

interface KycStatus {
  isVerified: boolean
  kycStatus: "pending" | "approved" | "rejected" | "not_submitted"
}

export default function WithdrawalsPage() {
  const { toast } = useToast()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([])
  const [isLoadingWithdrawals, setIsLoadingWithdrawals] = useState(true)
  const [userBalance, setUserBalance] = useState<UserBalance | null>(null)
  const [isLoadingBalance, setIsLoadingBalance] = useState(true)
  const [kycStatus, setKycStatus] = useState<KycStatus | null>(null)
  const [isLoadingKyc, setIsLoadingKyc] = useState(true)

  const form = useForm<z.infer<typeof withdrawalSchema>>({
    resolver: zodResolver(withdrawalSchema),
    defaultValues: {
      amount: "",
      currency: undefined,
      walletAddress: "",
    },
  })

  // Watch currency to conditionally show wallet address field
  const currency = form.watch("currency")

  useEffect(() => {
    // Fetch user balance
    fetchUserBalance()

    // Fetch withdrawals
    fetchWithdrawals()

    // Fetch KYC status
    fetchKycStatus()
  }, [])

  async function fetchUserBalance() {
    setIsLoadingBalance(true)
    try {
      const response = await fetch("/api/dashboard/balance")
      if (!response.ok) {
        throw new Error("Failed to fetch balance")
      }
      const data = await response.json()
      setUserBalance(data.data)
    } catch (err) {
      console.error("Error fetching balance:", err)
    } finally {
      setIsLoadingBalance(false)
    }
  }

  async function fetchWithdrawals() {
    setIsLoadingWithdrawals(true)
    try {
      const response = await fetch("/api/withdrawals")
      if (!response.ok) {
        throw new Error("Failed to fetch withdrawals")
      }
      const data = await response.json()
      setWithdrawals(data.data)
    } catch (err) {
      console.error("Error fetching withdrawals:", err)
    } finally {
      setIsLoadingWithdrawals(false)
    }
  }

  async function fetchKycStatus() {
    setIsLoadingKyc(true)
    try {
      const response = await fetch("/api/kyc/status")
      if (!response.ok) {
        throw new Error("Failed to fetch KYC status")
      }
      const data = await response.json()
      setKycStatus(data.data)
    } catch (err) {
      console.error("Error fetching KYC status:", err)
    } finally {
      setIsLoadingKyc(false)
    }
  }

  async function onSubmit(values: z.infer<typeof withdrawalSchema>) {
    setIsLoading(true)
    setError(null)
    setSuccess(null)

    try {
      // Check if KYC is verified
      if (!kycStatus?.isVerified) {
        throw new Error("KYC verification is required for withdrawals. Please complete your KYC first.")
      }

      const response = await fetch("/api/withdrawals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: Number.parseFloat(values.amount),
          currency: values.currency,
          walletAddress: values.currency === "USDT" ? values.walletAddress : undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to create withdrawal request")
      }

      // Show success message
      setSuccess("Your withdrawal request has been submitted and is pending approval.")
      toast({
        title: "Withdrawal Request Submitted",
        description: "Your request has been received and is pending approval.",
        variant: "default",
      })

      // Reset form
      form.reset()

      // Refresh withdrawals and balance
      fetchWithdrawals()
      fetchUserBalance()
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

  // Define columns for withdrawals table
  const columns: ColumnDef<Withdrawal>[] = [
    {
      accessorKey: "id",
      header: "ID",
    },
    {
      accessorKey: "currency",
      header: "Currency",
    },
    {
      accessorKey: "amountInr",
      header: "INR Amount",
      cell: ({ row }) => `₹${formatCurrency(row.original.amountInr)}`,
    },
    {
      accessorKey: "amountCrypto",
      header: "Crypto Amount",
      cell: ({ row }) =>
        row.original.amountCrypto && row.original.currency === "USDT" ? `${row.original.amountCrypto} USDT` : "N/A",
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
  ]

  return (
    <div className="container mx-auto py-8">
      <h1 className="mb-6 text-3xl font-bold">Withdrawals</h1>

      <Tabs defaultValue="new">
        <TabsList className="mb-4">
          <TabsTrigger value="new">New Withdrawal</TabsTrigger>
          <TabsTrigger value="history">Withdrawal History</TabsTrigger>
        </TabsList>

        <TabsContent value="new">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Request a Withdrawal</CardTitle>
                <CardDescription>
                  Withdraw funds from your account. Withdrawals are processed within 24-48 hours.
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

                {isLoadingKyc ? (
                  <div className="mb-6 flex items-center justify-center">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  </div>
                ) : !kycStatus?.isVerified ? (
                  <Alert className="mb-6 border-amber-500 bg-amber-50">
                    <ShieldAlert className="h-4 w-4 text-amber-500" />
                    <AlertTitle className="text-amber-700">KYC Required</AlertTitle>
                    <AlertDescription className="text-amber-700">
                      You need to complete KYC verification before making withdrawals.{" "}
                      <Button variant="link" className="h-auto p-0 text-amber-700" asChild>
                        <a href="/dashboard/kyc">Complete KYC</a>
                      </Button>
                    </AlertDescription>
                  </Alert>
                ) : null}

                <div className="mb-6 rounded-md bg-blue-50 p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <Info className="h-5 w-5 text-blue-400" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-blue-800">Available Balance</h3>
                      <div className="mt-2 text-sm text-blue-700">
                        {isLoadingBalance ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <p>₹{formatCurrency(userBalance?.balanceInr || "0")}</p>
                        )}
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
                            <Input placeholder="1000" {...field} />
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
                              <SelectItem value="INR">Indian Rupee (INR)</SelectItem>
                              <SelectItem value="USDT">Tether (USDT)</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {currency === "USDT" && (
                      <FormField
                        control={form.control}
                        name="walletAddress"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>USDT Wallet Address</FormLabel>
                            <FormControl>
                              <Input placeholder="0x..." {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    <Button type="submit" className="w-full" disabled={isLoading || !kycStatus?.isVerified}>
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing
                        </>
                      ) : (
                        "Request Withdrawal"
                      )}
                    </Button>
                  </form>
                </Form>
              </CardContent>
              <CardFooter className="text-center text-sm text-muted-foreground">
                {currency === "INR"
                  ? "INR withdrawals are processed via bank transfer. Please ensure your bank details are updated in your profile."
                  : "USDT withdrawals are processed to the provided wallet address. Please double-check the address before submitting."}
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Withdrawal Information</CardTitle>
                <CardDescription>Important information about withdrawals</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-medium">Processing Time</h3>
                  <p className="text-sm text-muted-foreground">
                    Withdrawals are typically processed within 24-48 hours during business days.
                  </p>
                </div>
                <div>
                  <h3 className="font-medium">Minimum Withdrawal</h3>
                  <p className="text-sm text-muted-foreground">
                    The minimum withdrawal amount is ₹1,000 for INR and 10 USDT for crypto withdrawals.
                  </p>
                </div>
                <div>
                  <h3 className="font-medium">Fees</h3>
                  <p className="text-sm text-muted-foreground">
                    INR withdrawals: 0.5% fee (minimum ₹50)
                    <br />
                    USDT withdrawals: Network transaction fees apply
                  </p>
                </div>
                <div>
                  <h3 className="font-medium">KYC Verification</h3>
                  <p className="text-sm text-muted-foreground">
                    Complete KYC verification is required for all withdrawals.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Withdrawal History</CardTitle>
              <CardDescription>View all your previous withdrawal requests and their status.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingWithdrawals ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : withdrawals.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">No withdrawals found.</div>
              ) : (
                <DataTable
                  columns={columns}
                  data={withdrawals}
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
