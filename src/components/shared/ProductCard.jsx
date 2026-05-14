import React from 'react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ShoppingBag, Ticket, Star, Zap } from 'lucide-react'
import { addToCart } from '@/lib/cartUtils'
import { toast } from 'sonner'

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

export default function ProductCard({ product }) {
  const type = product.type || 'merch'
  const Icon = typeIcons[type] || ShoppingBag

  const handleAddToCart = (event) => {
    event.preventDefault()
    event.stopPropagation()

    addToCart(product)
    toast.success(`${product.title || 'Product'} added to cart!`)
  }

  return (
    <div className="transition-transform duration-200 hover:-translate-y-1">
      <Link to={`/product/${product.id}`} className="block group">
        <div className="bg-card rounded-xl border border-border/50 overflow-hidden hover:border-primary/30 transition-all duration-300">
          <div className="relative aspect-square overflow-hidden">
            <img
              src={
                product.image_url ||
                'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400'
              }
              alt={product.title || 'Product'}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />

            <div className="absolute top-3 left-3 flex gap-2">
              <Badge
                className={`${
                  typeColors[type] || typeColors.merch
                } border-0 text-xs font-medium capitalize`}
              >
                <Icon className="w-3 h-3 mr-1" />
                {type}
              </Badge>

              {product.is_limited && (
                <Badge className="bg-destructive/90 text-white border-0 text-xs">
                  LIMITED
                </Badge>
              )}
            </div>

            {Number(product.cashback_percent || 0) > 0 && (
              <Badge className="absolute top-3 right-3 bg-accent text-accent-foreground border-0 text-xs font-bold">
                {product.cashback_percent}% back
              </Badge>
            )}
          </div>

          <div className="p-4">
            <p className="text-xs text-muted-foreground font-medium mb-1">
              {product.creator_name || 'FanDirect Creator'}
            </p>

            <h3 className="font-heading font-semibold text-foreground text-sm leading-tight mb-2 line-clamp-2">
              {product.title || product.name || 'Untitled product'}
            </h3>

            <div className="flex items-center justify-between gap-3">
              <div className="flex items-baseline gap-2 min-w-0">
                <span className="font-heading font-bold text-lg text-foreground">
                  ₦{Number(product.price || 0).toLocaleString()}
                </span>

                {Number(product.original_price || 0) >
                  Number(product.price || 0) && (
                  <span className="text-xs text-muted-foreground line-through">
                    ₦{Number(product.original_price || 0).toLocaleString()}
                  </span>
                )}
              </div>

              <Button
                size="sm"
                onClick={handleAddToCart}
                className="h-8 px-3 bg-primary hover:bg-primary/90 text-xs rounded-lg shrink-0"
              >
                <ShoppingBag className="w-3 h-3 mr-1" />
                Add
              </Button>
            </div>

            {Number(product.loyalty_points || 0) > 0 && (
              <p className="text-xs text-primary mt-2 flex items-center gap-1">
                <Zap className="w-3 h-3" />
                Earn {Number(product.loyalty_points).toLocaleString()} points
              </p>
            )}
          </div>
        </div>
      </Link>
    </div>
  )
}