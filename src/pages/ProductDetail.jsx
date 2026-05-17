import React, { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ShoppingBag,
  Zap,
  MapPin,
  Calendar,
  ArrowLeft,
  Plus,
  Minus,
  Loader2,
  Lock,
  Crown,
  Star,
  ShieldCheck,
} from 'lucide-react'

import { addToCart } from '@/lib/cartUtils'
import { Product, CreatorSubscription, ProductInteraction } from '@/entities'
import { useAuth } from '@/components/AuthContext'
import ProductEngagementBar from '@/components/shared/ProductEngagementBar'
import { setShareMeta, resetShareMeta } from '@/lib/meta'
import { fallbackProducts } from '@/lib/fallbackData'

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
})

const tierRank = { free: 0, supporter: 1, superfan: 2 }

function formatCurrency(value) {
  return `₦${Number(value || 0).toLocaleString()}`
}

function formatDate(value) {
  if (!value) return ''

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  return dateFormatter.format(date)
}

function findFallbackProduct(productId) {
  return fallbackProducts.find((item) => item.id === productId) || null
}

function getProductType(product) {
  return product?.type || product?.category || 'product'
}

function getAccessTier(product) {
  return product?.access_tier || product?.required_tier || (product?.requires_subscription ? 'supporter' : 'free')
}

function requiresAccess(product) {
  const tier = getAccessTier(product)
  return Boolean(product?.requires_subscription || product?.is_private_drop || tier !== 'free')
}

function getUserEmail(user) {
  return user?.email || user?.user_metadata?.email || ''
}

function canAccessProduct(product, subscription) {
  const requiredTier = getAccessTier(product)
  if (!requiresAccess(product)) return true
  if (subscription?.status !== 'active') return false
  return (tierRank[subscription?.tier || 'free'] ?? 0) >= (tierRank[requiredTier] ?? 0)
}

export default function ProductDetail() {
  const { id: productId } = useParams()
  const { user, isAuthenticated } = useAuth()

  const [product, setProduct] = useState(null)
  const [subscription, setSubscription] = useState(null)
  const [quantity, setQuantity] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  const userEmail = getUserEmail(user)

  useEffect(() => {
    let ignore = false

    async function loadProduct() {
      if (!productId) {
        setProduct(null)
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setError('')
      setNotice('')
      setSubscription(null)

      try {
        if (productId.startsWith('demo-')) {
          const demoProduct = findFallbackProduct(productId)

          if (!ignore) {
            setProduct(demoProduct)
            setNotice('Showing demo product.')
          }

          return
        }

        const row = await Product.get(productId)

        if (!ignore) {
          setProduct(row)
          setNotice('')
        }

        await ProductInteraction.record({
          target_type: 'product',
          target_id: row.id,
          user_email: userEmail || 'anonymous',
          interaction_type: 'view',
        }).catch(() => null)
      } catch (loadError) {
        console.warn('Product load failed:', loadError)

        const demoProduct = findFallbackProduct(productId)

        if (!ignore) {
          setProduct(demoProduct)
          setNotice(demoProduct ? 'Supabase product not found yet. Showing demo product.' : '')
          setError(demoProduct ? '' : 'Product not found.')
        }
      } finally {
        if (!ignore) {
          setIsLoading(false)
        }
      }
    }

    loadProduct()

    return () => {
      ignore = true
    }
  }, [productId, userEmail])

  useEffect(() => {
    let mounted = true

    async function loadSubscription() {
      if (!product?.creator_id || !userEmail) {
        setSubscription(null)
        return
      }

      try {
        const row = await CreatorSubscription.getByFanAndCreator(userEmail, product.creator_id)
        if (mounted) setSubscription(row)
      } catch {
        if (mounted) setSubscription(null)
      }
    }

    loadSubscription()

    return () => {
      mounted = false
    }
  }, [product?.creator_id, userEmail])

  const totalPrice = useMemo(
    () => Number(product?.price || product?.fan_price || 0) * Number(quantity || 1),
    [product?.price, product?.fan_price, quantity]
  )

  const productType = getProductType(product)
  const isEvent = productType === 'event'
  const stock = Number(product?.stock ?? product?.inventory_count ?? 0)
  const hasStock = stock > 0 || isEvent
  const gated = requiresAccess(product)
  const allowed = canAccessProduct(product, subscription)
  const requiredTier = getAccessTier(product)
  const creatorSlug = product?.creator_username || product?.creator_slug || product?.creator_id || ''

  useEffect(() => {
    if (!product) return undefined

    setShareMeta({
      title: product.title || product.name || 'FanDirect item',
      description: product.description || `Shop ${product.title || product.name || 'this item'} on FanDirect.`,
      image: product.image_url || product.cover_url || product.thumbnail_url,
      url: `${window.location.origin}/product/${product.id}`,
      type: product.type === 'event' ? 'event' : 'product',
    })

    return () => resetShareMeta()
  }, [product])

  function handleAddToCart() {
    if (!product) return

    if (gated && !allowed) {
      if (!isAuthenticated) {
        setError('Log in and subscribe to unlock this private drop.')
      } else {
        setError(`${requiredTier} subscription required to unlock this item.`)
      }
      return
    }

    addToCart(product, quantity)
    setNotice(`${product.title || product.name || 'Product'} added to cart.`)
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!product) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <p className="text-lg font-semibold text-foreground">Product not found</p>
        <p className="mt-2 text-sm text-muted-foreground">This product may not exist in Supabase yet.</p>
        <Link
          to="/shop"
          className="mt-6 inline-flex items-center justify-center rounded-2xl bg-primary px-6 py-3 text-sm font-semibold text-white hover:opacity-90"
        >
          Back to Shop
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <Link
        to="/shop"
        className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Shop
      </Link>

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

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        <div className="overflow-hidden rounded-3xl border border-border bg-card">
          <div className="relative aspect-square overflow-hidden">
            <img
              src={
                product.image_url ||
                product.cover_url ||
                'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=900'
              }
              alt={product.title || product.name || 'Product'}
              className="h-full w-full object-cover"
            />
            {gated && !allowed && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm">
                <div className="rounded-3xl border border-primary/20 bg-card/95 p-5 text-center shadow-2xl">
                  <Lock className="mx-auto mb-3 h-8 w-8 text-primary" />
                  <p className="font-heading text-lg font-bold text-foreground">Private creator drop</p>
                  <p className="mt-1 text-sm text-muted-foreground">{requiredTier} access required</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="mb-3 flex flex-wrap gap-2">
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold capitalize text-primary">
              {productType}
            </span>

            {gated && (
              <span className="inline-flex items-center gap-1 rounded-full bg-secondary/10 px-3 py-1 text-xs font-semibold capitalize text-secondary">
                <Crown className="h-3 w-3" /> {requiredTier} access
              </span>
            )}

            {product.is_limited && (
              <span className="rounded-full bg-destructive px-3 py-1 text-xs font-semibold text-white">
                Limited Edition
              </span>
            )}

            {product.status && (
              <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold capitalize text-muted-foreground">
                {product.status}
              </span>
            )}
          </div>

          <p className="mb-1 text-sm text-muted-foreground">{product.creator_name || 'FanDirect Creator'}</p>

          <h1 className="mb-4 font-heading text-3xl font-bold text-foreground">
            {product.title || product.name || 'Untitled product'}
          </h1>

          <div className="mb-6 flex flex-wrap items-baseline gap-3">
            <span className="font-heading text-3xl font-bold text-foreground">
              {formatCurrency(product.price || product.fan_price)}
            </span>

            {Number(product.original_price || 0) > Number(product.price || 0) && (
              <span className="text-lg text-muted-foreground line-through">
                {formatCurrency(product.original_price)}
              </span>
            )}

            {Number(product.cashback_percent || 0) > 0 && (
              <span className="rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
                {product.cashback_percent}% cashback
              </span>
            )}
          </div>

          <ProductEngagementBar item={product} itemType="product" />

          {Number(product.platform_fee_amount || 0) > 0 && (
            <div className="my-6 rounded-2xl border border-border bg-card p-4 text-sm">
              <div className="flex justify-between gap-4 text-muted-foreground">
                <span>Creator price</span>
                <span>{formatCurrency(product.creator_base_price)}</span>
              </div>
              <div className="mt-2 flex justify-between gap-4 text-muted-foreground">
                <span>FanDirect service fee</span>
                <span>{formatCurrency(product.platform_fee_amount)}</span>
              </div>
              <div className="mt-3 flex items-center gap-2 border-t border-border pt-3 text-xs text-muted-foreground">
                <ShieldCheck className="h-4 w-4 text-primary" />
                The platform fee powers creator tools, payment processing, support, and FDT rewards.
              </div>
            </div>
          )}

          {product.description && (
            <p className="my-6 leading-relaxed text-muted-foreground">{product.description}</p>
          )}

          {Number(product.rating_average || 0) > 0 && (
            <div className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
              <Star className="h-4 w-4 fill-current text-accent-foreground" />
              {Number(product.rating_average).toFixed(1)} rating · {Number(product.review_count || 0).toLocaleString()} reviews
            </div>
          )}

          {isEvent && (
            <div className="mb-6 space-y-3 rounded-2xl border border-border bg-card p-4">
              {product.event_date && (
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <Calendar className="h-4 w-4 text-primary" />
                  <span>{formatDate(product.event_date)}</span>
                </div>
              )}

              {product.event_location && (
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <MapPin className="h-4 w-4 text-secondary" />
                  <span>{product.event_location}</span>
                </div>
              )}
            </div>
          )}

          {Number(product.loyalty_points || 0) > 0 && (
            <div className="mb-6 flex items-center gap-2 text-sm font-semibold text-primary">
              <Zap className="h-4 w-4" />
              Earn {Number(product.loyalty_points).toLocaleString()} FanPoints with this purchase
            </div>
          )}

          {gated && !allowed && (
            <div className="mb-6 rounded-2xl border border-secondary/30 bg-secondary/10 p-4">
              <p className="font-semibold text-foreground">Subscription required</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Join this creator as a {requiredTier} fan to unlock private products, drops, and event access.
              </p>
              <Link
                to={creatorSlug ? `/creator/${creatorSlug}` : '/creators'}
                className="mt-4 inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
              >
                View creator membership
              </Link>
            </div>
          )}

          <div className="mb-6 flex flex-wrap items-center gap-4">
            <div className="flex items-center rounded-xl border border-border bg-background">
              <button
                type="button"
                className="flex h-10 w-10 items-center justify-center rounded-l-xl hover:bg-muted"
                onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                aria-label="Decrease quantity"
              >
                <Minus className="h-4 w-4" />
              </button>

              <span className="w-12 text-center font-semibold">{quantity}</span>

              <button
                type="button"
                className="flex h-10 w-10 items-center justify-center rounded-r-xl hover:bg-muted"
                onClick={() => setQuantity((value) => value + 1)}
                aria-label="Increase quantity"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            {!isEvent && (
              <span className="text-sm text-muted-foreground">{stock.toLocaleString()} in stock</span>
            )}
          </div>

          <button
            type="button"
            onClick={handleAddToCart}
            disabled={!hasStock || (gated && !allowed)}
            className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-gradient-to-r from-primary to-secondary text-base font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {gated && !allowed ? <Lock className="mr-2 h-5 w-5" /> : <ShoppingBag className="mr-2 h-5 w-5" />}
            {!hasStock
              ? 'Out of Stock'
              : gated && !allowed
                ? `Unlock with ${requiredTier}`
                : `Add to Cart — ${formatCurrency(totalPrice)}`}
          </button>
        </div>
      </div>
    </div>
  )
}
