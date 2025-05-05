import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Mail } from "lucide-react"

export default function VerifyEmailSentPage() {
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
                      <Mail className="h-12 w-12 text-primary" />
                    </div>
                  </div>
                  <CardTitle className="text-2xl">Verify Your Email</CardTitle>
                  <CardDescription>We&apos;ve sent a verification link to your email address.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 text-center">
                    <p>Please check your inbox and click on the verification link to complete your registration.</p>
                    <p className="text-sm text-muted-foreground">
                      If you don&apos;t see the email, please check your spam folder.
                    </p>
                  </div>
                </CardContent>
                <CardFooter className="flex flex-col space-y-4">
                  <Link href="/auth/login" className="w-full">
                    <Button variant="outline" className="w-full">
                      Back to Login
                    </Button>
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    Didn&apos;t receive the email?{" "}
                    <Link href="/auth/resend-verification" className="text-primary hover:underline">
                      Resend verification link
                    </Link>
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
