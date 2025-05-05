"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DataTable } from "@/components/ui/data-table"
import { Skeleton } from "@/components/ui/skeleton"
import { Progress } from "@/components/ui/progress"
import { formatCurrency, formatDate, calculateTimeRemaining } from "@/lib/utils"
import { AlertCircle, CheckCircle, Clock } from "lucide-react"
import type { ColumnDef } from "@tanstack/react-table"

interface Investment {
  id: number
  amount: string
  startDate: string
  endDate: string
  isActive: boolean
  totalInterestEarned: string
  createdAt: string
  plan: {
    id: number
    name: string
    dailyInterest: string
    durationDays: number
  }
}

export default function InvestmentsPage() {
  const [investments, setInvestments] = useState<Investment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("active")

  useEffect(() => {
    fetchInvestments(activeTab)
  }, [activeTab])

  async function fetchInvestments(status: string) {
    setLoading(true)
    try {
      const response = await fetch(`/api/investments?status=${status}`)
      if (!response.ok) {
        throw new Error("Failed to fetch investments")
      }
      const data = await response.json()
      setInvestments(data.data)
    } catch (err) {
      setError("Could not load investments")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Calculate progress percentage for an investment
  const calculateProgress = (startDate: string, endDate: string) => {
    const start = new Date(startDate).getTime()
    const end = new Date(endDate).getTime()
    const now = Date.now()

    if (now >= end) return 100
    if (now <= start) return 0

    return Math.round(((now - start) / (end - start)) * 100)
  }

  // Define columns for active investments
  const activeColumns: ColumnDef<Investment>[] = [
    {
      accessorKey: "plan.name",
      header: "Plan Name",
    },
    {
      accessorKey: "amount",
      header: "Invested Amount",
      cell: ({ row }) => `₹${formatCurrency(row.original.amount)}`,
    },
    {
      accessorKey: "plan.dailyInterest",
      header: "Daily Interest",
      cell: ({ row }) => `${row.original.plan.dailyInterest}%`,
    },
    {
      accessorKey: "totalInterestEarned",
      header: "Interest Earned",
      cell: ({ row }) => `₹${formatCurrency(row.original.totalInterestEarned)}`,
    },
    {
      accessorKey: "progress",
      header: "Progress",
      cell: ({ row }) => {
        const progress = calculateProgress(row.original.startDate, row.original.endDate)
        const { days, isExpired } = calculateTimeRemaining(row.original.endDate)

        return (
          <div className="space-y-1">
            <Progress value={progress} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{progress}% Complete</span>
              <span>{isExpired ? "Matured" : `${days} days left`}</span>
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: "startDate",
      header: "Start Date",
      cell: ({ row }) => formatDate(row.original.startDate),
    },
    {
      accessorKey: "endDate",
      header: "End Date",
      cell: ({ row }) => formatDate(row.original.endDate),
    },
  ]

  // Define columns for completed investments
  const completedColumns: ColumnDef<Investment>[] = [
    {
      accessorKey: "plan.name",
      header: "Plan Name",
    },
    {
      accessorKey: "amount",
      header: "Invested Amount",
      cell: ({ row }) => `₹${formatCurrency(row.original.amount)}`,
    },
    {
      accessorKey: "totalInterestEarned",
      header: "Total Interest",
      cell: ({ row }) => `₹${formatCurrency(row.original.totalInterestEarned)}`,
    },
    {
      accessorKey: "plan.dailyInterest",
      header: "Daily Interest",
      cell: ({ row }) => `${row.original.plan.dailyInterest}%`,
    },
    {
      accessorKey: "startDate",
      header: "Start Date",
      cell: ({ row }) => formatDate(row.original.startDate),
    },
    {
      accessorKey: "endDate",
      header: "End Date",
      cell: ({ row }) => formatDate(row.original.endDate),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: () => (
        <div className="flex items-center">
          <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
          <span className="text-green-600">Completed</span>
        </div>
      ),
    },
  ]

  return (
    <div className="container mx-auto py-8">
      <h1 className="mb-6 text-3xl font-bold">My Investments</h1>

      {error && (
        <div className="mb-6 rounded-md bg-red-50 p-4 text-red-800">
          <div className="flex">
            <AlertCircle className="mr-2 h-5 w-5 text-red-400" />
            <p>{error}</p>
          </div>
        </div>
      )}

      <Tabs defaultValue="active" onValueChange={setActiveTab}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="active">Active Investments</TabsTrigger>
            <TabsTrigger value="completed">Completed Investments</TabsTrigger>
          </TabsList>
          <Button asChild>
            <Link href="/plans">New Investment</Link>
          </Button>
        </div>

        <TabsContent value="active" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Active Investments</CardTitle>
              <CardDescription>Your current active investments and their performance.</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-[300px] w-full" />
                </div>
              ) : investments.length === 0 ? (
                <div className="flex flex-col items-center justify-center space-y-4 py-12 text-center">
                  <Clock className="h-12 w-12 text-muted-foreground" />
                  <div>
                    <p className="text-lg font-medium">No active investments</p>
                    <p className="text-muted-foreground">
                      You don't have any active investments. Start investing to grow your wealth.
                    </p>
                  </div>
                  <Button asChild>
                    <Link href="/plans">Explore Investment Plans</Link>
                  </Button>
                </div>
              ) : (
                <DataTable columns={activeColumns} data={investments} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="completed" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Completed Investments</CardTitle>
              <CardDescription>Your past investments that have reached maturity.</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-[300px] w-full" />
                </div>
              ) : investments.length === 0 ? (
                <div className="flex flex-col items-center justify-center space-y-4 py-12 text-center">
                  <CheckCircle className="h-12 w-12 text-muted-foreground" />
                  <div>
                    <p className="text-lg font-medium">No completed investments</p>
                    <p className="text-muted-foreground">You don't have any completed investments yet.</p>
                  </div>
                </div>
              ) : (
                <DataTable columns={completedColumns} data={investments} />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
