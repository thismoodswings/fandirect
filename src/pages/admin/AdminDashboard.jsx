import React, { useEffect, useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import {
  Users,
  Package,
  ShoppingBag,
  DollarSign,
  Loader2,
  RefreshCw,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { format } from 'date-fns'
import { Creator, Product, Order } from '@/entities'

const statusColors = {
  paid: 'bg-chart-4/20 text-chart-4',
  pending: 'bg-accent/20 text-accent-foreground',
  failed: 'bg-destructive/20 text-destructive',
  refunded: 'bg-muted text-muted-foreground',
}

function formatCurrency(value) {
  return `₦${Number(value || 0).toLocaleString()}`
}

function getCreatedDate(row) {
  return row?.created_date || row?.created_at || ''
}

function sortNewestFirst(rows = []) {
  return [...rows].sort((a, b) => {
    const aTime = new Date(getCreatedDate(a)).getTime() || 0
    const bTime = new Date(getCreatedDate(b)).getTime() || 0

    return bTime - aTime
  })
}

export default function AdminDashboard() {
  const [creators, setCreators] = useState([])
  const [products, setProducts] = useState([])
  const [orders, setOrders] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState('')

  async function loadDashboard() {
    setError('')

    try {
      const [creatorRows, productRows, orderRows] = await Promise.all([
        Creator.list(),
        Product.list(),
        Order.list(),
      ])

      setCreators(sortNewestFirst(creatorRows || []).slice(0, 100))
      setProducts(sortNewestFirst(productRows || []).slice(0, 100))
      setOrders(sortNewestFirst(orderRows || []).slice(0, 100))
    } catch (loadError) {
      console.warn(loadError)
      setError(loadError.message || 'Could not load admin dashboard data.')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    loadDashboard()
  }, [])

  async function handleRefresh() {
    setIsRefreshing(true)
    await loadDashboard()
  }

  const paidOrders = useMemo(
    () => orders.filter((order) => order.payment_status === 'paid'),
    [orders]
  )

  const totalRevenue = useMemo(
    () =>
      paidOrders.reduce(
        (sum, order) => sum + Number(order.total_amount || 0),
        0
      ),
    [paidOrders]
  )

  const chartData = useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) => {
        const date = new Date()
        date.setDate(date.getDate() - (6 - index))

        const dateStr = format(date, 'yyyy-MM-dd')
        const dayOrders = orders.filter((order) =>
          getCreatedDate(order)?.startsWith(dateStr)
        )

        return {
          day: format(date, 'EEE'),
          orders: dayOrders.length,
          revenue: dayOrders
            .filter((order) => order.payment_status === 'paid')
            .reduce(
              (sum, order) => sum + Number(order.total_amount || 0),
              0
            ),
        }
      }),
    [orders]
  )

  const stats = [
    {
      label: 'Total Revenue',
      value: formatCurrency(totalRevenue),
      icon: DollarSign,
      color: 'text-chart-4',
    },
    {
      label: 'Total Orders',
      value: paidOrders.length,
      icon: ShoppingBag,
      color: 'text-primary',
    },
    {
      label: 'Creators',
      value: creators.length,
      icon: Users,
      color: 'text-secondary',
    },
    {
      label: 'Products',
      value: products.length,
      icon: Package,
      color: 'text-accent',
    },
  ]

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-heading text-2xl font-bold text-foreground">
          Dashboard Overview
        </h1>

        <button
          type="button"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-border/50 bg-card px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isRefreshing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-border/50 bg-card p-5">
            <stat.icon className={`mb-3 h-5 w-5 ${stat.color}`} />

            <p className="font-heading text-2xl font-bold text-foreground">
              {stat.value}
            </p>

            <p className="mt-1 text-xs text-muted-foreground">
              {stat.label}
            </p>
          </Card>
        ))}
      </div>

      <Card className="mb-8 border-border/50 bg-card p-5">
        <h3 className="mb-4 font-heading font-semibold text-foreground">
          Revenue Last 7 Days
        </h3>

        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(250 15% 16%)"
              />

              <XAxis
                dataKey="day"
                stroke="hsl(250 10% 55%)"
                fontSize={12}
              />

              <YAxis stroke="hsl(250 10% 55%)" fontSize={12} />

              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(250 20% 7%)',
                  border: '1px solid hsl(250 15% 16%)',
                  borderRadius: '8px',
                  color: 'hsl(250 10% 95%)',
                }}
                formatter={(value, name) => {
                  if (name === 'revenue') return [formatCurrency(value), 'Revenue']
                  return [value, name]
                }}
              />

              <Bar
                dataKey="revenue"
                fill="hsl(270 80% 60%)"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="overflow-hidden border-border/50 bg-card">
        <div className="border-b border-border/50 p-5">
          <h3 className="font-heading font-semibold text-foreground">
            Recent Orders
          </h3>
        </div>

        <div className="divide-y divide-border/50">
          {orders.slice(0, 10).map((order) => {
            const paymentStatus = order.payment_status || 'pending'

            return (
              <div
                key={order.id}
                className="flex items-center justify-between gap-4 p-4"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {order.order_number || order.reference || `Order ${order.id}`}
                  </p>

                  <p className="truncate text-xs text-muted-foreground">
                    {order.buyer_name || 'Unknown buyer'} —{' '}
                    {order.buyer_email || 'No email'}
                  </p>
                </div>

                <div className="shrink-0 text-right">
                  <p className="font-heading text-sm font-bold">
                    {formatCurrency(order.total_amount)}
                  </p>

                  <Badge
                    className={`${
                      statusColors[paymentStatus] ||
                      'bg-muted text-muted-foreground'
                    } border-0 text-xs capitalize`}
                  >
                    {paymentStatus}
                  </Badge>
                </div>
              </div>
            )
          })}

          {orders.length === 0 && (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No orders yet
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}