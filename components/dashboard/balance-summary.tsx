"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { ArrowUpRight, Wallet, TrendingUp, RefreshCw } from "lucide-react"
import { formatCurrency } from "@/lib/utils"

interface BalanceSummaryProps {
  userId: number
}

interface BalanceData {
  balanceInr: string
  totalInvested: string
  totalInterestEarned: string
  pendingDeposits: string
  pendingWithdrawals: string
}

export function BalanceSummary({ userId }: BalanceSummaryProps) {
  const [loading, setLoading] = useState(true)
  const [balanceData, setBalanceData] = useState<BalanceData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchBalanceData = async () => {
      try {
        const response = await fetch("/api/dashboard/balance")
        if (!response.ok) {
          throw new Error("Failed to fetch balance data")
        }
        const data = await response.json()
        setBalanceData(data.data)
      } catch (err) {
        setError("Could not load balance data")
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchBalanceData()
  }, [userId])

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Balance Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-red-500">{error}</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Available Balance</CardTitle>
          <Wallet className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-7 w-[120px]" />
          ) : (
            <div className="text-2xl font-bold">₹{formatCurrency(balanceData?.balanceInr || "0")}</div>
          )}
          <p className="text-xs text-muted-foreground">Available for withdrawal or investment</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Invested</CardTitle>
          <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-7 w-[120px]" />
          ) : (
            <div className="text-2xl font-bold">₹{formatCurrency(balanceData?.totalInvested || "0")}</div>
          )}
          <p className="text-xs text-muted-foreground">Across all active investment plans</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Interest Earned</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-7 w-[120px]" />
          ) : (
            <div className="text-2xl font-bold">₹{formatCurrency(balanceData?.totalInterestEarned || "0")}</div>
          )}
          <p className="text-xs text-muted-foreground">Total interest earned to date</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pending Transactions</CardTitle>
          <RefreshCw className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-7 w-[120px]" />
          ) : (
            <div className="text-2xl font-bold">
              ₹
              {formatCurrency(
                (
                  Number.parseFloat(balanceData?.pendingDeposits || "0") +
                  Number.parseFloat(balanceData?.pendingWithdrawals || "0")
                ).toString(),
              )}
            </div>
          )}
          <p className="text-xs text-muted-foreground">Deposits and withdrawals in progress</p>
        </CardContent>
      </Card>
    </div>
  )
}
