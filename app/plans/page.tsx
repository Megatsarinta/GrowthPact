"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, CheckCircle, AlertCircle, TrendingUp, Calendar, DollarSign } from "lucide-react"
import { formatCurrency } from "@/lib/utils"

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

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)
  const [investmentAmount, setInvestmentAmount] = useState("")
  const [isInvesting, setIsInvesting] = useState(false)
  const [investmentSuccess, setInvestmentSuccess] = useState(false)
  const [investmentError, setInvestmentError] = useState<string | null>(null)

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const response = await fetch("/api/plans")
        if (!response.ok) {
          throw new Error("Failed to fetch plans")
        }
        const data = await response.json()
        setPlans(data.data)
      } catch (err) {
        setError("Could not load investment plans")
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchPlans()
  }, [])

  const handleInvest = async () => {
    if (!selectedPlan) return

    setIsInvesting(true)
    setInvestmentError(null)

    try {
      const response = await fetch("/api/investments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          planId: selectedPlan.id,
          amount: Number.parseFloat(investmentAmount),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to create investment")
      }

      setInvestmentSuccess(true)
    } catch (err) {
      setInvestmentError(err.message)
    } finally {
      setIsInvesting(false)
    }
  }

  // Calculate potential returns for the selected plan
  const calculateReturns = () => {
    if (!selectedPlan || !investmentAmount || isNaN(Number.parseFloat(investmentAmount))) {
      return {
        dailyInterest: 0,
        totalInterest: 0,
        totalReturn: 0,
      }
    }

    const amount = Number.parseFloat(investmentAmount)
    const dailyRate = Number.parseFloat(selectedPlan.dailyInterest) / 100
    const dailyInterest = amount * dailyRate
    const totalInterest = dailyInterest * selectedPlan.durationDays
    const totalReturn = amount + totalInterest

    return {
      dailyInterest,
      totalInterest,
      totalReturn,
    }
  }

  const { dailyInterest, totalInterest, totalReturn } = calculateReturns()

  return (
    <div className="container mx-auto py-8">
      <h1 className="mb-6 text-3xl font-bold">Investment Plans</h1>

      {error && (
        <div className="mb-6 rounded-md bg-red-50 p-4 text-red-800">
          <div className="flex">
            <AlertCircle className="mr-2 h-5 w-5 text-red-400" />
            <p>{error}</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="overflow-hidden">
              <CardHeader className="pb-3">
                <Skeleton className="mb-2 h-6 w-1/2" />
                <Skeleton className="h-4 w-3/4" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
              <CardFooter>
                <Skeleton className="h-10 w-full" />
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => (
            <Card key={plan.id} className="overflow-hidden">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{plan.name}</CardTitle>
                  {plan.isActive ? (
                    <Badge variant="default">Active</Badge>
                  ) : (
                    <Badge variant="outline">Coming Soon</Badge>
                  )}
                </div>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                  <span className="font-medium">{plan.dailyInterest}% Daily Interest</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5 text-blue-500" />
                  <span>{plan.durationDays} Days Duration</span>
                </div>
                <div className="flex items-center space-x-2">
                  <DollarSign className="h-5 w-5 text-amber-500" />
                  <span>
                    ₹{formatCurrency(plan.minAmount)} - ₹{formatCurrency(plan.maxAmount)}
                  </span>
                </div>
                <ul className="space-y-1 pl-5 text-sm">
                  {plan.features?.map((feature, index) => (
                    <li key={index} className="list-disc">
                      {feature}
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      className="w-full"
                      disabled={!plan.isActive}
                      onClick={() => {
                        setSelectedPlan(plan)
                        setInvestmentAmount(plan.minAmount)
                        setInvestmentSuccess(false)
                        setInvestmentError(null)
                      }}
                    >
                      Invest Now
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>Invest in {selectedPlan?.name}</DialogTitle>
                      <DialogDescription>
                        Enter the amount you want to invest. Minimum: ₹{selectedPlan?.minAmount}, Maximum: ₹
                        {selectedPlan?.maxAmount}
                      </DialogDescription>
                    </DialogHeader>
                    {investmentSuccess ? (
                      <div className="flex flex-col items-center justify-center space-y-4 py-4">
                        <CheckCircle className="h-16 w-16 text-green-500" />
                        <h3 className="text-xl font-medium text-green-700">Investment Successful!</h3>
                        <p className="text-center text-gray-600">
                          Your investment has been created successfully. You can view your investments in your
                          dashboard.
                        </p>
                        <Button asChild className="mt-4">
                          <Link href="/dashboard/investments">View Investments</Link>
                        </Button>
                      </div>
                    ) : (
                      <>
                        <div className="grid gap-4 py-4">
                          {investmentError && (
                            <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">
                              <div className="flex">
                                <AlertCircle className="mr-2 h-5 w-5 text-red-400" />
                                <p>{investmentError}</p>
                              </div>
                            </div>
                          )}
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="amount" className="text-right">
                              Amount
                            </Label>
                            <Input
                              id="amount"
                              type="number"
                              value={investmentAmount}
                              onChange={(e) => setInvestmentAmount(e.target.value)}
                              className="col-span-3"
                              min={selectedPlan?.minAmount}
                              max={selectedPlan?.maxAmount}
                            />
                          </div>
                          <div className="rounded-md bg-gray-50 p-4">
                            <h4 className="mb-2 font-medium">Potential Returns</h4>
                            <div className="space-y-1 text-sm">
                              <div className="flex justify-between">
                                <span>Daily Interest:</span>
                                <span>₹{formatCurrency(dailyInterest.toFixed(2))}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Total Interest ({selectedPlan?.durationDays} days):</span>
                                <span>₹{formatCurrency(totalInterest.toFixed(2))}</span>
                              </div>
                              <div className="flex justify-between font-medium">
                                <span>Total Return:</span>
                                <span>₹{formatCurrency(totalReturn.toFixed(2))}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button onClick={handleInvest} disabled={isInvesting}>
                            {isInvesting ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing
                              </>
                            ) : (
                              "Confirm Investment"
                            )}
                          </Button>
                        </DialogFooter>
                      </>
                    )}
                  </DialogContent>
                </Dialog>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
