import React, { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Loader2, Lock, ShieldCheck } from 'lucide-react'
import FanDirectLogo from '@/components/brand/FanDirectLogo'
import { supabase } from '@/lib/supabase'

const PASSWORD_MIN_LENGTH = 6

export default function ResetPassword() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isCheckingLink, setIsCheckingLink] = useState(true)
  const [hasResetSession, setHasResetSession] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const canSubmit = useMemo(() => {
    return password.length >= PASSWORD_MIN_LENGTH && password === confirmPassword && hasResetSession && !isLoading
  }, [password, confirmPassword, hasResetSession, isLoading])

  useEffect(() => {
    let mounted = true

    async function prepareResetSession() {
      setError('')

      try {
        const params = new URLSearchParams(window.location.search)
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''))
        const code = params.get('code')
        const type = params.get('type') || hashParams.get('type')

        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

          if (exchangeError && !String(exchangeError.message || '').toLowerCase().includes('invalid')) {
            throw exchangeError
          }

          window.history.replaceState({}, document.title, '/reset-password')
        }

        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession()

        if (sessionError) throw sessionError
        if (!mounted) return

        setHasResetSession(Boolean(session))

        if (!session && type !== 'recovery') {
          setError('This reset link is invalid or expired. Request a new password reset link from the login page.')
        }
      } catch (err) {
        if (mounted) {
          setHasResetSession(false)
          setError(err.message || 'This reset link could not be verified. Request a new password reset link.')
        }
      } finally {
        if (mounted) setIsCheckingLink(false)
      }
    }

    prepareResetSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) {
        setHasResetSession(Boolean(session))
        setError('')
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (!hasResetSession) {
      setError('Request a fresh password reset link before setting a new password.')
      return
    }

    if (password.length < PASSWORD_MIN_LENGTH) {
      setError(`Password must be at least ${PASSWORD_MIN_LENGTH} characters.`)
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setIsLoading(true)

    try {
      const { error: updateError } = await supabase.auth.updateUser({ password })

      if (updateError) throw updateError

      setSuccess('Password updated. Redirecting to login...')

      window.setTimeout(async () => {
        await supabase.auth.signOut()
        navigate('/login', { replace: true })
      }, 1200)
    } catch (err) {
      setError(err.message || 'Password could not be updated. Request a new reset link and try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background px-4 py-10 text-foreground">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-md items-center justify-center">
        <section className="w-full">
          <div className="mb-8 text-center">
            <Link to="/" className="mb-5 inline-flex items-center gap-2">
              <FanDirectLogo className="h-11 w-11" />
              <span className="font-heading text-2xl font-bold">
                Fan<span className="text-primary">Direct</span>
              </span>
            </Link>

            <h1 className="font-heading text-2xl font-bold">Create a new password</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Secure your account with a new password before continuing.
            </p>
          </div>

          <div className="rounded-[1.5rem] border border-border bg-card p-5 shadow-xl shadow-black/5">
            {isCheckingLink ? (
              <div className="flex items-center justify-center gap-3 rounded-2xl border border-border bg-background px-4 py-8 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                Verifying reset link...
              </div>
            ) : (
              <>
                {error && (
                  <div className="mb-5 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    {error}
                  </div>
                )}

                {success && (
                  <div className="mb-5 rounded-2xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary">
                    {success}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <label className="grid gap-1.5 text-sm font-medium">
                    New password
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        required
                        minLength={PASSWORD_MIN_LENGTH}
                        placeholder="••••••••"
                        className="w-full rounded-2xl border border-border bg-background py-3 pl-10 pr-12 text-sm outline-none focus:border-primary"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((value) => !value)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </label>

                  <label className="grid gap-1.5 text-sm font-medium">
                    Confirm password
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(event) => setConfirmPassword(event.target.value)}
                        required
                        minLength={PASSWORD_MIN_LENGTH}
                        placeholder="••••••••"
                        className="w-full rounded-2xl border border-border bg-background py-3 pl-10 pr-12 text-sm outline-none focus:border-primary"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((value) => !value)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </label>

                  <button
                    type="submit"
                    disabled={!canSubmit}
                    className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-secondary font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                    Update password
                  </button>
                </form>

                <Link
                  to="/login"
                  className="mt-4 block text-center text-xs font-semibold text-muted-foreground hover:text-foreground"
                >
                  Back to login
                </Link>
              </>
            )}

            <p className="mt-5 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5" />
              Password reset links expire for account security.
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}
