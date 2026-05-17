import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Zap,
  ArrowRight,
  Star,
  ShoppingBag,
  Ticket,
  Gift,
  TrendingUp,
  RefreshCw,
} from 'lucide-react'
import { motion } from 'framer-motion'
import ProductCard from '@/components/shared/ProductCard'
import CreatorCard from '@/components/shared/CreatorCard'
import FanDirectLogo from '@/components/brand/FanDirectLogo'
import { Product, Creator } from '@/entities'
import { fallbackProducts, fallbackCreators } from '@/lib/fallbackData'
function sortProductsNewestFirst(rows = []) {
  return [...rows].sort((a, b) => {
    const aTime = new Date(a.created_at || a.created_date || 0).getTime() || 0
    const bTime = new Date(b.created_at || b.created_date || 0).getTime() || 0

    return bTime - aTime
  })
}

function sortCreatorsByFans(rows = []) {
  return [...rows].sort(
    (a, b) => Number(b.fan_count || 0) - Number(a.fan_count || 0)
  )
}

function HeroSection() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-secondary/5 to-transparent" />
      <div className="absolute left-10 top-20 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
      <div className="absolute bottom-10 right-10 h-96 w-96 rounded-full bg-secondary/10 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 md:py-32">
        <div className="mx-auto max-w-3xl text-center">
          <span className="mb-6 inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-sm font-semibold text-primary">
            <Zap className="mr-1.5 h-3.5 w-3.5" />
            Fans First — Always
          </span>

          <h1 className="mb-6 font-heading text-4xl font-bold leading-tight text-foreground md:text-6xl lg:text-7xl">
            Get closer to your
            <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              {' '}
              favorite creators
            </span>
          </h1>

          <p className="mx-auto mb-8 max-w-2xl font-body text-lg text-muted-foreground md:text-xl">
            Exclusive merch, VIP events, direct experiences, fan rewards, and
            creator communities in one place.
          </p>

          <div className="flex flex-col justify-center gap-4 sm:flex-row">
            <Link
              to="/shop"
              className="inline-flex h-12 items-center justify-center rounded-xl bg-gradient-to-r from-primary to-secondary px-8 text-base font-semibold text-white hover:opacity-90"
            >
              <ShoppingBag className="mr-2 h-5 w-5" />
              Shop Now
            </Link>

            <Link
              to="/creators"
              className="inline-flex h-12 items-center justify-center rounded-xl border border-border bg-background px-8 text-base font-semibold text-foreground hover:bg-muted"
            >
              Explore Creators
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
        </div>

        <div className="mx-auto mt-16 grid max-w-3xl grid-cols-2 gap-4 md:grid-cols-4">
          {[
            { label: 'Creators', value: '200+', icon: Star },
            { label: 'Products', value: '5K+', icon: ShoppingBag },
            { label: 'Events', value: '100+', icon: Ticket },
            { label: 'Fans Rewarded', value: '50K+', icon: Gift },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-border bg-card/60 p-4 text-center backdrop-blur"
            >
              <stat.icon className="mx-auto mb-2 h-5 w-5 text-primary" />
              <p className="font-heading text-xl font-bold text-foreground">
                {stat.value}
              </p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function FeaturedSection({ title, subtitle, children, link, linkText }) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <h2 className="font-heading text-2xl font-bold text-foreground md:text-3xl">
            {title}
          </h2>

          <p className="mt-1 text-muted-foreground">{subtitle}</p>
        </div>

        {link && (
          <Link
            to={link}
            className="inline-flex items-center gap-1 whitespace-nowrap text-sm font-semibold text-primary hover:underline"
          >
            {linkText}
            <ArrowRight className="h-4 w-4" />
          </Link>
        )}
      </div>

      {children}
    </section>
  )
}

export default function Home() {
  const [products, setProducts] = useState([])
  const [creators, setCreators] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [message, setMessage] = useState('')

  async function loadHomeData() {
    setMessage('')

    try {
      const [productRows, creatorRows] = await Promise.all([
        Product.list({ status: 'active' }).catch(() => []),
        Creator.list({ status: 'active' }).catch(() => []),
      ])

      const nextProducts = sortProductsNewestFirst(productRows || []).slice(0, 8)
      const nextCreators = sortCreatorsByFans(creatorRows || []).slice(0, 6)

      setProducts(nextProducts.length ? nextProducts : fallbackProducts.slice(0, 8))
      setCreators(nextCreators.length ? nextCreators : fallbackCreators.slice(0, 6))

      if (nextProducts.length || nextCreators.length) {
        setMessage('Loaded from Supabase.')
      } else {
        setMessage('Showing demo content until Supabase has products and creators.')
      }
    } catch (error) {
      console.warn(error)

      setProducts(fallbackProducts.slice(0, 8))
      setCreators(fallbackCreators.slice(0, 6))
      setMessage('Showing demo content because Supabase could not be loaded.')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    loadHomeData()
  }, [])

  async function handleRefresh() {
    setIsRefreshing(true)
    await loadHomeData()
  }

  return (
    <div>
      <HeroSection />

      <section className="mx-auto max-w-7xl px-4 pt-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-end gap-3">
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
      </section>

      <FeaturedSection
        title="Trending Now"
        subtitle="Hottest drops from your favorite creators"
        link="/shop"
        linkText="View all"
      >
        {isLoading ? (
          <ProductGridSkeleton />
        ) : products.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
            {products.slice(0, 4).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={ShoppingBag}
            title="No products yet"
            description="Add active products in Supabase to show them here."
          />
        )}
      </FeaturedSection>

      <FeaturedSection
        title="Top Creators"
        subtitle="Follow the biggest names on FanDirect"
        link="/creators"
        linkText="See all creators"
      >
        {isLoading ? (
          <CreatorGridSkeleton />
        ) : creators.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
            {creators.slice(0, 6).map((creator) => (
              <CreatorCard key={creator.id} creator={creator} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Star}
            title="No creators yet"
            description="Add active creators in Supabase to show them here."
          />
        )}
      </FeaturedSection>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-r from-primary/20 via-secondary/20 to-accent/20 p-8 md:p-12">
          <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />

          <div className="relative flex flex-col items-center gap-6 md:flex-row">
            <div className="flex-1">
              <h3 className="mb-3 font-heading text-2xl font-bold text-foreground md:text-3xl">
                Earn While You Shop
              </h3>

              <p className="max-w-lg text-muted-foreground">
                Every purchase earns you FanPoints and cashback. Level up from
                Bronze to Diamond and unlock exclusive perks, early access, and
                spin-to-win rewards.
              </p>
            </div>

            <Link
              to="/dashboard"
              className="inline-flex h-12 items-center justify-center rounded-xl bg-primary px-8 font-semibold text-white hover:opacity-90"
            >
              <TrendingUp className="mr-2 h-5 w-5" />
              View Rewards
            </Link>
          </div>
        </div>
      </section>

      <footer className="mt-12 border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-10 sm:px-6 md:flex-row">
          <div className="flex items-center gap-2">
            <FanDirectLogo className="h-8 w-8" />
            <span className="font-heading text-lg font-bold">FanDirect</span>
          </div>

          <p className="text-sm text-muted-foreground">
            © 2026 FanDirect. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}

function ProductGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="h-72 animate-pulse rounded-2xl border border-border bg-card"
        />
      ))}
    </div>
  )
}

function CreatorGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="h-64 animate-pulse rounded-2xl border border-border bg-card"
        />
      ))}
    </div>
  )
}

function EmptyState({ icon: Icon, title, description }) {
  return (
    <div className="rounded-3xl border border-dashed border-border py-14 text-center">
      <Icon className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />

      <p className="text-lg font-semibold text-foreground">{title}</p>

      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  )
}