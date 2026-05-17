import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/components/AuthContext'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import {
  Zap,
  ShoppingBag,
  Package,
  Clock,
  CheckCircle,
  Loader2,
  RefreshCw,
  Trophy,
  Radio,
  ArrowUpRight,
} from 'lucide-react'
import SpinWheel from '@/components/dashboard/SpinWheel'
import TokenWallet from '@/components/tokens/TokenWallet'
import { FanPoints, FanToken, Order } from '@/entities'

const levelColors = {
  bronze: 'from-amber-700 to-amber-900',
  silver: 'from-slate-400 to-slate-600',
  gold: 'from-yellow-400 to-yellow-600',
  platinum: 'from-slate-300 to-blue-400',
  diamond: 'from-cyan-300 to-purple-500',
}

const statusColors = {
  pending: 'bg-accent/20 text-accent-foreground',
  processing: 'bg-blue-500/20 text-blue-500',
  shipped: 'bg-primary/20 text-primary',
  delivered: 'bg-emerald-500/20 text-emerald-500',
  cancelled: 'bg-destructive/20 text-destructive',
}

const defaultFanPoints = {
  total_points: 0,
  total_cashback: 0,
  level: 'bronze',
  spins_remaining: 0,
  total_spent: 0,
  orders_count: 0,
}

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
})

function formatCurrency(value) {
  return `₦${Number(value || 0).toLocaleString()}`
}

function formatDate(value) {
  if (!value) return 'Date unavailable'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Date unavailable'

  return dateFormatter.format(date)
}

function getUserEmail(user) {
  return user?.email || user?.user_metadata?.email || ''
}

function getDashboardUsername(user, profile) {
  const metadata = user?.user_metadata || {}
  const candidate =
    profile?.username ||
    metadata.username ||
    metadata.preferred_username ||
    metadata.user_name ||
    user?.username ||
    profile?.display_name ||
    metadata.display_name ||
    metadata.full_name ||
    metadata.name ||
    user?.email?.split('@')[0] ||
    'Fan'

  return String(candidate).trim().replace(/^@+/, '').split('@')[0]
}

function getStatusClass(status, fallback = 'bg-muted text-muted-foreground') {
  return statusColors[status] || fallback
}

function normalizeOrderDate(order) {
  return order.created_date || order.created_at || order.inserted_at || ''
}

function sortOrdersNewestFirst(rows = []) {
  return [...rows].sort((a, b) => {
    const aTime = new Date(normalizeOrderDate(a)).getTime() || 0
    const bTime = new Date(normalizeOrderDate(b)).getTime() || 0

    return bTime - aTime
  })
}

export default function Dashboard() {
  const { user, profile, isAuthenticated, isLoadingAuth } = useAuth()
  const [tokenWallets, setTokenWallets] = useState([])
  const [fanPoints, setFanPoints] = useState(null)
  const [orders, setOrders] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const userEmail = getUserEmail(user)

  const loadDashboard = useCallback(async () => {
    if (!userEmail) {
      setTokenWallets([])
      setFanPoints(null)
      setOrders([])
      setIsLoading(false)
      return
    }

    setError('')
    setNotice('')

    try {
      const [nextTokenWallets, nextFanPointsRows, nextOrders] =
        await Promise.all([
          FanToken.list({ user_email: userEmail }).catch(() => []),
          FanPoints.list({ user_email: userEmail }).catch(() => []),
          Order.list({ buyer_email: userEmail }).catch(() => []),
        ])

      setTokenWallets(nextTokenWallets || [])
      setFanPoints(nextFanPointsRows?.[0] || null)
      setOrders(sortOrdersNewestFirst(nextOrders || []).slice(0, 20))
    } catch (loadError) {
      setError(loadError.message || 'Could not load dashboard data.')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [userEmail])

  useEffect(() => {
    if (!isLoadingAuth) {
      loadDashboard()
    }
  }, [isLoadingAuth, loadDashboard])

  async function handleRefresh() {
    setIsRefreshing(true)
    await loadDashboard()
  }

  async function handleSpin(prize) {
    if (!fanPoints?.id) {
      setError('FanPoints profile not found yet.')
      return
    }

    if (Number(fanPoints.spins_remaining || 0) <= 0) {
      setError('You do not have any spins remaining.')
      return
    }

    setError('')
    setNotice('')

    const updates = {
      spins_remaining: Math.max(0, Number(fanPoints.spins_remaining || 0) - 1),
      last_spin_date: new Date().toISOString(),
    }

    if (prize?.type === 'points') {
      updates.total_points =
        Number(fanPoints.total_points || 0) + Number(prize.value || 0)
    }

    if (prize?.type === 'cashback') {
      updates.total_cashback =
        Number(fanPoints.total_cashback || 0) + Number(prize.value || 0)
    }

    try {
      const updated = await FanPoints.update(fanPoints.id, updates)

      setFanPoints({
        ...fanPoints,
        ...updates,
        ...(updated || {}),
      })

      setNotice('Spin reward added to your FanPoints.')
    } catch (spinError) {
      setError(spinError.message || 'Could not save spin reward.')
    }
  }

  const fp = useMemo(
    () => ({
      ...defaultFanPoints,
      ...(fanPoints || {}),
      level: fanPoints?.level || 'bronze',
    }),
    [fanPoints]
  )

  const levelClass = levelColors[fp.level] || levelColors.bronze
  const nextLevelPoints = useMemo(() => FanPoints.getPointsToNextLevel(Number(fp.total_points || 0)), [fp.total_points])
  const currentThreshold = FanPoints.LEVEL_THRESHOLDS[fp.level] || 0
  const progressSpan = Math.max(1, Number(fp.total_points || 0) + nextLevelPoints - currentThreshold)
  const levelProgress = nextLevelPoints === 0
    ? 100
    : Math.min(100, Math.max(0, ((Number(fp.total_points || 0) - currentThreshold) / progressSpan) * 100))

  if (isLoadingAuth || isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </div>
    )
  }

  if (!isAuthenticated || !userEmail) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
          <Zap className="h-8 w-8 text-primary" />
        </div>

        <h1 className="font-heading text-2xl font-bold text-foreground">
          FanDirect Dashboard
        </h1>

        <p className="mt-2 text-sm text-muted-foreground">
          Sign in first to view your orders, FanPoints, rewards, and token
          wallet.
        </p>

        <Link
          to="/login"
          className="mt-6 inline-flex items-center justify-center rounded-2xl bg-primary px-6 py-3 text-sm font-semibold text-white hover:opacity-90"
        >
          Sign In
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold text-foreground">
            Welcome back, {getDashboardUsername(user, profile)}!
          </h1>

          <p className="mt-1 text-muted-foreground">
            Your FanDirect dashboard
          </p>
        </div>

        <button
          type="button"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isRefreshing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Refresh
        </button>
      </div>

      {(error || notice) && (
        <div
          className={`mb-6 rounded-2xl border p-4 text-sm ${
            error
              ? 'border-destructive/30 bg-destructive/10 text-destructive'
              : 'border-primary/20 bg-primary/10 text-primary'
          }`}
        >
          {error || notice}
        </div>
      )}

      <div
        className={`relative mb-8 overflow-hidden rounded-3xl bg-gradient-to-r ${levelClass} p-6 text-white`}
      >
        <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-white/10 blur-2xl" />

        <div className="relative">
          <span className="mb-3 inline-flex rounded-full bg-white/20 px-3 py-1 text-sm font-semibold capitalize text-white">
            {fp.level} Fan
          </span>

          <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
            <LevelMetric
              label="FanPoints"
              value={Number(fp.total_points || 0).toLocaleString()}
            />

            <LevelMetric
              label="Cashback"
              value={formatCurrency(fp.total_cashback)}
            />

            <LevelMetric
              label="Total Spent"
              value={formatCurrency(fp.total_spent)}
            />

            <LevelMetric
              label="Orders"
              value={Number(fp.orders_count || orders.length || 0).toLocaleString()}
            />
          </div>
        </div>
      </div>

      <div className="mb-8 grid gap-4 lg:grid-cols-3">
        <div className="rounded-3xl border border-border bg-card p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-heading text-lg font-bold text-foreground">
                Fan Level Progress
              </h2>
              <p className="text-sm text-muted-foreground">
                {nextLevelPoints > 0 ? `${nextLevelPoints.toLocaleString()} points to your next level` : 'You are at the top level'}
              </p>
            </div>
            <Trophy className="h-5 w-5 text-accent" />
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-gradient-to-r from-primary via-secondary to-accent" style={{ width: `${levelProgress}%` }} />
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <MiniMetric label="Mining streak" value={`${Number(tokenWallets[0]?.mining_streak || 0)} days`} />
            <MiniMetric label="FDT mined" value={Number(tokenWallets[0]?.total_mined || 0).toLocaleString()} />
            <MiniMetric label="Pending spins" value={Number(fp.spins_remaining || 0).toLocaleString()} />
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-heading text-lg font-bold text-foreground">Quick Moves</h2>
            <Radio className="h-4 w-4 animate-pulse text-primary" />
          </div>
          <div className="grid gap-2">
            <QuickAction to="/mine" label="Mine FDT" sub="Submit proof or redeem rewards" />
            <QuickAction to="/creators" label="Find creators" sub="Share media drops for more FDT" />
            <QuickAction to="/shop" label="Use rewards" sub="Spend cashback on drops" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h2 className="mb-4 flex items-center gap-2 font-heading text-xl font-bold text-foreground">
            <Package className="h-5 w-5 text-primary" />
            Your Orders
          </h2>

          {orders.length === 0 ? (
            <div className="rounded-3xl border border-border bg-card p-8 text-center">
              <ShoppingBag className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
              <p className="text-muted-foreground">
                No orders yet. Start shopping!
              </p>

              <Link
                to="/"
                className="mt-5 inline-flex items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90"
              >
                Explore products
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => (
                <OrderCard key={order.id} order={order} />
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <TokenWallet
            wallet={tokenWallets[0] || null}
            isLoading={isRefreshing && !!userEmail}
          />

          <SpinWheel
            spinsRemaining={Number(fp.spins_remaining || 0)}
            onSpin={handleSpin}
          />
        </div>
      </div>
    </div>
  )
}

function LevelMetric({ label, value }) {
  return (
    <div>
      <p className="text-xs text-white/70">{label}</p>
      <p className="font-heading text-2xl font-bold">{value}</p>
    </div>
  )
}

function OrderCard({ order }) {
  const fulfillmentStatus = order.fulfillment_status || 'pending'
  const paymentStatus = order.payment_status || 'pending'
  const items = Array.isArray(order.items) ? order.items : []

  return (
    <div className="rounded-3xl border border-border bg-card p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="font-heading text-sm font-semibold text-foreground">
            {order.order_number || order.reference || `Order ${order.id?.slice?.(0, 8) || ''}`}
          </p>

          <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            {formatDate(normalizeOrderDate(order))}
          </p>
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          <StatusBadge
            className={getStatusClass(fulfillmentStatus)}
            label={fulfillmentStatus}
          />

          <StatusBadge
            className={
              paymentStatus === 'paid'
                ? 'bg-emerald-500/20 text-emerald-500'
                : 'bg-accent/20 text-accent-foreground'
            }
            label={paymentStatus}
            icon={paymentStatus === 'paid' ? CheckCircle : null}
          />
        </div>
      </div>

      {items.length > 0 ? (
        <div className="space-y-1">
          {items.map((item, index) => {
            const quantity = Number(item.quantity || 1)
            const price = Number(item.price || 0)

            return (
              <div key={`${item.id || item.title || 'item'}-${index}`} className="flex justify-between gap-4 text-sm">
                <span className="min-w-0 truncate text-muted-foreground">
                  {item.title || item.name || 'Product'} x{quantity}
                </span>

                <span className="font-medium text-foreground">
                  {formatCurrency(price * quantity)}
                </span>
              </div>
            )
          })}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Order items unavailable.
        </p>
      )}

      <div className="mt-3 flex justify-between border-t border-border pt-3">
        <span className="text-sm font-medium text-foreground">Total</span>

        <span className="font-heading font-bold text-foreground">
          {formatCurrency(order.total_amount)}
        </span>
      </div>
    </div>
  )
}

function StatusBadge({ label, className, icon: Icon }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${className}`}
    >
      {Icon && <Icon className="h-3.5 w-3.5" />}
      {label}
    </span>
  )
}

function MiniMetric({ label, value }) {
  return (
    <div className="rounded-2xl border border-border/50 bg-background p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-heading text-lg font-bold text-foreground">{value}</p>
    </div>
  )
}

function QuickAction({ to, label, sub }) {
  return (
    <Link to={to} className="flex items-center justify-between gap-3 rounded-2xl border border-border/50 bg-background p-3 hover:bg-muted">
      <span>
        <span className="block text-sm font-semibold text-foreground">{label}</span>
        <span className="text-xs text-muted-foreground">{sub}</span>
      </span>
      <ArrowUpRight className="h-4 w-4 text-primary" />
    </Link>
  )
}
