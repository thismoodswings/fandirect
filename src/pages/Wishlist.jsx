import React, { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Heart, Loader2, ShoppingBag } from 'lucide-react'
import { useAuth } from '@/components/AuthContext'
import { Product, ProductInteraction } from '@/entities'
import ProductCard from '@/components/shared/ProductCard'

function getUserEmail(user) {
  return user?.email || user?.user_metadata?.email || ''
}

export default function Wishlist() {
  const { user, isAuthenticated, isLoadingAuth } = useAuth()
  const [products, setProducts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const userEmail = getUserEmail(user)

  const loadWishlist = useCallback(async () => {
    if (!userEmail) {
      setProducts([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const interactions = await ProductInteraction.list({
        target_type: 'product',
        user_email: userEmail,
        interaction_type: 'wishlist',
      })

      const ids = [...new Set((interactions || []).map((row) => row.target_id).filter(Boolean))]
      const rows = await Promise.all(ids.map((id) => Product.get(id).catch(() => null)))
      setProducts(rows.filter(Boolean))
    } catch (loadError) {
      console.warn(loadError)
      setError(loadError.message || 'Could not load wishlist.')
    } finally {
      setIsLoading(false)
    }
  }, [userEmail])

  useEffect(() => {
    if (!isLoadingAuth) loadWishlist()
  }, [isLoadingAuth, loadWishlist])

  if (isLoadingAuth || isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <Heart className="mx-auto mb-4 h-12 w-12 text-primary" />
        <h1 className="font-heading text-2xl font-bold text-foreground">Wishlist</h1>
        <p className="mt-2 text-sm text-muted-foreground">Log in to save creator products, events, and drops.</p>
        <Link to="/login" className="mt-6 inline-flex rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90">
          Log in
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-primary">
            <Heart className="h-3.5 w-3.5" />
            Saved items
          </p>
          <h1 className="font-heading text-3xl font-bold text-foreground">Wishlist</h1>
          <p className="mt-1 text-muted-foreground">Products, private drops, and events saved for later.</p>
        </div>
      </div>

      {error && <div className="mb-6 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{error}</div>}

      {products.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
          {products.map((product) => <ProductCard key={product.id} product={product} />)}
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-border py-20 text-center">
          <ShoppingBag className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <p className="text-lg font-semibold text-foreground">No saved items yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Tap Save on any item to build a wishlist.</p>
          <Link to="/shop" className="mt-6 inline-flex rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90">
            Browse shop
          </Link>
        </div>
      )}
    </div>
  )
}
