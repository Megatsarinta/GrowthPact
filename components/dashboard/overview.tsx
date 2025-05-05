"use client"

import { useState, useEffect } from "react"
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { formatCurrency } from "@/lib/utils"

interface MonthlyInterest {
  month: string
  total: string
}

export function Overview() {
  const [data, setData] = useState<MonthlyInterest[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("/api/dashboard/summary")
        if (!response.ok) {
          throw new Error("Failed to fetch data")
        }
        const result = await response.json()

        // Format the data for the chart
        const formattedData = result.data.monthlyInterest.map((item: MonthlyInterest) => ({
          month: formatMonth(item.month),
          total: Number.parseFloat(item.total),
        }))

        setData(formattedData)
      } catch (error) {
        console.error("Error fetching chart data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // Helper function to format month from YYYY-MM to MMM
  const formatMonth = (yearMonth: string) => {
    const [year, month] = yearMonth.split("-")
    const date = new Date(Number.parseInt(year), Number.parseInt(month) - 1, 1)
    return date.toLocaleString("default", { month: "short" })
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Interest Earnings</CardTitle>
          <CardDescription>Monthly interest earned on your investments</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[200px] w-full" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Interest Earnings</CardTitle>
        <CardDescription>Monthly interest earned on your investments</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex h-[200px] items-center justify-center text-muted-foreground">
            No interest data available yet
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data}>
              <XAxis dataKey="month" />
              <YAxis tickFormatter={(value) => `₹${formatCurrency(value)}`} width={80} />
              <Tooltip
                formatter={(value) => [`₹${formatCurrency(value)}`, "Interest Earned"]}
                labelFormatter={(label) => `Month: ${label}`}
              />
              <Bar dataKey="total" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
