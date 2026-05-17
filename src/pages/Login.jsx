import React, { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/components/AuthContext'
import FanDirectLogo from '@/components/brand/FanDirectLogo'
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  User,
  Star,
  ShieldCheck,
  AtSign,
  Sparkles,
} from 'lucide-react'

const ROLES = [
  {
    id: 'fan',
    label: 'Fan',
    icon: User,
    description: 'Follow creators, shop drops, and earn rewards.',
  },
  {
    id: 'creator',
    label: 'Creator',
    icon: Star,
    description: 'Build a profile, sell merch, and manage fans.',
  },
]

function cleanUsername(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/^@+/, '')
    .replace(/[^a-z0-9._]/g, '')
    .slice(0, 30)
}

export default function Login() {
  const { login, register, sendMagicLink, sendPasswordReset, getHomeRoute } = useAuth()
  const navigate = useNavigate()

  const [mode, setMode] = useState('login')
  const [role, setRole] = useState('fan')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const title = useMemo(() => {
    if (mode === 'register') return role === 'creator' ? 'Create creator account' : 'Create fan account'
    if (mode === 'magic') return 'Get a sign-in link'
    if (mode === 'reset') return 'Reset your password'
    return 'Log in to FanDirect'
  }, [mode, role])

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSuccess('')
    setIsLoading(true)

    try {
      if (mode === 'magic') {
        const { error } = await sendMagicLink(email, role)
        if (error) throw error
        setSuccess('Sign-in link sent. Check your email to continue.')
        return
      }

      if (mode === 'reset') {
        const { error } = await sendPasswordReset(email)
        if (error) throw error
        setSuccess('Password reset link sent. Check your email to create a new password.')
        return
      }

      if (mode === 'register') {
        if (!fullName.trim()) throw new Error('Add your name to continue.')
        if (!username.trim()) throw new Error('Choose a username to continue.')
        if (password.length < 6) throw new Error('Password must be at least 6 characters.')

        const { error, profile, needsEmailConfirmation } = await register(
          email,
          password,
          role,
          fullName,
          {
            full_name: fullName.trim(),
            username: cleanUsername(username),
          }
        )

        if (error) throw error

        if (needsEmailConfirmation) {
          setSuccess('Account created. Confirm your email, then sign in.')
          setMode('login')
          return
        }

        navigate(getHomeRoute(profile?.role || role))
        return
      }

      const { error, profile } = await login(email, password)
      if (error) throw error
      navigate(getHomeRoute(profile?.role))
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background px-4 py-10 text-foreground">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] w-full max-w-6xl items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="hidden lg:block">
          <div className="rounded-[2rem] border border-border bg-card p-8 shadow-2xl shadow-primary/5">
            <div className="relative overflow-hidden rounded-[1.6rem] border border-primary/20 bg-gradient-to-br from-primary/20 via-secondary/10 to-background p-8">
              <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/20 blur-3xl" />
              <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-secondary/20 blur-3xl" />

              <div className="relative">
                <FanDirectLogo className="h-14 w-14" />

                <h1 className="mt-8 max-w-md font-heading text-4xl font-bold leading-tight">
                  Social profiles, merch drops, and fan commerce in one place.
                </h1>

                <p className="mt-4 max-w-md text-sm leading-6 text-muted-foreground">
                  Create an Instagram-style profile, follow creators, shop releases, and manage creator storefronts from a production-ready FanDirect account.
                </p>

                <div className="mt-8 grid gap-3 sm:grid-cols-3">
                  {['Profiles', 'Drops', 'Rewards'].map((item) => (
                    <div key={item} className="rounded-2xl border border-white/10 bg-background/70 p-4 backdrop-blur">
                      <Sparkles className="mb-3 h-4 w-4 text-primary" />
                      <p className="text-sm font-semibold">{item}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-md">
          <div className="mb-8 text-center">
            <Link to="/" className="mb-5 inline-flex items-center gap-2">
              <FanDirectLogo className="h-11 w-11" />
              <span className="font-heading text-2xl font-bold">
                Fan<span className="text-primary">Direct</span>
              </span>
            </Link>

            <h1 className="font-heading text-2xl font-bold">{title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {mode === 'register'
                ? 'Set up the account fans and creators will actually use.'
                : mode === 'reset'
                  ? 'Enter your email and FanDirect will send a secure reset link.'
                  : 'Continue to your profile, dashboard, or workspace.'}
            </p>
          </div>

          <div className="rounded-[1.5rem] border border-border bg-card p-5 shadow-xl shadow-black/5">
            <div className="grid grid-cols-3 gap-1 rounded-2xl bg-muted p-1">
              {[
                { id: 'login', label: 'Log in' },
                { id: 'register', label: 'Sign up' },
                { id: 'magic', label: 'Link' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setMode(tab.id)
                    setError('')
                    setSuccess('')
                  }}
                  className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${
                    mode === tab.id
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {mode !== 'login' && mode !== 'reset' && (
              <div className="mt-5 space-y-3">
                <p className="text-sm font-semibold">Choose account type</p>
                <div className="grid grid-cols-2 gap-3">
                  {ROLES.map((item) => {
                    const Icon = item.icon
                    const active = role === item.id

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setRole(item.id)}
                        className={`rounded-2xl border p-3 text-left transition ${
                          active
                            ? 'border-primary bg-primary/10 text-foreground'
                            : 'border-border bg-background hover:bg-muted'
                        }`}
                      >
                        <Icon className={`mb-2 h-5 w-5 ${active ? 'text-primary' : 'text-muted-foreground'}`} />
                        <p className="text-sm font-semibold">{item.label}</p>
                        <p className="mt-1 text-xs leading-tight text-muted-foreground">{item.description}</p>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {error && (
              <div className="mt-5 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

            {success && (
              <div className="mt-5 rounded-2xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary">
                {success}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              {mode === 'register' && (
                <>
                  <label className="grid gap-1.5 text-sm font-medium">
                    Name
                    <div className="relative">
                      <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <input
                        type="text"
                        value={fullName}
                        onChange={(event) => setFullName(event.target.value)}
                        placeholder={role === 'creator' ? 'Creator or brand name' : 'Full name'}
                        className="w-full rounded-2xl border border-border bg-background py-3 pl-10 pr-4 text-sm outline-none focus:border-primary"
                      />
                    </div>
                  </label>

                  <label className="grid gap-1.5 text-sm font-medium">
                    Username
                    <div className="relative">
                      <AtSign className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <input
                        type="text"
                        value={username}
                        onChange={(event) => setUsername(cleanUsername(event.target.value))}
                        placeholder="username"
                        className="w-full rounded-2xl border border-border bg-background py-3 pl-10 pr-4 text-sm outline-none focus:border-primary"
                      />
                    </div>
                  </label>
                </>
              )}

              <label className="grid gap-1.5 text-sm font-medium">
                Email
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                    placeholder="you@example.com"
                    className="w-full rounded-2xl border border-border bg-background py-3 pl-10 pr-4 text-sm outline-none focus:border-primary"
                  />
                </div>
              </label>

              {mode !== 'magic' && mode !== 'reset' && (
                <label className="grid gap-1.5 text-sm font-medium">
                  Password
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      required
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
              )}

              {mode === 'login' && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('reset')
                      setError('')
                      setSuccess('')
                    }}
                    className="text-xs font-semibold text-primary hover:text-primary/80"
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              {mode === 'reset' && (
                <div className="rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 text-xs leading-5 text-muted-foreground">
                  Use the same email on the account. The reset link will open FanDirect and let you set a new password.
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading || !email || (mode !== 'magic' && mode !== 'reset' && !password)}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-secondary font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                {mode === 'register' ? 'Create account' : mode === 'magic' ? 'Send sign-in link' : mode === 'reset' ? 'Send reset link' : 'Log in'}
              </button>
            </form>

            {mode === 'reset' && (
              <button
                type="button"
                onClick={() => {
                  setMode('login')
                  setError('')
                  setSuccess('')
                }}
                className="mt-4 w-full text-center text-xs font-semibold text-muted-foreground hover:text-foreground"
              >
                Back to login
              </button>
            )}

            <p className="mt-5 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5" />
              Creator verification and payout setup continue after sign-up.
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}
