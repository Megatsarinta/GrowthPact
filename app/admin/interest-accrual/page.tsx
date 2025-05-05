"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Loader2, AlertCircle, CheckCircle2, Calendar } from "lucide-react"

export default function AdminInterestAccrualPage() {
  const [date, setDate] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [jobId, setJobId] = useState<string | null>(null)

  const handleRunAccrual = async () => {
    setIsLoading(true)
    setError(null)
    setSuccess(null)
    setJobId(null)

    try {
      const response = await fetch("/api/admin/interest-accrual", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          date: date || undefined, // If no date is provided, use current date
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to trigger interest accrual")
      }

      const data = await response.json()
      setSuccess(`Interest accrual job queued successfully for ${data.date}`)
      setJobId(data.jobId)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="mb-6 text-3xl font-bold">Interest Accrual</h1>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Run Interest Accrual</CardTitle>
            <CardDescription>
              Manually trigger the interest accrual process for all active investments. This will calculate and credit
              daily interest to users' accounts.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="border-green-500 bg-green-50">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <AlertTitle className="text-green-700">Success</AlertTitle>
                <AlertDescription className="text-green-700">
                  {success}
                  {jobId && (
                    <div className="mt-2">
                      <span className="font-medium">Job ID:</span> {jobId}
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="date">Date (Optional)</Label>
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  placeholder="YYYY-MM-DD"
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Leave blank to use the current date. Use this to run accrual for a specific date.
              </p>
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={handleRunAccrual} disabled={isLoading} className="w-full">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing
                </>
              ) : (
                "Run Interest Accrual"
              )}
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>About Interest Accrual</CardTitle>
            <CardDescription>Important information about the interest accrual process</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-medium">Automatic Processing</h3>
              <p className="text-sm text-muted-foreground">
                Interest is automatically accrued daily at midnight via a scheduled job. Manual processing should only
                be needed if the automatic process fails.
              </p>
            </div>
            <div>
              <h3 className="font-medium">Calculation Method</h3>
              <p className="text-sm text-muted-foreground">
                Interest is calculated as: Investment Amount × Daily Interest Rate. The calculated amount is credited
                directly to the user's balance.
              </p>
            </div>
            <div>
              <h3 className="font-medium">Duplicate Prevention</h3>
              <p className="text-sm text-muted-foreground">
                The system prevents duplicate interest accruals for the same investment on the same day. Running this
                process multiple times on the same day is safe.
              </p>
            </div>
            <div>
              <h3 className="font-medium">Historical Processing</h3>
              <p className="text-sm text-muted-foreground">
                Use the date selector to process interest for a specific past date if needed. This is useful for
                recovering from system outages.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
