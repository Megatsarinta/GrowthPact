import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { AlertTriangle } from "lucide-react"

export default function VerifyEmailErrorPage() {
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
                    <div className="rounded-full bg-red-100 p-6 dark:bg-red-900">
                      <AlertTriangle className="h-12 w-12 text-red-600 dark:text-red-300" />
                    </div>
                  </div>
                  <CardTitle className="text-2xl">Verification Failed</CardTitle>
                  <CardDescription>We couldn&apos;t verify your email address.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 text-center">
                    <p>The verification link may have expired or is invalid.</p>
                    <p className="text-sm text-muted-foreground">
                      Please request a new verification link to complete your registration.
                    </p>
                  </div>
                </CardContent>
                <CardFooter className="flex flex-col space-y-4">
                  <Link href="/auth/resend-verification" className="w-full">
                    <Button className="w-full">Request New Verification Link</Button>
                  </Link>
                  <Link href="/auth/login" className="w-full">
                    <Button variant="outline" className="w-full">
                      Back to Login
                    </Button>
                  </Link>
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
