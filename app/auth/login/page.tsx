"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { z } from "zod"

// Login form validation schema
const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
})

type LoginFormData = z.infer<typeof loginSchema>

export default function LoginPage() {
  const router = useRouter()
  const [formData, setFormData] = useState<LoginFormData>({
    email: "",
    password: "",
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [apiError, setApiError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false)
  const [tempToken, setTempToken] = useState<string | null>(null)
  const [twoFactorCode, setTwoFactorCode] = useState("")

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))

    // Clear field-specific error when user types
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }))
    }

    // Clear API error when user makes changes
    if (apiError) {
      setApiError(null)
    }
  }

  const validateForm = () => {
    try {
      loginSchema.parse(formData)
      setErrors({})
      return true
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {}
        error.errors.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0] as string] = err.message
          }
        })
        setErrors(newErrors)
      }
      return false
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsLoading(true)
    setApiError(null)

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Login failed")
      }

      if (data.requiresTwoFactor) {
        setRequiresTwoFactor(true)
        setTempToken(data.tempToken)
      } else {
        // Successful login without 2FA
        router.push("/dashboard")
      }
    } catch (error) {
      setApiError(error instanceof Error ? error.message : "An unexpected error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const handleTwoFactorSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!twoFactorCode) {
      setErrors({ twoFactorCode: "Verification code is required" })
      return
    }

    setIsLoading(true)
    setApiError(null)

    try {
      const response = await fetch("/api/auth/2fa/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token: twoFactorCode,
          tempToken,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Verification failed")
      }

      // Successful 2FA verification
      router.push("/dashboard")
    } catch (error) {
      setApiError(error instanceof Error ? error.message : "An unexpected error occurred")
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
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">Welcome Back</h1>
              <p className="mx-auto max-w-[700px] text-gray-500 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed dark:text-gray-400">
                Sign in to access your investment dashboard.
              </p>
            </div>
            <div className="w-full max-w-md">
              <Card>
                <CardHeader>
                  <CardTitle>{requiresTwoFactor ? "Two-Factor Authentication" : "Sign In"}</CardTitle>
                  <CardDescription>
                    {requiresTwoFactor
                      ? "Enter the verification code from your authenticator app"
                      : "Enter your credentials to access your account"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {apiError && (
                    <Alert variant="destructive" className="mb-4">
                      <AlertDescription>{apiError}</AlertDescription>
                    </Alert>
                  )}

                  {requiresTwoFactor ? (
                    <form onSubmit={handleTwoFactorSubmit} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="twoFactorCode">Verification Code</Label>
                        <Input
                          id="twoFactorCode"
                          name="twoFactorCode"
                          type="text"
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          value={twoFactorCode}
                          onChange={(e) => setTwoFactorCode(e.target.value)}
                          placeholder="Enter 6-digit code"
                          className="text-center text-lg tracking-widest"
                        />
                        {errors.twoFactorCode && <p className="text-sm text-red-500">{errors.twoFactorCode}</p>}
                      </div>
                      <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? "Verifying..." : "Verify"}
                      </Button>
                    </form>
                  ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          autoComplete="email"
                          value={formData.email}
                          onChange={handleChange}
                          required
                        />
                        {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="password">Password</Label>
                          <Link href="/auth/forgot-password" className="text-sm text-primary hover:underline">
                            Forgot password?
                          </Link>
                        </div>
                        <Input
                          id="password"
                          name="password"
                          type="password"
                          autoComplete="current-password"
                          value={formData.password}
                          onChange={handleChange}
                          required
                        />
                        {errors.password && <p className="text-sm text-red-500">{errors.password}</p>}
                      </div>
                      <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? "Signing In..." : "Sign In"}
                      </Button>
                    </form>
                  )}
                </CardContent>
                <CardFooter className="flex flex-col">
                  {!requiresTwoFactor && (
                    <p className="mt-2 text-center text-sm">
                      Don&apos;t have an account?{" "}
                      <Link href="/auth/register" className="text-primary hover:underline">
                        Create account
                      </Link>
                    </p>
                  )}
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
