"use client"

import { useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { logger } from "@/lib/logger"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to our logging system
    logger.error("Client-side error:", { message: error.message, stack: error.stack, digest: error.digest })
  }, [error])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <div className="container flex max-w-md flex-col items-center justify-center space-y-6 text-center">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl">Something went wrong!</h1>
          <p className="text-muted-foreground">
            We apologize for the inconvenience. Our team has been notified of this issue.
          </p>
          {error.digest && <p className="text-sm text-muted-foreground">Error reference: {error.digest}</p>}
        </div>
        <div className="flex space-x-4">
          <Button onClick={reset}>Try Again</Button>
          <Button variant="outline" asChild>
            <Link href="/">Go Home</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
