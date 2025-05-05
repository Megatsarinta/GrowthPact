"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Shield } from "lucide-react"

export default function TwoFactorVerifyPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [verificationCode, setVerificationCode] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tempToken, setTempToken] = useState<string | null>(null)

  useEffect(() => {
    // Get the temporary token from the URL
    const token = searchParams.get("token")
    if (token) {
      setTempToken(token)
    } else {
      // If no token is provided, redirect to login
      router.push("/auth/login")
    }
  }, [searchParams, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!verificationCode) {
      setError("Verification code is required")
      return
    }

    if (!tempToken) {
      setError("Authentication token is missing")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/auth/2fa/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token: verificationCode,
          tempToken,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Verification failed")
      }

      // Redirect to dashboard on success
      router.push("/dashboard")
    } catch (error) {
      setError(error instanceof Error ? error.message : "An unexpected error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 flex items-center justify-center py-12">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center justify-center space-y-4 text-center">
            <div className="w-full max-w-md">
              <Card>
                <CardHeader>
                  <div className="flex justify-center mb-4">
                    <div className="rounded-full bg-primary/10 p-6">
                      <Shield className="h-12 w-12 text-primary" />
                    </div>
                  </div>
                  <CardTitle className="text-2xl">Two-Factor Authentication</CardTitle>
                  <CardDescription>Enter the verification code from your authenticator app</CardDescription>
                </CardHeader>
                <CardContent>
                  {error && (
                    <Alert variant="destructive" className="mb-4">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="verificationCode">Verification Code</Label>
                      <Input
                        id="verificationCode"
                        placeholder="Enter 6-digit code"
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value)}
                        maxLength={6}
                        className="text-center text-lg tracking-widest"
                      />
                    </div>
                  </form>
                </CardContent>
                <CardFooter className="flex flex-col space-y-4">
                  <Button className="w-full" onClick={handleSubmit} disabled={isLoading || !verificationCode}>
                    {isLoading ? "Verifying..." : "Verify"}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Lost access to your authenticator app?{" "}
                    <a href="/auth/contact-support" className="text-primary hover:underline">
                      Contact Support
                    </a>
                  </p>
                </CardFooter>
              </Card>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
