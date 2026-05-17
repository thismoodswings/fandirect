import React, { useEffect, useMemo, useState } from 'react'
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, ShoppingBag, RefreshCw, SlidersHorizontal, Loader2 } from 'lucide-react'
import ProductCard from '@/components/shared/ProductCard'
import { Product } from '@/entities'
import { fallbackProducts } from '@/lib/fallbackData'

const categories = ['all', 'merch', 'event', 'digital', 'experience', 'exclusive']

function sortProductsNewestFirst(rows = []) {
  return [...rows].sort((a, b) => {
    const aTime = new Date(a.created_at || a.created_date || 0).getTime() || 0
    const bTime = new Date(b.created_at || b.created_date || 0).getTime() || 0

    return bTime - aTime
  })
}

export default function Shop() {
  const [search, setSearch] = useState('')
  const [activeType, setActiveType] = useState('all')
  const [products, setProducts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [message, setMessage] = useState('')

  async function loadProducts() {
    setMessage('')

    try {
      const rows = await Product.list({ status: 'active' })
      const sortedProducts = sortProductsNewestFirst(rows || []).slice(0, 50)

      if (sortedProducts.length > 0) {
        setProducts(sortedProducts)
        setMessage('Loaded from Supabase.')
      } else {
        setProducts(fallbackProducts)
        setMessage('Showing demo products until Supabase has active products.')
      }
    } catch (error) {
      console.warn(error)

      setProducts(fallbackProducts)
      setMessage('Showing demo products because Supabase products could not be loaded.')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    loadProducts()
  }, [])

  async function handleRefresh() {
    setIsRefreshing(true)
    await loadProducts()
  }

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase()

    return products.filter((product) => {
      const title = String(product.title || product.name || '').toLowerCase()
      const creatorName = String(product.creator_name || '').toLowerCase()
      const description = String(product.description || '').toLowerCase()
      const productType = String(product.type || product.category || '').toLowerCase()

      const matchesSearch =
        !query ||
        title.includes(query) ||
        creatorName.includes(query) ||
        description.includes(query)

      const matchesType = activeType === 'all' || productType === activeType

      return matchesSearch && matchesType
    })
  }, [products, search, activeType])

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-primary">
            <ShoppingBag className="h-3.5 w-3.5" />
            FanDirect marketplace
          </p>

          <h1 className="font-heading text-3xl font-bold text-foreground">
            Shop
          </h1>

          <p className="mt-1 text-muted-foreground">
            Exclusive merch, events, digital drops, and creator experiences.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {message && (
            <p className="rounded-full bg-muted px-3 py-1.5 text-xs text-muted-foreground">
              {message}
            </p>
          )}

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
      </div>

      <div className="mb-8 flex flex-col gap-4 sm:flex-row">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

          <input
            type="search"
            placeholder="Search products or creators..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full rounded-xl border border-border bg-card py-3 pl-10 pr-4 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1 rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-muted-foreground">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Filter
          </span>

          {categories.map((category) => {
            const isActive = activeType === category

            return (
              <button
                key={category}
                type="button"
                onClick={() => setActiveType(category)}
                className={`rounded-xl px-4 py-2 text-xs font-semibold capitalize transition ${
                  isActive
                    ? 'bg-primary text-white'
                    : 'border border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                {category}
              </button>
            )
          })}
        </div>
      </div>

      {isLoading ? (
        <ProductGridSkeleton />
      ) : filteredProducts.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-border py-20 text-center">
          <ShoppingBag className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />

          <p className="text-lg font-semibold text-foreground">
            No products found
          </p>

          <p className="mt-1 text-sm text-muted-foreground">
            Try adjusting your search or filters.
          </p>
        </div>
      )}
    </div>
  )
}

function ProductGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
      {Array.from({ length: 8 }).map((_, index) => (
        <div
          key={index}
          className="overflow-hidden rounded-2xl border border-border bg-card"
        >
          <div className="aspect-square animate-pulse bg-muted" />

          <div className="space-y-2 p-4">
            <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
            <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
            <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  )
}