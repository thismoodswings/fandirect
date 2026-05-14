import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/components/AuthContext'
import { Zap, Mail, Lock, Eye, EyeOff, Loader2, User, Star, ShieldCheck } from 'lucide-react'

const ROLES = [
  {
    id: 'fan',
    label: 'Fan',
    icon: User,
    description: 'Discover creators, earn FDT, shop exclusives',
    color: 'border-primary/40 bg-primary/5 text-primary',
    activeColor: 'border-primary bg-primary/20',
  },
  {
    id: 'creator',
    label: 'Creator',
    icon: Star,
    description: 'Manage your profile, drops, and fan community',
    color: 'border-secondary/40 bg-secondary/5 text-secondary',
    activeColor: 'border-secondary bg-secondary/20',
  },
]

export default function Login() {
  const { login, register, sendMagicLink, getHomeRoute } = useAuth()
  const navigate = useNavigate()

  const [mode, setMode]               = useState('login')   // 'login' | 'register' | 'magic'
  const [role, setRole]               = useState('fan')
  const [email, setEmail]             = useState('')
  const [password, setPassword]       = useState('')
  const [displayName, setDisplayName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading]     = useState(false)
  const [error, setError]             = useState('')
  const [success, setSuccess]         = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setIsLoading(true)

    try {
      if (mode === 'magic') {
        const { error } = await sendMagicLink(email, role)
        if (error) throw error
        setSuccess('Magic link sent! Check your email to sign in.')

      } else if (mode === 'register') {
        const { error } = await register(email, password, role, displayName)
        if (error) throw error
        setSuccess('Account created! Check your email to confirm, then sign in.')
        setMode('login')

      } else {
        const { error, profile } = await login(email, password)
        if (error) throw error
        // Redirect based on actual role from DB
        const route = profile?.role === 'admin'   ? '/admin'          :
                      profile?.role === 'creator' ? '/creator-portal' : '/dashboard'
        navigate(route)
      }
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="font-heading font-bold text-2xl text-foreground">
              Fan<span className="text-primary">Direct</span>
            </span>
          </Link>
          <h1 className="font-heading text-2xl font-bold text-foreground">
            {mode === 'register' ? 'Join FanDirect' : 'Welcome back'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {mode === 'register'
              ? 'Create your account to get started'
              : 'Sign in to your account'}
          </p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 space-y-5">

          {/* Mode tabs */}
          <div className="flex gap-1 p-1 bg-muted rounded-xl">
            {[
              { id: 'login',    label: 'Sign In' },
              { id: 'register', label: 'Register' },
              { id: 'magic',    label: 'Magic Link' },
            ].map((tab) => (
              <button key={tab.id} type="button"
                onClick={() => { setMode(tab.id); setError(''); setSuccess('') }}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold transition ${
                  mode === tab.id
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Role selector — shown for register + magic link */}
          {mode !== 'login' && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">I am a...</p>
              <div className="grid grid-cols-2 gap-3">
                {ROLES.map((r) => (
                  <button key={r.id} type="button" onClick={() => setRole(r.id)}
                    className={`rounded-xl border-2 p-3 text-left transition ${
                      role === r.id ? r.activeColor : 'border-border bg-background hover:bg-muted'
                    }`}
                  >
                    <r.icon className={`h-5 w-5 mb-1.5 ${role === r.id ? '' : 'text-muted-foreground'}`} />
                    <p className="text-sm font-semibold text-foreground">{r.label}</p>
                    <p className="text-xs text-muted-foreground leading-tight mt-0.5">{r.description}</p>
                  </button>
                ))}
              </div>

              {/* Admin note */}
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1">
                <ShieldCheck className="h-3.5 w-3.5" />
                Admin accounts are created directly in Supabase.
              </p>
            </div>
          )}

          {/* Alerts */}
          {error && (
            <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-xl bg-primary/10 border border-primary/20 px-4 py-3 text-sm text-primary">
              {success}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Display name — register only */}
            {mode === 'register' && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Display Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder={role === 'creator' ? 'Your creator name' : 'Your name'}
                  className="w-full rounded-xl border border-border bg-background py-2.5 px-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                />
              </div>
            )}

            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="email" required value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-border bg-background py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                />
              </div>
            </div>

            {/* Password */}
            {mode !== 'magic' && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type={showPassword ? 'text' : 'password'} required
                    value={password} onChange={(e) => setPassword(e.target.value)}
                    placeholder={mode === 'register' ? 'Create a password (min 6 chars)' : 'Your password'}
                    className="w-full rounded-xl border border-border bg-background py-2.5 pl-10 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )}

            {mode === 'magic' && (
              <p className="text-xs text-muted-foreground rounded-xl bg-muted/50 p-3">
                We'll send a one-click sign-in link to your email. No password needed.
              </p>
            )}

            <button type="submit" disabled={isLoading}
              className="w-full h-11 rounded-xl bg-gradient-to-r from-primary to-secondary text-white font-semibold text-sm hover:opacity-90 transition disabled:cursor-not-allowed disabled:opacity-60 flex items-center justify-center gap-2">
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === 'magic'    ? 'Send Magic Link'  :
               mode === 'register' ? 'Create Account'   : 'Sign In'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          By signing in you agree to FanDirect's terms of service.
        </p>
      </div>
    </div>
  )
}
