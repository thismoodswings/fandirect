import React, { useEffect, useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Loader2, Search, Truck, ReceiptText, Coins } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { Order } from '@/entities'

const paymentColors = {
  pending: 'bg-accent/20 text-accent-foreground',
  paid: 'bg-chart-4/20 text-chart-4',
  failed: 'bg-destructive/20 text-destructive',
  refunded: 'bg-muted text-muted-foreground',
}

const fulfillmentColors = {
  pending: 'bg-accent/20 text-accent-foreground',
  processing: 'bg-chart-5/20 text-chart-5',
  shipped: 'bg-primary/20 text-primary',
  delivered: 'bg-chart-4/20 text-chart-4',
  cancelled: 'bg-destructive/20 text-destructive',
}

function getCreatedDate(order) {
  return order?.created_date || order?.created_at || ''
}

function sortNewestFirst(rows = []) {
  return [...rows].sort((a, b) => {
    const aTime = new Date(getCreatedDate(a)).getTime() || 0
    const bTime = new Date(getCreatedDate(b)).getTime() || 0
    return bTime - aTime
  })
}

function formatCurrency(value) {
  return `₦${Number(value || 0).toLocaleString()}`
}

function parseShippingAddress(value) {
  if (!value) return null

  if (typeof value === 'object') return value

  try {
    const parsed = JSON.parse(value)
    if (parsed && typeof parsed === 'object') return parsed
  } catch {
    return { address_line1: value }
  }

  return null
}

function getOrderMetrics(order) {
  const items = Array.isArray(order.items) ? order.items : []

  const fromItems = items.reduce(
    (sum, item) => {
      const quantity = Number(item.quantity || 1)
      sum.creatorSubtotal += Number(item.creator_base_price || 0) * quantity
      sum.platformFee += Number(item.platform_fee_amount || 0) * quantity
      return sum
    },
    { creatorSubtotal: 0, platformFee: 0 }
  )

  return {
    creatorSubtotal: Number(order.creator_payout_total || order.subtotal_amount || fromItems.creatorSubtotal || 0),
    platformFee: Number(order.platform_fee_total || fromItems.platformFee || 0),
    total: Number(order.total_amount || 0),
    itemsCount: items.reduce((sum, item) => sum + Number(item.quantity || 1), 0),
  }
}

export default function ManageOrders() {
  const [orders, setOrders] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState('')
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [paymentFilter, setPaymentFilter] = useState('all')
  const [fulfillmentFilter, setFulfillmentFilter] = useState('all')

  async function loadOrders() {
    setError('')

    try {
      const rows = await Order.list()
      setOrders(sortNewestFirst(rows || []).slice(0, 200))
    } catch (loadError) {
      console.warn(loadError)
      setError(loadError.message || 'Could not load orders.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadOrders()
  }, [])

  async function updateFulfillmentStatus(orderId, fulfillmentStatus) {
    setUpdatingId(orderId)
    setError('')

    try {
      await Order.update(orderId, { fulfillment_status: fulfillmentStatus })

      setOrders((currentOrders) =>
        currentOrders.map((order) =>
          order.id === orderId ? { ...order, fulfillment_status: fulfillmentStatus } : order
        )
      )

      toast.success('Order updated')
    } catch (updateError) {
      console.warn(updateError)
      setError(updateError.message || 'Could not update order.')
      toast.error(updateError.message || 'Could not update order.')
    } finally {
      setUpdatingId('')
    }
  }

  const summary = useMemo(() => {
    return orders.reduce(
      (sum, order) => {
        const metrics = getOrderMetrics(order)
        sum.revenue += metrics.total
        sum.creatorPayout += metrics.creatorSubtotal
        sum.platformFees += metrics.platformFee
        sum.orders += 1
        if ((order.payment_status || 'pending') === 'paid') sum.paid += 1
        return sum
      },
      { revenue: 0, creatorPayout: 0, platformFees: 0, orders: 0, paid: 0 }
    )
  }, [orders])

  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase()

    return orders.filter((order) => {
      const items = Array.isArray(order.items) ? order.items : []
      const haystack = [
        order.order_number,
        order.payment_reference,
        order.buyer_name,
        order.buyer_email,
        ...items.map((item) => item.title),
        ...items.map((item) => item.creator_name),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      const matchesSearch = !query || haystack.includes(query)
      const matchesPayment = paymentFilter === 'all' || (order.payment_status || 'pending') === paymentFilter
      const matchesFulfillment = fulfillmentFilter === 'all' || (order.fulfillment_status || 'pending') === fulfillmentFilter

      return matchesSearch && matchesPayment && matchesFulfillment
    })
  }, [orders, search, paymentFilter, fulfillmentFilter])

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Manage Orders</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track buyer details, creator payouts, platform fees, shipping, and fulfillment.
          </p>
        </div>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard icon={ReceiptText} label="Orders" value={summary.orders.toLocaleString()} />
        <MetricCard icon={Coins} label="Gross sales" value={formatCurrency(summary.revenue)} />
        <MetricCard icon={Truck} label="Creator payout" value={formatCurrency(summary.creatorPayout)} />
        <MetricCard icon={Coins} label="Platform fees" value={formatCurrency(summary.platformFees)} />
      </div>

      <Card className="mb-6 border-border/50 bg-card p-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_180px_180px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search buyer, creator, order number, product..."
              className="border-border/50 bg-background pl-10"
            />
          </div>

          <Select value={paymentFilter} onValueChange={setPaymentFilter}>
            <SelectTrigger className="border-border/50 bg-background">
              <SelectValue placeholder="Payment" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All payments</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="refunded">Refunded</SelectItem>
            </SelectContent>
          </Select>

          <Select value={fulfillmentFilter} onValueChange={setFulfillmentFilter}>
            <SelectTrigger className="border-border/50 bg-background">
              <SelectValue placeholder="Fulfillment" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All fulfillment</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="shipped">Shipped</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {error && (
        <div className="mb-6 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} className="h-52 animate-pulse border-border/50 bg-card" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              updatingId={updatingId}
              onFulfillmentChange={updateFulfillmentStatus}
            />
          ))}

          {filteredOrders.length === 0 && (
            <div className="py-12 text-center text-muted-foreground">No orders match this view</div>
          )}
        </div>
      )}
    </div>
  )
}

function OrderCard({ order, updatingId, onFulfillmentChange }) {
  const paymentStatus = order.payment_status || 'pending'
  const fulfillmentStatus = order.fulfillment_status || 'pending'
  const items = Array.isArray(order.items) ? order.items : []
  const address = parseShippingAddress(order.shipping_address)
  const metrics = getOrderMetrics(order)

  return (
    <Card className="border-border/50 bg-card p-4">
      <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <p className="font-heading font-semibold text-foreground">
            {order.order_number || order.reference || `Order ${String(order.id).slice(0, 8)}`}
          </p>

          <p className="mt-1 text-xs text-muted-foreground">
            {order.buyer_name || 'Unknown buyer'} — {order.buyer_email || 'No email'}
            {getCreatedDate(order) && ` — ${format(new Date(getCreatedDate(order)), 'PPP p')}`}
          </p>

          {order.payment_reference && (
            <p className="mt-1 text-xs text-muted-foreground">Payment ref: {order.payment_reference}</p>
          )}
        </div>

        <div className="text-left sm:text-right">
          <p className="font-heading text-xl font-bold text-foreground">{formatCurrency(metrics.total)}</p>
          <p className="text-xs text-muted-foreground">{metrics.itemsCount} item{metrics.itemsCount === 1 ? '' : 's'}</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.3fr_0.9fr_0.8fr]">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Items</p>
          {items.length > 0 ? (
            items.map((item, index) => {
              const quantity = Number(item.quantity || 1)
              const price = Number(item.price || 0)
              return (
                <div key={`${item.id || item.product_id || item.title || 'item'}-${index}`} className="rounded-2xl border border-border/50 bg-background p-3">
                  <div className="flex justify-between gap-4 text-sm">
                    <span className="min-w-0 font-medium text-foreground">
                      {item.title || item.name || 'Product'} x{quantity}
                    </span>
                    <span>{formatCurrency(price * quantity)}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    {item.creator_name && <span>{item.creator_name}</span>}
                    {item.type && <span className="capitalize">{item.type}</span>}
                    {item.sku && <span>SKU: {item.sku}</span>}
                    {item.access_tier && item.access_tier !== 'free' && <span>{item.access_tier} access</span>}
                  </div>
                </div>
              )
            })
          ) : (
            <p className="text-sm text-muted-foreground">No order items available.</p>
          )}
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Revenue split</p>
          <div className="rounded-2xl border border-border/50 bg-background p-3 text-sm">
            <div className="flex justify-between gap-3 text-muted-foreground">
              <span>Creator payout</span>
              <span>{formatCurrency(metrics.creatorSubtotal)}</span>
            </div>
            <div className="mt-2 flex justify-between gap-3 text-muted-foreground">
              <span>Platform fee</span>
              <span>{formatCurrency(metrics.platformFee)}</span>
            </div>
            <div className="mt-3 flex justify-between gap-3 border-t border-border pt-3 font-semibold text-foreground">
              <span>Total</span>
              <span>{formatCurrency(metrics.total)}</span>
            </div>
            <div className="mt-3 flex justify-between gap-3 text-xs text-muted-foreground">
              <span>FanPoints</span>
              <span>{Number(order.points_earned || 0).toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Shipping</p>
          <div className="rounded-2xl border border-border/50 bg-background p-3 text-xs text-muted-foreground">
            {address ? (
              <div className="space-y-1">
                {address.phone && <p>Phone: {address.phone}</p>}
                {address.address_line1 && <p>{address.address_line1}</p>}
                {address.address_line2 && <p>{address.address_line2}</p>}
                <p>{[address.city, address.state, address.postal_code].filter(Boolean).join(', ')}</p>
                {address.country && <p>{address.country}</p>}
              </div>
            ) : (
              <p>No shipping address stored.</p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-border/60 pt-4">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Payment:</span>
          <Badge className={`${paymentColors[paymentStatus] || 'bg-muted text-muted-foreground'} border-0 text-xs capitalize`}>
            {paymentStatus}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Fulfillment:</span>
          <Select value={fulfillmentStatus} onValueChange={(value) => onFulfillmentChange(order.id, value)} disabled={updatingId === order.id}>
            <SelectTrigger className="h-8 w-36 border-border/50 bg-background text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="shipped">Shipped</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>

          {updatingId === order.id && <Loader2 className="h-4 w-4 animate-spin text-primary" />}

          <Badge className={`${fulfillmentColors[fulfillmentStatus] || 'bg-muted text-muted-foreground'} border-0 text-xs capitalize`}>
            {fulfillmentStatus}
          </Badge>
        </div>
      </div>
    </Card>
  )
}

function MetricCard({ icon: Icon, label, value }) {
  return (
    <Card className="border-border/50 bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <p className="font-heading text-xl font-bold text-foreground">{value}</p>
    </Card>
  )
}
