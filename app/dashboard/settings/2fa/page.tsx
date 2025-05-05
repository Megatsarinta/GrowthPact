"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Image from "next/image"

export default function TwoFactorSetupPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null)
  const [verificationCode, setVerificationCode] = useState("")
  const [isSetupComplete, setIsSetupComplete] = useState(false)
  const [currentTab, setCurrentTab] = useState("setup")

  // Fetch user's 2FA status on component mount
  useEffect(() => {
    const checkTwoFactorStatus = async () => {
      try {
        const response = await fetch("/api/auth/me")
        const data = await response.json()

        if (response.ok && data.user) {
          // If 2FA is already enabled, show the disable tab
          if (data.user.twoFactorEnabled) {
            setCurrentTab("manage")
            setIsSetupComplete(true)
          }
        }
      } catch (error) {
        console.error("Error checking 2FA status:", error)
      }
    }

    checkTwoFactorStatus()
  }, [])

  const handleSetup = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/auth/2fa/setup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to set up two-factor authentication")
      }

      setQrCodeUrl(data.qrCodeDataURL)
    } catch (error) {
      setError(error instanceof Error ? error.message : "An unexpected error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerify = async () => {
    if (!verificationCode) {
      setError("Verification code is required")
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
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to verify code")
      }

      setIsSetupComplete(true)
      setCurrentTab("manage")
    } catch (error) {
      setError(error instanceof Error ? error.message : "An unexpected error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDisable = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/auth/2fa/disable", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to disable two-factor authentication")
      }

      setIsSetupComplete(false)
      setCurrentTab("setup")
      setQrCodeUrl(null)
    } catch (error) {
      setError(error instanceof Error ? error.message : "An unexpected error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Two-Factor Authentication</h1>

      <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full max-w-3xl mx-auto">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="setup" disabled={isSetupComplete}>
            Setup
          </TabsTrigger>
          <TabsTrigger value="manage" disabled={!isSetupComplete}>
            Manage
          </TabsTrigger>
        </TabsList>

        <TabsContent value="setup">
          <Card>
            <CardHeader>
              <CardTitle>Set Up Two-Factor Authentication</CardTitle>
              <CardDescription>Enhance your account security by enabling two-factor authentication.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {!qrCodeUrl ? (
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="font-bold">1</span>
                    </div>
                    <p>Install an authenticator app on your mobile device</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="font-bold">2</span>
                    </div>
                    <p>Click the button below to generate a QR code</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="font-bold">3</span>
                    </div>
                    <p>Scan the QR code with your authenticator app</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="font-bold">4</span>
                    </div>
                    <p>Enter the verification code from your app</p>
                  </div>

                  <Button onClick={handleSetup} disabled={isLoading}>
                    {isLoading ? "Generating..." : "Generate QR Code"}
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex flex-col items-center space-y-4">
                    <p className="text-center">
                      Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
                    </p>
                    <div className="border p-4 rounded-lg">
                      <Image src={qrCodeUrl || "/placeholder.svg"} alt="QR Code for 2FA" width={200} height={200} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="verificationCode">Verification Code</Label>
                    <Input
                      id="verificationCode"
                      placeholder="Enter 6-digit code"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={() => router.back()}>
                Cancel
              </Button>
              {qrCodeUrl && (
                <Button onClick={handleVerify} disabled={isLoading || !verificationCode}>
                  {isLoading ? "Verifying..." : "Verify & Enable"}
                </Button>
              )}
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="manage">
          <Card>
            <CardHeader>
              <CardTitle>Manage Two-Factor Authentication</CardTitle>
              <CardDescription>Two-factor authentication is currently enabled for your account.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="bg-primary/5 p-4 rounded-lg">
                <p className="font-medium">Security Notice</p>
                <p className="text-sm text-muted-foreground mt-1">
                  With 2FA enabled, you will need to enter a verification code from your authenticator app each time you
                  log in.
                </p>
              </div>

              <div className="space-y-2">
                <p className="font-medium">Recovery Options</p>
                <p className="text-sm text-muted-foreground">
                  If you lose access to your authenticator app, you will need to contact support to regain access to
                  your account.
                </p>
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="destructive" onClick={handleDisable} disabled={isLoading}>
                {isLoading ? "Disabling..." : "Disable Two-Factor Authentication"}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
