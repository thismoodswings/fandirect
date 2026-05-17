import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CreditCard, Loader2, ShieldCheck, Truck } from 'lucide-react'
import { toast } from 'sonner'

import { useAuth } from '@/components/AuthContext'
import { Order, FanPoints } from '@/entities'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getCart, getCartTotal, clearCart } from '@/lib/cartUtils'

function getFanLevel(totalSpent) {
  if (totalSpent >= 500000) return 'diamond'
  if (totalSpent >= 200000) return 'platinum'
  if (totalSpent >= 100000) return 'gold'
  if (totalSpent >= 50000) return 'silver'
  return 'bronze'
}

function formatCurrency(value) {
  return `₦${Number(value || 0).toLocaleString()}`
}

function isPhysicalItem(item) {
  if (item.shipping_required !== undefined) return Boolean(item.shipping_required)
  return !['digital', 'event', 'experience'].includes(item.type || 'merch')
}

function serializeAddress(address) {
  const clean = Object.fromEntries(
    Object.entries(address).map(([key, value]) => [key, String(value || '').trim()])
  )

  return JSON.stringify(clean)
}

async function updateFanPointsAfterOrder(email, total) {
  const pointsEarned = Math.floor(total / 100)
  const existingPoints = await FanPoints.filter({ user_email: email })

  if (existingPoints.length > 0) {
    const current = existingPoints[0]

    const newTotalSpent = (current.total_spent || 0) + total
    const newOrdersCount = (current.orders_count || 0) + 1
    const newTotalPoints = (current.total_points || 0) + pointsEarned

    await FanPoints.update(current.id, {
      total_points: newTotalPoints,
      total_spent: newTotalSpent,
      orders_count: newOrdersCount,
      level: getFanLevel(newTotalSpent),
    })

    return
  }

  await FanPoints.create({
    user_email: email,
    total_points: pointsEarned,
    total_spent: total,
    orders_count: 1,
    level: 'bronze',
    spins_remaining: 1,
  })
}

export default function Checkout() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [cart, setCart] = useState([])
  const [loading, setLoading] = useState(false)

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'Nigeria',
  })

  useEffect(() => {
    setCart(getCart())

    if (user) {
      setForm((prev) => ({
        ...prev,
        name: user.full_name || user.name || user.user_metadata?.full_name || user.user_metadata?.name || '',
        email: user.email || '',
      }))
    }
  }, [user])

  const total = getCartTotal(cart)
  const requiresShipping = useMemo(() => cart.some(isPhysicalItem), [cart])

  const totals = useMemo(() => {
    return cart.reduce(
      (sum, item) => {
        const quantity = Number(item.quantity || 1)
        const creatorBase = Number(item.creator_base_price || 0) || Math.max(0, Number(item.price || 0) - Number(item.platform_fee_amount || 0))
        const fee = Number(item.platform_fee_amount || 0)

        sum.creatorSubtotal += creatorBase * quantity
        sum.platformFeeTotal += fee * quantity
        return sum
      },
      { creatorSubtotal: 0, platformFeeTotal: 0 }
    )
  }, [cart])

  const completePaidOrder = async ({ orderId, paymentReference }) => {
    await Order.update(orderId, {
      payment_status: 'paid',
      payment_reference: paymentReference,
      fulfillment_status: 'processing',
    })

    await updateFanPointsAfterOrder(form.email, total)

    clearCart()
    toast.success('Payment successful! 🎉')
    navigate('/dashboard')
  }

  const validateForm = () => {
    if (!form.name || !form.email) {
      toast.error('Please fill in your name and email')
      return false
    }

    if (requiresShipping) {
      const missing = []
      if (!form.phone) missing.push('phone number')
      if (!form.address_line1) missing.push('address line 1')
      if (!form.city) missing.push('city')
      if (!form.state) missing.push('state')
      if (!form.country) missing.push('country')

      if (missing.length > 0) {
        toast.error(`Shipping details required: ${missing.join(', ')}`)
        return false
      }
    }

    if (cart.length === 0) {
      toast.error('Your cart is empty')
      return false
    }

    return true
  }

  const handlePayWithPaystack = async () => {
    if (!validateForm()) return

    try {
      setLoading(true)

      const orderNumber = `FD-${Date.now().toString(36).toUpperCase()}`
      const pointsEarned = Math.floor(total / 100)

      const order = await Order.create({
        order_number: orderNumber,
        buyer_email: form.email,
        buyer_name: form.name,
        items: cart.map((item) => ({
          product_id: item.product_id,
          title: item.title,
          price: item.price,
          quantity: item.quantity,
          image_url: item.image_url,
          creator_id: item.creator_id,
          creator_name: item.creator_name,
          type: item.type,
          sku: item.sku,
          creator_base_price: item.creator_base_price,
          platform_fee_amount: item.platform_fee_amount,
          fan_price: item.fan_price,
          access_tier: item.access_tier,
          shipping_required: isPhysicalItem(item),
        })),
        total_amount: total,
        subtotal_amount: totals.creatorSubtotal,
        platform_fee_total: totals.platformFeeTotal,
        creator_payout_total: totals.creatorSubtotal,
        payment_status: 'pending',
        fulfillment_status: 'pending',
        shipping_address: requiresShipping ? serializeAddress(form) : '',
        cashback_earned: 0,
        points_earned: pointsEarned,
        payment_reference: orderNumber,
      })

      const paystackKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY

      if (window.PaystackPop && paystackKey) {
        const handler = window.PaystackPop.setup({
          key: paystackKey,
          email: form.email,
          amount: Math.round(total * 100),
          currency: 'NGN',
          ref: orderNumber,
          metadata: {
            order_id: order.id,
            buyer_name: form.name,
            phone: form.phone,
          },
          callback: async (response) => {
            try {
              await completePaidOrder({
                orderId: order.id,
                paymentReference: response.reference,
              })
            } catch (error) {
              console.error('Payment callback failed:', error)
              toast.error('Payment was received, but order update failed.')
            } finally {
              setLoading(false)
            }
          },
          onClose: () => {
            setLoading(false)
            toast.info('Payment window closed')
          },
        })

        handler.openIframe()
        return
      }

      await completePaidOrder({
        orderId: order.id,
        paymentReference: orderNumber,
      })
    } catch (error) {
      console.error('Checkout failed:', error)
      toast.error(error?.message || 'Checkout failed')
      setLoading(false)
    }
  }

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <h1 className="mb-8 font-heading text-3xl font-bold text-foreground">Checkout</h1>

      <div className="space-y-6">
        <div className="rounded-xl border border-border/50 bg-card p-5">
          <h3 className="mb-4 font-heading font-semibold text-foreground">Order Summary</h3>

          {cart.length === 0 ? (
            <p className="text-sm text-muted-foreground">Your cart is empty.</p>
          ) : (
            cart.map((item) => (
              <div key={item.product_id} className="flex items-center justify-between py-2 text-sm">
                <span className="text-foreground">
                  {item.title} x{item.quantity}
                </span>
                <span className="font-medium">{formatCurrency(item.price * item.quantity)}</span>
              </div>
            ))
          )}

          {cart.length > 0 && (
            <div className="mt-3 space-y-2 border-t border-border pt-3 text-sm text-muted-foreground">
              <div className="flex justify-between">
                <span>Creator subtotal</span>
                <span>{formatCurrency(totals.creatorSubtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Platform service fee</span>
                <span>{formatCurrency(totals.platformFeeTotal)}</span>
              </div>
            </div>
          )}

          <div className="mt-3 flex justify-between border-t border-border pt-3 font-heading text-lg font-bold">
            <span>Total</span>
            <span>{formatCurrency(total)}</span>
          </div>
        </div>

        <div className="space-y-4 rounded-xl border border-border/50 bg-card p-5">
          <h3 className="mb-2 font-heading font-semibold text-foreground">Your Details</h3>

          <div>
            <Label>Full Name</Label>
            <Input value={form.name} onChange={(event) => updateField('name', event.target.value)} className="mt-1 border-border/50 bg-background" />
          </div>

          <div>
            <Label>Email</Label>
            <Input type="email" value={form.email} onChange={(event) => updateField('email', event.target.value)} className="mt-1 border-border/50 bg-background" />
          </div>
        </div>

        <div className="space-y-4 rounded-xl border border-border/50 bg-card p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="font-heading font-semibold text-foreground">Shipping Address</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {requiresShipping ? 'Required for merch and physical orders.' : 'Not required for digital/event-only orders.'}
              </p>
            </div>
            <Truck className="h-5 w-5 text-primary" />
          </div>

          <div>
            <Label>Phone number{requiresShipping ? ' *' : ''}</Label>
            <Input value={form.phone} onChange={(event) => updateField('phone', event.target.value)} className="mt-1 border-border/50 bg-background" placeholder="+234..." />
          </div>

          <div>
            <Label>Address line 1{requiresShipping ? ' *' : ''}</Label>
            <Input value={form.address_line1} onChange={(event) => updateField('address_line1', event.target.value)} className="mt-1 border-border/50 bg-background" placeholder="Street address, building, estate" />
          </div>

          <div>
            <Label>Address line 2</Label>
            <Input value={form.address_line2} onChange={(event) => updateField('address_line2', event.target.value)} className="mt-1 border-border/50 bg-background" placeholder="Apartment, suite, landmark" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>City{requiresShipping ? ' *' : ''}</Label>
              <Input value={form.city} onChange={(event) => updateField('city', event.target.value)} className="mt-1 border-border/50 bg-background" />
            </div>

            <div>
              <Label>State / Region{requiresShipping ? ' *' : ''}</Label>
              <Input value={form.state} onChange={(event) => updateField('state', event.target.value)} className="mt-1 border-border/50 bg-background" />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Postal code</Label>
              <Input value={form.postal_code} onChange={(event) => updateField('postal_code', event.target.value)} className="mt-1 border-border/50 bg-background" />
            </div>

            <div>
              <Label>Country{requiresShipping ? ' *' : ''}</Label>
              <Input value={form.country} onChange={(event) => updateField('country', event.target.value)} className="mt-1 border-border/50 bg-background" />
            </div>
          </div>
        </div>

        <Button
          onClick={handlePayWithPaystack}
          disabled={loading || cart.length === 0}
          className="h-14 w-full rounded-xl bg-gradient-to-r from-primary to-secondary text-lg font-semibold text-white hover:opacity-90"
        >
          {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <CreditCard className="mr-2 h-5 w-5" />}
          Pay {formatCurrency(total)} with Paystack
        </Button>

        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="h-4 w-4" />
          Secured by Paystack. Your payment info is safe.
        </div>
      </div>
    </div>
  )
}
