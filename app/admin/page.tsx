"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { formatCurrency } from "@/lib/utils"
import {
  Users,
  CreditCard,
  ArrowUpDown,
  AlertCircle,
  Wallet,
  TrendingUp,
  Clock,
  BarChart3,
  LineChart,
} from "lucide-react"

interface DashboardStats {
  totalUsers: number
  activeInvestments: number
  pendingWithdrawals: number
  totalDeposits: string
  totalWithdrawals: string
  totalInterestPaid: string
  userGrowth: { date: string; count: number }[]
  transactionVolume: { date: string; deposits: number; withdrawals: number }[]
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        const response = await fetch("/api/admin/dashboard")
        if (!response.ok) {
          throw new Error("Failed to fetch dashboard statistics")
        }
        const data = await response.json()
        setStats(data.data)
      } catch (err) {
        setError("Could not load dashboard statistics")
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardStats()
  }, [])

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Admin Dashboard</h1>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
                <p className="text-xs text-muted-foreground">Registered users</p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Investments</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats?.activeInvestments || 0}</div>
                <p className="text-xs text-muted-foreground">Currently active investments</p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Withdrawals</CardTitle>
            <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats?.pendingWithdrawals || 0}</div>
                <p className="text-xs text-muted-foreground">Awaiting approval</p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Interest Paid</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">₹{formatCurrency(stats?.totalInterestPaid || "0")}</div>
                <p className="text-xs text-muted-foreground">Interest accrued to users</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Financial Overview</CardTitle>
            <CardDescription>Platform-wide financial metrics</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <TrendingUp className="mr-2 h-4 w-4 text-green-500" />
                    <span>Total Deposits</span>
                  </div>
                  <span className="font-medium">₹{formatCurrency(stats?.totalDeposits || "0")}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <ArrowUpDown className="mr-2 h-4 w-4 text-blue-500" />
                    <span>Total Withdrawals</span>
                  </div>
                  <span className="font-medium">₹{formatCurrency(stats?.totalWithdrawals || "0")}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Wallet className="mr-2 h-4 w-4 text-amber-500" />
                    <span>Net Platform Balance</span>
                  </div>
                  <span className="font-medium">
                    ₹
                    {formatCurrency(
                      (
                        Number.parseFloat(stats?.totalDeposits || "0") -
                        Number.parseFloat(stats?.totalWithdrawals || "0") -
                        Number.parseFloat(stats?.totalInterestPaid || "0")
                      ).toString(),
                    )}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button variant="outline" className="w-full" asChild>
              <Link href="/admin/reports">View Detailed Reports</Link>
            </Button>
          </CardFooter>
        </Card>

        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common administrative tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <Button variant="outline" className="flex h-24 flex-col items-center justify-center" asChild>
                <Link href="/admin/withdrawals">
                  <Clock className="mb-2 h-6 w-6" />
                  <span>Process Withdrawals</span>
                </Link>
              </Button>
              <Button variant="outline" className="flex h-24 flex-col items-center justify-center" asChild>
                <Link href="/admin/plans">
                  <CreditCard className="mb-2 h-6 w-6" />
                  <span>Manage Plans</span>
                </Link>
              </Button>
              <Button variant="outline" className="flex h-24 flex-col items-center justify-center" asChild>
                <Link href="/admin/users">
                  <Users className="mb-2 h-6 w-6" />
                  <span>User Management</span>
                </Link>
              </Button>
              <Button variant="outline" className="flex h-24 flex-col items-center justify-center" asChild>
                <Link href="/admin/interest-accrual">
                  <TrendingUp className="mb-2 h-6 w-6" />
                  <span>Run Interest Accrual</span>
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">User Growth</TabsTrigger>
          <TabsTrigger value="transactions">Transaction Volume</TabsTrigger>
        </TabsList>
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>User Growth</CardTitle>
              <CardDescription>New user registrations over time</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-[350px] w-full" />
              ) : (
                <div className="h-[350px] w-full">
                  <div className="flex h-full items-center justify-center">
                    <LineChart className="h-16 w-16 text-muted-foreground" />
                    <p className="ml-4 text-lg text-muted-foreground">User growth chart will be displayed here</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="transactions">
          <Card>
            <CardHeader>
              <CardTitle>Transaction Volume</CardTitle>
              <CardDescription>Deposits and withdrawals over time</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-[350px] w-full" />
              ) : (
                <div className="h-[350px] w-full">
                  <div className="flex h-full items-center justify-center">
                    <BarChart3 className="h-16 w-16 text-muted-foreground" />
                    <p className="ml-4 text-lg text-muted-foreground">
                      Transaction volume chart will be displayed here
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
