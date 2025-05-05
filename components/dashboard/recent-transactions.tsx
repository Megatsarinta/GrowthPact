"use client"

import { useState, useEffect } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { formatCurrency, formatDate } from "@/lib/utils"
import { ArrowDownCircle, ArrowUpCircle, Clock, CheckCircle, XCircle } from "lucide-react"

interface Transaction {
  id: string
  type: "deposit" | "withdrawal"
  amount: string
  currency: string
  status: "pending" | "processing" | "completed" | "failed"
  createdAt: string
}

export function RecentTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const response = await fetch("/api/dashboard/summary")
        if (!response.ok) {
          throw new Error("Failed to fetch transactions")
        }
        const result = await response.json()
        setTransactions(result.data.recentTransactions)
      } catch (error) {
        console.error("Error fetching transactions:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchTransactions()
  }, [])

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-3 w-1/3" />
            </div>
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
    )
  }

  if (transactions.length === 0) {
    return <div className="flex h-[200px] items-center justify-center text-muted-foreground">No transactions yet</div>
  }

  return (
    <div className="space-y-4">
      {transactions.map((transaction) => (
        <div key={transaction.id} className="flex items-center gap-4">
          <div className="rounded-full p-2">
            {transaction.type === "deposit" ? (
              <ArrowDownCircle className="h-6 w-6 text-green-500" />
            ) : (
              <ArrowUpCircle className="h-6 w-6 text-red-500" />
            )}
          </div>
          <div className="flex-1">
            <p className="font-medium">{transaction.type === "deposit" ? "Deposit" : "Withdrawal"}</p>
            <p className="text-sm text-muted-foreground">{formatDate(transaction.createdAt)}</p>
          </div>
          <div className="flex flex-col items-end">
            <p className={`font-medium ${transaction.type === "deposit" ? "text-green-600" : "text-red-600"}`}>
              {transaction.type === "deposit" ? "+" : "-"}₹{formatCurrency(transaction.amount)}
            </p>
            <div className="flex items-center text-xs">
              {transaction.status === "pending" && (
                <>
                  <Clock className="mr-1 h-3 w-3 text-yellow-500" />
                  <span className="text-yellow-600">Pending</span>
                </>
              )}
              {transaction.status === "processing" && (
                <>
                  <Clock className="mr-1 h-3 w-3 text-blue-500" />
                  <span className="text-blue-600">Processing</span>
                </>
              )}
              {transaction.status === "completed" && (
                <>
                  <CheckCircle className="mr-1 h-3 w-3 text-green-500" />
                  <span className="text-green-600">Completed</span>
                </>
              )}
              {transaction.status === "failed" && (
                <>
                  <XCircle className="mr-1 h-3 w-3 text-red-500" />
                  <span className="text-red-600">Failed</span>
                </>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
