import { useLocation } from 'react-router-dom'
import { useAuth } from '@/components/AuthContext'

export default function PageNotFound() {
  const location = useLocation()
  const { user, isAuthenticated, authChecked } = useAuth()

  const pageName = location.pathname.substring(1) || 'unknown'

  const isAdmin =
    isAuthenticated &&
    (
      user?.role === 'admin' ||
      user?.app_metadata?.role === 'admin' ||
      user?.user_metadata?.role === 'admin'
    )

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md">
        <div className="space-y-6 text-center">
          <div className="space-y-2">
            <h1 className="text-7xl font-light text-muted-foreground/40">
              404
            </h1>
            <div className="mx-auto h-0.5 w-16 bg-border" />
          </div>

          <div className="space-y-3">
            <h2 className="font-heading text-2xl font-semibold text-foreground">
              Page Not Found
            </h2>

            <p className="leading-relaxed text-muted-foreground">
              The page{' '}
              <span className="font-medium text-foreground">
                "{pageName}"
              </span>{' '}
              could not be found in this application.
            </p>
          </div>

          {authChecked && isAdmin && (
            <div className="mt-8 rounded-xl border border-accent/20 bg-accent/10 p-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/20">
                  <div className="h-2 w-2 rounded-full bg-accent" />
                </div>

                <div className="space-y-1 text-left">
                  <p className="text-sm font-medium text-foreground">
                    Admin Note
                  </p>

                  <p className="text-sm leading-relaxed text-muted-foreground">
                    This route does not currently exist in the local FanDirect
                    app. Check your router config or create the missing page.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="pt-6">
            <button
              type="button"
              onClick={() => {
                window.location.href = '/'
              }}
              className="inline-flex items-center rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              <svg
                className="mr-2 h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                />
              </svg>
              Go Home
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}