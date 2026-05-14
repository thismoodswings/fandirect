import React from 'react'
import { AlertTriangle } from 'lucide-react'

export default function UserNotRegisteredError() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-lg">
        <div className="text-center">
          <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-accent/15">
            <AlertTriangle className="h-8 w-8 text-accent" />
          </div>

          <h1 className="mb-4 font-heading text-3xl font-bold text-foreground">
            Access Restricted
          </h1>

          <p className="mb-8 text-muted-foreground">
            You are not registered to use this application. Please contact the
            app administrator to request access.
          </p>

          <div className="rounded-xl bg-muted/50 p-4 text-left text-sm text-muted-foreground">
            <p className="font-medium text-foreground">
              If you believe this is an error, you can:
            </p>

            <ul className="mt-2 list-inside list-disc space-y-1">
              <li>Verify you are logged in with the correct account</li>
              <li>Contact the app administrator for access</li>
              <li>Try logging out and back in again</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}