import React from 'react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ShoppingBag, Ticket, Star, Zap, Lock, Crown } from 'lucide-react'
import { addToCart } from '@/lib/cartUtils'
import { toast } from 'sonner'
import ProductEngagementBar from './ProductEngagementBar'

const typeIcons = {
  merch: ShoppingBag,
  event: Ticket,
  digital: Zap,
  experience: Star,
  exclusive: Star,
}

const typeColors = {
  merch: 'bg-primary/20 text-primary',
  event: 'bg-secondary/20 text-secondary',
  digital: 'bg-accent/20 text-accent-foreground',
  experience: 'bg-chart-4/20 text-chart-4',
  exclusive: 'bg-chart-5/20 text-chart-5',
}

function getAccessTier(product) {
  return product.access_tier || product.required_tier || (product.requires_subscription ? 'supporter' : 'free')
}

function isGated(product) {
  const tier = getAccessTier(product)
  return Boolean(product.requires_subscription || product.is_private_drop || tier !== 'free')
}

function formatCurrency(value) {
  return `₦${Number(value || 0).toLocaleString()}`
}

export default function ProductCard({ product }) {
  const type = product.type || 'merch'
  const Icon = typeIcons[type] || ShoppingBag
  const gated = isGated(product)
  const accessTier = getAccessTier(product)

  const handleAddToCart = (event) => {
    event.preventDefault()
    event.stopPropagation()

    if (gated) {
      toast.info(`${accessTier} access required. Open the item to unlock.`)
      return
    }

    addToCart(product)
    toast.success(`${product.title || 'Product'} added to cart!`)
  }

  return (
    <div className="transition-transform duration-200 hover:-translate-y-1">
      <Link to={`/product/${product.id}`} className="block group">
        <div className="overflow-hidden rounded-2xl border border-border/50 bg-card transition-all duration-300 hover:border-primary/30 hover:shadow-[0_18px_60px_rgba(168,85,247,0.12)]">
          <div className="relative aspect-square overflow-hidden">
            <img
              src={
                product.image_url ||
                product.cover_url ||
                'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400'
              }
              alt={product.title || 'Product'}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />

            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background/90 to-transparent" />

            <div className="absolute left-3 top-3 flex flex-wrap gap-2">
              <Badge
                className={`${typeColors[type] || typeColors.merch} border-0 text-xs font-medium capitalize`}
              >
                <Icon className="mr-1 h-3 w-3" />
                {type}
              </Badge>

              {product.is_limited && (
                <Badge className="border-0 bg-destructive/90 text-xs text-white">
                  LIMITED
                </Badge>
              )}
            </div>

            <div className="absolute right-3 top-3 flex flex-col items-end gap-2">
              {Number(product.cashback_percent || 0) > 0 && (
                <Badge className="border-0 bg-accent text-xs font-bold text-accent-foreground">
                  {product.cashback_percent}% back
                </Badge>
              )}

              {gated && (
                <Badge className="border-0 bg-background/90 text-xs font-bold text-primary backdrop-blur">
                  <Lock className="mr-1 h-3 w-3" /> {accessTier}
                </Badge>
              )}
            </div>

            <div className="absolute bottom-3 left-3 right-3">
              <ProductEngagementBar
                item={product}
                itemType="product"
                compact
                showLabels={false}
              />
            </div>
          </div>

          <div className="p-4">
            <div className="mb-1 flex items-center justify-between gap-3">
              <p className="min-w-0 truncate text-xs font-medium text-muted-foreground">
                {product.creator_name || 'FanDirect Creator'}
              </p>

              {Number(product.rating_average || 0) > 0 && (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-accent-foreground">
                  <Star className="h-3 w-3 fill-current" />
                  {Number(product.rating_average).toFixed(1)}
                </span>
              )}
            </div>

            <h3 className="mb-2 line-clamp-2 text-sm font-semibold leading-tight text-foreground font-heading">
              {product.title || product.name || 'Untitled product'}
            </h3>

            {product.description && (
              <p className="mb-3 line-clamp-2 text-xs leading-5 text-muted-foreground">
                {product.description}
              </p>
            )}

            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex min-w-0 items-baseline gap-2">
                  <span className="font-heading text-lg font-bold text-foreground">
                    {formatCurrency(product.price || product.fan_price)}
                  </span>

                  {Number(product.original_price || 0) > Number(product.price || 0) && (
                    <span className="text-xs text-muted-foreground line-through">
                      {formatCurrency(product.original_price)}
                    </span>
                  )}
                </div>

                {Number(product.platform_fee_amount || 0) > 0 && (
                  <p className="text-[10px] font-medium text-muted-foreground">
                    Creator ₦{Number(product.creator_base_price || 0).toLocaleString()} · Fee ₦{Number(product.platform_fee_amount || 0).toLocaleString()}
                  </p>
                )}
              </div>

              <Button
                size="sm"
                onClick={handleAddToCart}
                className={`h-8 shrink-0 rounded-lg px-3 text-xs ${gated ? 'bg-background text-primary hover:bg-muted border border-primary/30' : 'bg-primary text-white hover:bg-primary/90'}`}
              >
                {gated ? <Crown className="mr-1 h-3 w-3" /> : <ShoppingBag className="mr-1 h-3 w-3" />}
                {gated ? 'Unlock' : 'Add'}
              </Button>
            </div>

            {Number(product.loyalty_points || 0) > 0 && (
              <p className="mt-2 flex items-center gap-1 text-xs text-primary">
                <Zap className="h-3 w-3" />
                Earn {Number(product.loyalty_points).toLocaleString()} points
              </p>
            )}
          </div>
        </div>
      </Link>
    </div>
  )
}
