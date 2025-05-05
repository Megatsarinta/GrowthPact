"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DataTable } from "@/components/ui/data-table"
import { Loader2 } from "lucide-react"
import { formatCurrency, formatDate } from "@/lib/utils"
import type { ColumnDef } from "@tanstack/react-table"
import { useToast } from "@/components/ui/use-toast"
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts"

interface InterestAccrual {
  id: number
  date: string
  interestAmount: string
  investmentId: number
  investment?: {
    planId: number
    plan?: {
      name: string
    }
  }
}

interface MonthlyInterest {
  month: string
  total: number
}

export default function InterestHistoryPage() {
  const { toast } = useToast()
  const [interestAccruals, setInterestAccruals] = useState<InterestAccrual[]>([])
  const [monthlyData, setMonthlyData] = useState<MonthlyInterest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [totalInterest, setTotalInterest] = useState("0")

  useEffect(() => {
    fetchInterestHistory()
  }, [])

  async function fetchInterestHistory() {
    setIsLoading(true)
    try {
      const response = await fetch("/api/dashboard/interest-history")
      if (!response.ok) {
        throw new Error("Failed to fetch interest history")
      }
      const data = await response.json()

      setInterestAccruals(data.data.accruals)
      setTotalInterest(data.data.totalInterest)

      // Process monthly data for chart
      const monthlyMap = new Map<string, number>()

      data.data.accruals.forEach((accrual: InterestAccrual) => {
        const date = new Date(accrual.date)
        const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
        const amount = Number.parseFloat(accrual.interestAmount)

        if (monthlyMap.has(monthYear)) {
          monthlyMap.set(monthYear, monthlyMap.get(monthYear)! + amount)
        } else {
          monthlyMap.set(monthYear, amount)
        }
      })

      // Convert map to array and sort by month
      const monthlyArray = Array.from(monthlyMap.entries())
        .map(([month, total]) => ({
          month: formatMonthYear(month),
          total,
        }))
        .sort((a, b) => a.month.localeCompare(b.month))

      setMonthlyData(monthlyArray)
    } catch (error) {
      console.error("Error fetching interest history:", error)
      toast({
        title: "Error",
        description: "Failed to fetch interest history",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Helper function to format month-year
  function formatMonthYear(monthYear: string) {
    const [year, month] = monthYear.split("-")
    const date = new Date(Number.parseInt(year), Number.parseInt(month) - 1, 1)
    return date.toLocaleString("default", { month: "short", year: "numeric" })
  }

  // Define columns for interest accruals table
  const columns: ColumnDef<InterestAccrual>[] = [
    {
      accessorKey: "date",
      header: "Date",
      cell: ({ row }) => formatDate(row.original.date),
    },
    {
      accessorKey: "investment.plan.name",
      header: "Investment Plan",
      cell: ({ row }) => row.original.investment?.plan?.name || "Unknown Plan",
    },
    {
      accessorKey: "interestAmount",
      header: "Interest Amount",
      cell: ({ row }) => `₹${formatCurrency(row.original.interestAmount)}`,
    },
  ]

  return (
    <div className="container mx-auto py-8">
      <h1 className="mb-6 text-3xl font-bold">Interest History</h1>

      <div className="mb-6 grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Total Interest Earned</CardTitle>
            <CardDescription>Total interest earned from all investments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-primary">₹{formatCurrency(totalInterest)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Monthly Interest</CardTitle>
            <CardDescription>Interest earned per month</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex h-[200px] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : monthlyData.length === 0 ? (
              <div className="flex h-[200px] items-center justify-center text-muted-foreground">
                No interest data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={(value) => `₹${formatCurrency(value)}`} />
                  <Tooltip
                    formatter={(value) => [`₹${formatCurrency(value)}`, "Interest"]}
                    labelFormatter={(label) => `Month: ${label}`}
                  />
                  <Bar dataKey="total" fill="#0ea5e9" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="all">
        <TabsList className="mb-4">
          <TabsTrigger value="all">All Transactions</TabsTrigger>
          <TabsTrigger value="recent">Recent (30 Days)</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <Card>
            <CardHeader>
              <CardTitle>All Interest Transactions</CardTitle>
              <CardDescription>Complete history of interest accruals</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : interestAccruals.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">No interest transactions found.</div>
              ) : (
                <DataTable
                  columns={columns}
                  data={interestAccruals}
                  searchColumn="investment.plan.name"
                  searchPlaceholder="Search by plan name..."
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recent">
          <Card>
            <CardHeader>
              <CardTitle>Recent Interest Transactions</CardTitle>
              <CardDescription>Interest accruals from the last 30 days</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : interestAccruals.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">No recent interest transactions found.</div>
              ) : (
                <DataTable
                  columns={columns}
                  data={interestAccruals.filter(
                    (accrual) => new Date(accrual.date) >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                  )}
                  searchColumn="investment.plan.name"
                  searchPlaceholder="Search by plan name..."
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
