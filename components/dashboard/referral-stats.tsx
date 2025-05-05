"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { formatCurrency } from "@/lib/utils"
import { Copy, Check, Users } from "lucide-react"

interface ReferralData {
  referralCode: string
  referralCount: number
  referralEarnings: string
  referralLink: string
}

export function ReferralStats() {
  const [referralData, setReferralData] = useState<ReferralData | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const fetchReferralData = async () => {
      try {
        const response = await fetch("/api/referrals")
        if (!response.ok) {
          throw new Error("Failed to fetch referral data")
        }
        const result = await response.json()
        setReferralData(result.data)
      } catch (error) {
        console.error("Error fetching referral data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchReferralData()
  }, [])

  const copyToClipboard = () => {
    if (!referralData) return

    navigator.clipboard.writeText(referralData.referralLink)
    setCopied(true)

    setTimeout(() => {
      setCopied(false)
    }, 2000)
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <Skeleton className="h-10 w-full" />
        <div className="flex justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
    )
  }

  if (!referralData) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 py-8 text-center">
        <p className="text-muted-foreground">Referral data not available.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
          <Users className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="font-medium">Your Referral Code</p>
          <p className="text-sm text-muted-foreground">{referralData.referralCode}</p>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Input value={referralData.referralLink} readOnly className="bg-muted" />
        <Button size="icon" onClick={copyToClipboard} variant="outline">
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg bg-muted p-3 text-center">
          <p className="text-sm text-muted-foreground">Total Referrals</p>
          <p className="text-xl font-bold">{referralData.referralCount}</p>
        </div>
        <div className="rounded-lg bg-muted p-3 text-center">
          <p className="text-sm text-muted-foreground">Total Earnings</p>
          <p className="text-xl font-bold">₹{formatCurrency(referralData.referralEarnings)}</p>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">Earn 5% commission on all investments made by your referrals.</p>
    </div>
  )
}
