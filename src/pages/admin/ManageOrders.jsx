import React, { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2 } from 'lucide-react'
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

export default function ManageOrders() {
  const [orders, setOrders] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState('')
  const [error, setError] = useState('')

  async function loadOrders() {
    setError('')

    try {
      const rows = await Order.list()
      setOrders(sortNewestFirst(rows || []).slice(0, 100))
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
      await Order.update(orderId, {
        fulfillment_status: fulfillmentStatus,
      })

      setOrders((currentOrders) =>
        currentOrders.map((order) =>
          order.id === orderId
            ? { ...order, fulfillment_status: fulfillmentStatus }
            : order
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

  return (
    <div>
      <h1 className="mb-6 font-heading text-2xl font-bold text-foreground">
        Manage Orders
      </h1>

      {error && (
        <div className="mb-6 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card
              key={index}
              className="h-36 animate-pulse border-border/50 bg-card"
            />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const paymentStatus = order.payment_status || 'pending'
            const fulfillmentStatus = order.fulfillment_status || 'pending'
            const items = Array.isArray(order.items) ? order.items : []

            return (
              <Card
                key={order.id}
                className="border-border/50 bg-card p-4"
              >
                <div className="mb-3 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                  <div>
                    <p className="font-heading font-semibold text-foreground">
                      {order.order_number ||
                        order.reference ||
                        `Order ${String(order.id).slice(0, 8)}`}
                    </p>

                    <p className="text-xs text-muted-foreground">
                      {order.buyer_name || 'Unknown buyer'} —{' '}
                      {order.buyer_email || 'No email'}
                      {getCreatedDate(order) &&
                        ` — ${format(new Date(getCreatedDate(order)), 'PPP')}`}
                    </p>
                  </div>

                  <p className="font-heading text-lg font-bold text-foreground">
                    {formatCurrency(order.total_amount)}
                  </p>
                </div>

                {items.length > 0 ? (
                  <div className="mb-3 space-y-1">
                    {items.map((item, index) => {
                      const quantity = Number(item.quantity || 1)
                      const price = Number(item.price || 0)

                      return (
                        <div
                          key={`${item.id || item.title || 'item'}-${index}`}
                          className="flex justify-between gap-4 text-sm text-muted-foreground"
                        >
                          <span className="min-w-0 truncate">
                            {item.title || item.name || 'Product'} x{quantity}
                          </span>

                          <span>{formatCurrency(price * quantity)}</span>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="mb-3 text-sm text-muted-foreground">
                    No order items available.
                  </p>
                )}

                {order.shipping_address && (
                  <p className="mb-3 text-xs text-muted-foreground">
                    📍 {order.shipping_address}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      Payment:
                    </span>

                    <Badge
                      className={`${
                        paymentColors[paymentStatus] ||
                        'bg-muted text-muted-foreground'
                      } border-0 text-xs capitalize`}
                    >
                      {paymentStatus}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      Fulfillment:
                    </span>

                    <Select
                      value={fulfillmentStatus}
                      onValueChange={(value) =>
                        updateFulfillmentStatus(order.id, value)
                      }
                      disabled={updatingId === order.id}
                    >
                      <SelectTrigger className="h-7 w-32 border-border/50 bg-background text-xs">
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

                    {updatingId === order.id && (
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    )}

                    <Badge
                      className={`${
                        fulfillmentColors[fulfillmentStatus] ||
                        'bg-muted text-muted-foreground'
                      } border-0 text-xs capitalize`}
                    >
                      {fulfillmentStatus}
                    </Badge>
                  </div>
                </div>
              </Card>
            )
          })}

          {orders.length === 0 && (
            <div className="py-12 text-center text-muted-foreground">
              No orders yet
            </div>
          )}
        </div>
      )}
    </div>
  )
}