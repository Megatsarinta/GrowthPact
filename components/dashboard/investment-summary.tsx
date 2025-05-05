"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { formatCurrency, formatDate } from "@/lib/utils"

interface Investment {
  id: number
  amount: string
  startDate: string
  endDate: string
  isActive: boolean
  totalInterestEarned: string
  plan: {
    id: number
    name: string
    dailyInterest: string
    durationDays: number
  }
}

export function InvestmentSummary() {
  const [investments, setInvestments] = useState<Investment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchInvestments = async () => {
      try {
        const response = await fetch("/api/dashboard/summary")
        if (!response.ok) {
          throw new Error("Failed to fetch investments")
        }
        const result = await response.json()
        setInvestments(result.data.activeInvestments)
      } catch (error) {
        console.error("Error fetching investments:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchInvestments()
  }, [])

  // Calculate progress percentage for an investment
  const calculateProgress = (startDate: string, endDate: string) => {
    const start = new Date(startDate).getTime()
    const end = new Date(endDate).getTime()
    const now = Date.now()

    if (now >= end) return 100
    if (now <= start) return 0

    return Math.round(((now - start) / (end - start)) * 100)
  }

  // Calculate days remaining
  const calculateDaysRemaining = (endDate: string) => {
    const end = new Date(endDate).getTime()
    const now = Date.now()
    const daysRemaining = Math.ceil((end - now) / (1000 * 60 * 60 * 24))
    return daysRemaining > 0 ? daysRemaining : 0
  }

  if (loading) {
    return (
      <div className="space-y-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-1/3" />
              <Skeleton className="h-5 w-1/4" />
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-2 w-full" />
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-4 w-1/4" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (investments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 py-8 text-center">
        <p className="text-muted-foreground">You don't have any active investments yet.</p>
        <Button asChild>
          <Link href="/plans">Explore Investment Plans</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {investments.map((investment) => {
        const progress = calculateProgress(investment.startDate, investment.endDate)
        const daysRemaining = calculateDaysRemaining(investment.endDate)

        return (
          <div key={investment.id} className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">{investment.plan.name}</h4>
              <span className="text-sm font-medium">₹{formatCurrency(investment.amount)}</span>
            </div>
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Daily Interest: {investment.plan.dailyInterest}%</span>
              <span>Earned: ₹{formatCurrency(investment.totalInterestEarned)}</span>
            </div>
            <Progress value={progress} className="h-2" />
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Started: {formatDate(investment.startDate)}</span>
              <span className={daysRemaining > 0 ? "font-medium text-amber-600" : "font-medium text-green-600"}>
                {daysRemaining > 0 ? `${daysRemaining} days remaining` : "Matured"}
              </span>
            </div>
          </div>
        )
      })}
      <div className="pt-2">
        <Button asChild variant="outline" size="sm" className="w-full">
          <Link href="/dashboard/investments">View All Investments</Link>
        </Button>
      </div>
    </div>
  )
}
