"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Loader2, AlertCircle, CheckCircle2, Info, Calculator } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatCurrency } from "@/lib/utils"
import { Slider } from "@/components/ui/slider"

interface Plan {
  id: number
  name: string
  description: string
  minAmount: string
  maxAmount: string
  dailyInterest: string
  durationDays: number
  isActive: boolean
  features: string[]
}

interface UserBalance {
  balanceInr: string
}

// Form validation schema
const investmentSchema = z.object({
  planId: z.number({
    required_error: "Please select a plan",
  }),
  amount: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
    message: "Amount must be a positive number",
  }),
})

export default function InvestPage() {
  const router = useRouter()
  const [plans, setPlans] = useState<Plan[]>([])
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [userBalance, setUserBalance] = useState<UserBalance | null>(null)
  const [isLoadingBalance, setIsLoadingBalance] = useState(true)
  const [calculatedReturns, setCalculatedReturns] = useState({
    dailyReturn: 0,
    totalReturn: 0,
    totalProfit: 0,
  })

  const form = useForm<z.infer<typeof investmentSchema>>({
    resolver: zodResolver(investmentSchema),
    defaultValues: {
      amount: "",
    },
  })

  // Watch amount to calculate returns
  const amount = form.watch("amount")

  useEffect(() => {
    fetchPlans()
    fetchUserBalance()
  }, [])

  // Calculate returns when amount or selected plan changes
  useEffect(() => {
    if (selectedPlan && amount && !isNaN(Number(amount))) {
      const investmentAmount = Number(amount)
      const dailyInterest = Number(selectedPlan.dailyInterest) / 100
      const dailyReturn = investmentAmount * dailyInterest
      const totalReturn = dailyReturn * selectedPlan.durationDays + investmentAmount
      const totalProfit = totalReturn - investmentAmount

      setCalculatedReturns({
        dailyReturn,
        totalReturn,
        totalProfit,
      })
    } else {
      setCalculatedReturns({
        dailyReturn: 0,
        totalReturn: 0,
        totalProfit: 0,
      })
    }
  }, [amount, selectedPlan])

  async function fetchPlans() {
    setLoading(true)
    try {
      const response = await fetch("/api/plans")
      if (!response.ok) {
        throw new Error("Failed to fetch plans")
      }
      const data = await response.json()
      setPlans(data.data.filter((plan: Plan) => plan.isActive))

      // Set the first plan as selected by default
      if (data.data.length > 0) {
        const activePlans = data.data.filter((plan: Plan) => plan.isActive)
        if (activePlans.length > 0) {
          setSelectedPlan(activePlans[0])
          form.setValue("planId", activePlans[0].id)
        }
      }
    } catch (err) {
      setError("Could not load investment plans")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

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

  async function onSubmit(values: z.infer<typeof investmentSchema>) {
    setIsSubmitting(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch("/api/investments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          planId: values.planId,
          amount: Number.parseFloat(values.amount),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to create investment")
      }

      // Show success message
      setSuccess("Your investment has been successfully created!")

      // Reset form
      form.reset()

      // Refresh user balance
      fetchUserBalance()

      // Redirect to investments page after a delay
      setTimeout(() => {
        router.push("/dashboard/investments")
      }, 2000)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  function handlePlanSelect(plan: Plan) {
    setSelectedPlan(plan)
    form.setValue("planId", plan.id)

    // Set default amount to minimum amount of the plan
    form.setValue("amount", plan.minAmount)
  }

  function handleSliderChange(value: number[]) {
    if (!selectedPlan) return

    const min = Number(selectedPlan.minAmount)
    const max = Number(selectedPlan.maxAmount)
    const amount = min + ((max - min) * value[0]) / 100

    form.setValue("amount", amount.toFixed(2))
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="mb-6 text-3xl font-bold">Invest</h1>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Choose an Investment Plan</CardTitle>
                <CardDescription>Select a plan that matches your investment goals</CardDescription>
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

                <Tabs defaultValue={plans.length > 0 ? plans[0].id.toString() : ""} className="w-full">
                  <TabsList className="mb-4 grid w-full grid-cols-3">
                    {plans.map((plan) => (
                      <TabsTrigger key={plan.id} value={plan.id.toString()} onClick={() => handlePlanSelect(plan)}>
                        {plan.name}
                      </TabsTrigger>
                    ))}
                  </TabsList>

                  {plans.map((plan) => (
                    <TabsContent key={plan.id} value={plan.id.toString()}>
                      <div className="space-y-4">
                        <div>
                          <h3 className="text-lg font-medium">{plan.name}</h3>
                          <p className="text-sm text-muted-foreground">{plan.description}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="rounded-md bg-muted p-3">
                            <div className="text-sm font-medium">Daily Interest</div>
                            <div className="text-lg font-bold">{plan.dailyInterest}%</div>
                          </div>
                          <div className="rounded-md bg-muted p-3">
                            <div className="text-sm font-medium">Duration</div>
                            <div className="text-lg font-bold">{plan.durationDays} days</div>
                          </div>
                          <div className="rounded-md bg-muted p-3">
                            <div className="text-sm font-medium">Min Investment</div>
                            <div className="text-lg font-bold">₹{formatCurrency(plan.minAmount)}</div>
                          </div>
                          <div className="rounded-md bg-muted p-3">
                            <div className="text-sm font-medium">Max Investment</div>
                            <div className="text-lg font-bold">₹{formatCurrency(plan.maxAmount)}</div>
                          </div>
                        </div>

                        <div>
                          <h4 className="mb-2 font-medium">Features</h4>
                          <ul className="list-inside list-disc space-y-1">
                            {plan.features.map((feature, index) => (
                              <li key={index} className="text-sm text-muted-foreground">
                                {feature}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>

                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-4">
                    <input type="hidden" {...form.register("planId", { valueAsNumber: true })} />

                    <FormField
                      control={form.control}
                      name="amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Investment Amount (₹)</FormLabel>
                          <FormControl>
                            <div className="space-y-4">
                              <Input placeholder="10000" {...field} />
                              {selectedPlan && (
                                <div className="px-1">
                                  <Slider defaultValue={[0]} max={100} step={1} onValueChange={handleSliderChange} />
                                  <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                                    <span>₹{formatCurrency(selectedPlan.minAmount)}</span>
                                    <span>₹{formatCurrency(selectedPlan.maxAmount)}</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing
                        </>
                      ) : (
                        "Invest Now"
                      )}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>

          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calculator className="mr-2 h-5 w-5" /> Returns Calculator
                </CardTitle>
                <CardDescription>Estimate your investment returns</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedPlan ? (
                  <>
                    <div className="rounded-md bg-muted p-4">
                      <div className="text-sm font-medium">Investment Amount</div>
                      <div className="text-2xl font-bold">
                        ₹{amount && !isNaN(Number(amount)) ? formatCurrency(amount) : "0"}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm">Daily Interest Rate</span>
                        <span className="font-medium">{selectedPlan.dailyInterest}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Daily Returns</span>
                        <span className="font-medium">₹{formatCurrency(calculatedReturns.dailyReturn.toString())}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Duration</span>
                        <span className="font-medium">{selectedPlan.durationDays} days</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Total Profit</span>
                        <span className="font-medium text-green-600">
                          ₹{formatCurrency(calculatedReturns.totalProfit.toString())}
                        </span>
                      </div>
                    </div>

                    <div className="rounded-md bg-primary/10 p-4">
                      <div className="text-sm font-medium">Total Returns</div>
                      <div className="text-2xl font-bold text-primary">
                        ₹{formatCurrency(calculatedReturns.totalReturn.toString())}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">After {selectedPlan.durationDays} days</div>
                    </div>
                  </>
                ) : (
                  <div className="py-8 text-center text-muted-foreground">
                    <p>Select a plan to calculate returns</p>
                  </div>
                )}
              </CardContent>
              <CardFooter className="text-xs text-muted-foreground">
                Note: Returns are estimates and may vary based on market conditions.
              </CardFooter>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
