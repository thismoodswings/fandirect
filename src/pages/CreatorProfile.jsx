import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import {
  CheckCircle, Users, ExternalLink, Music, Crown,
  Loader2, ShoppingBag, ArrowLeft, Coins, PlayCircle, Sparkles, Share2,
} from 'lucide-react'
import { toast } from 'sonner'
import ProductCard from '@/components/shared/ProductCard'
import { useAuth } from '@/components/AuthContext'
import { Creator, CreatorSubscription, Product, MediaDrop } from '@/entities'
import { fallbackCreators, fallbackProducts } from '@/lib/fallbackData'

const tabs = [
  { id: 'products',   label: 'Products & Drops', icon: ShoppingBag },
  { id: 'media',      label: 'Audio & Video',     icon: Music },
  { id: 'subscribe',  label: 'Subscribe',          icon: Crown },
]

const subscriptionPlans = [
  {
    tier: 'free',
    name: 'Free Fan',
    price: '₦0',
    description: 'Follow the creator and access public drops.',
    benefits: ['Public media drops', 'Creator updates', 'Basic fan rewards'],
  },
  {
    tier: 'supporter',
    name: 'Supporter',
    price: '₦2,500',
    description: 'Unlock supporter-only content and higher fan rewards.',
    benefits: ['Supporter drops', 'Higher FDT rewards', 'Early merch access'],
  },
  {
    tier: 'superfan',
    name: 'Superfan',
    price: '₦7,500',
    description: 'Get the highest creator access tier.',
    benefits: ['Superfan-only drops', 'Maximum FDT rewards', 'Priority fan perks'],
  },
]

const tierRank = { free: 0, supporter: 1, superfan: 2 }

function normalizeUrl(url) {
  if (!url) return ''
  const value = String(url).trim()
  if (!value) return ''
  return /^https?:\/\//i.test(value) ? value : `https://${value}`
}

function getSubscriptionTier(subscription) {
  return subscription?.status === 'active' ? subscription.tier || 'free' : 'free'
}

function canAccessDrop(fanTier, dropTier) {
  return (tierRank[fanTier] ?? 0) >= (tierRank[dropTier || 'free'] ?? 0)
}

export default function CreatorProfile() {
  // Route now uses :username — works for both username slugs and UUIDs as fallback
  const { username: creatorSlug } = useParams()
  const { user, isAuthenticated, isLoadingAuth } = useAuth()

  const [creator, setCreator]               = useState(null)
  const [products, setProducts]             = useState([])
  const [drops, setDrops]                   = useState([])
  const [userSubscription, setUserSubscription] = useState(null)
  const [activeTab, setActiveTab]           = useState('products')
  const [isLoading, setIsLoading]           = useState(true)
  const [message, setMessage]               = useState('')
  const [error, setError]                   = useState('')

  const loadCreatorProfile = useCallback(async () => {
    if (!creatorSlug) {
      setCreator(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError('')
    setMessage('')

    try {
      // Show demo if slug starts with 'demo-'
      if (creatorSlug.startsWith('demo-')) {
        const demo = fallbackCreators[0]
        setCreator(demo)
        setProducts(fallbackProducts)
        setDrops([])
        setMessage('Showing demo profile.')
        return
      }

      // Try fetching by username first, then fall back to ID.
      // Only use the featured fallback when the creator record itself cannot be found.
      let nextCreator = null
      try {
        nextCreator = await Creator.getByUsername(creatorSlug)
      } catch (usernameError) {
        nextCreator = await Creator.get(creatorSlug)
      }

      setCreator(nextCreator)
      setMessage('')

      const [productResult, dropResult] = await Promise.allSettled([
        Product.list({ creator_id: nextCreator.id, status: 'active' }),
        MediaDrop.list({ creator_id: nextCreator.id }),
      ])

      if (productResult.status === 'fulfilled') {
        setProducts(productResult.value || [])
      } else {
        setProducts([])
        console.warn('Creator products could not be loaded.', productResult.reason)
      }

      if (dropResult.status === 'fulfilled') {
        setDrops(dropResult.value || [])
      } else {
        setDrops([])
        console.warn('Creator media drops could not be loaded.', dropResult.reason)
      }
    } catch (loadError) {
      setCreator(fallbackCreators[0])
      setProducts(fallbackProducts)
      setDrops([])
      setMessage('This creator profile is not live yet. Showing a featured preview.')
      console.warn('Creator profile could not be loaded.', loadError)
    } finally {
      setIsLoading(false)
    }
  }, [creatorSlug])

  const loadSubscription = useCallback(async () => {
    if (!creator?.id || !user?.email || creatorSlug?.startsWith('demo-')) {
      setUserSubscription(null)
      return
    }
    try {
      const subscription = await CreatorSubscription.getByFanAndCreator(user.email, creator.id)
      setUserSubscription(subscription)
    } catch {
      setUserSubscription(null)
    }
  }, [creator?.id, user?.email, creatorSlug])

  useEffect(() => { loadCreatorProfile() }, [loadCreatorProfile])
  useEffect(() => { if (!isLoadingAuth) loadSubscription() }, [isLoadingAuth, loadSubscription])

  const activeTier = useMemo(() => getSubscriptionTier(userSubscription), [userSubscription])

  const socialLinks = useMemo(() => {
    if (!creator?.social_links || Array.isArray(creator.social_links)) return []
    return Object.entries(creator.social_links)
      .filter(([, url]) => Boolean(url))
      .map(([name, url]) => ({ name, url: normalizeUrl(url) }))
  }, [creator?.social_links])

  const fanCount = Number(creator?.fan_count || creator?.followers || 0)
  const creatorName = creator?.name || creator?.display_name || creator?.full_name || 'FanDirect Creator'
  const creatorAvatar = creator?.avatar_url || creator?.profile_photo_url || creator?.image_url || creator?.photo_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=300'
  const creatorCover = creator?.cover_url || creator?.cover_image_url || creator?.banner_url || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1200'

  if (isLoading || isLoadingAuth) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!creator) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center text-muted-foreground">
        Creator not found.
      </div>
    )
  }

  return (
    <div>
      <div className="relative h-48 bg-muted md:h-64">
        <img
          src={creatorCover}
          alt={`${creatorName} cover`}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 pb-16 sm:px-6">
        <Link to="/creators" className="mt-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to creators
        </Link>

        <div className="-mt-16 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end">
            <img
              src={creatorAvatar}
              alt={creatorName}
              className="h-28 w-28 rounded-3xl border-4 border-background object-cover md:h-32 md:w-32"
            />
            <div className="pb-2">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-heading text-3xl font-bold text-foreground md:text-4xl">
                  {creatorName}
                </h1>
                {creator.verified && <CheckCircle className="h-6 w-6 text-primary" />}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold capitalize text-primary">
                  {creator.category || 'Creator'}
                </span>
                <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" /> {fanCount.toLocaleString()} fans
                </span>
                {message && (
                  <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
                    {message}
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setActiveTab('subscribe')}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-3 font-semibold text-white hover:opacity-90"
          >
            <Crown className="h-4 w-4" /> Subscribe / join community
          </button>
        </div>

        <p className="mt-6 max-w-3xl text-base leading-8 text-muted-foreground md:text-lg">
          {creator.bio || 'Exclusive fan content, merch, rewards, and community updates.'}
        </p>

        {socialLinks.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-3">
            {socialLinks.map((link) => (
              <a key={link.name} href={link.url} target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/10">
                {link.name} <ExternalLink className="h-3 w-3" />
              </a>
            ))}
          </div>
        )}

        {(error || (isAuthenticated && userSubscription)) && (
          <div className={`mt-6 rounded-2xl border p-4 text-sm ${
            error
              ? 'border-destructive/30 bg-destructive/10 text-destructive'
              : 'border-primary/20 bg-primary/10 text-primary'
          }`}>
            {error || `You are subscribed as ${activeTier}.`}
          </div>
        )}

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <MetricCard icon={Users}       label="Fans"         value={fanCount.toLocaleString()} iconClassName="text-primary" />
          <MetricCard icon={Coins}       label="Rewards"      value="FDT"                        iconClassName="text-accent" />
          <MetricCard icon={PlayCircle}  label="Media drops"  value={drops.length.toString()}    iconClassName="text-secondary" />
        </div>

        <div className="mt-10 flex gap-1 overflow-x-auto rounded-2xl border border-border bg-card p-1">
          {tabs.map((tab) => (
            <TabButton key={tab.id} active={activeTab === tab.id} icon={tab.icon} onClick={() => setActiveTab(tab.id)}>
              {tab.label}
            </TabButton>
          ))}
        </div>

        <div className="mt-6">
          {activeTab === 'products' && <ProductsPanel products={products} creatorName={creator.name} />}
          {activeTab === 'media'    && (
            <MediaPanel drops={drops} activeTier={activeTier} isAuthenticated={isAuthenticated}
              onSubscribeClick={() => setActiveTab('subscribe')} setError={setError} />
          )}
          {activeTab === 'subscribe' && (
            <SubscriptionPanel creator={creator} user={user} isAuthenticated={isAuthenticated}
              activeTier={activeTier} userSubscription={userSubscription}
              onChanged={loadSubscription} setError={setError} setMessage={setMessage} />
          )}
        </div>
      </div>
    </div>
  )
}

function ProductsPanel({ products, creatorName }) {
  if (!products.length) {
    return (
      <div className="rounded-3xl border border-dashed border-border py-14 text-center text-sm text-muted-foreground">
        <ShoppingBag className="mx-auto mb-3 h-8 w-8 opacity-30" />
        No products yet — stay tuned.
      </div>
    )
  }
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={{ ...product, creator_name: product.creator_name || creatorName }} />
      ))}
    </div>
  )
}

function MediaPanel({ drops, activeTier, isAuthenticated, onSubscribeClick, setError }) {
  if (!drops.length) {
    return (
      <div className="rounded-3xl border border-dashed border-border py-14 text-center text-sm text-muted-foreground">
        <Music className="mx-auto mb-3 h-8 w-8 opacity-30" />
        No audio or video drops yet.
      </div>
    )
  }
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {drops.map((drop) => (
        <MediaDropCard key={drop.id} drop={drop} activeTier={activeTier}
          isAuthenticated={isAuthenticated} onSubscribeClick={onSubscribeClick} setError={setError} />
      ))}
    </div>
  )
}

function MediaDropCard({ drop, activeTier, isAuthenticated, onSubscribeClick, setError }) {
  const [playerUrl, setPlayerUrl] = useState(drop.media_url || '')
  const [isPreparing, setIsPreparing] = useState(false)
  const accessAllowed = canAccessDrop(activeTier, drop.access_tier)

  async function preparePlayback() {
    if (!isAuthenticated || !accessAllowed) { onSubscribeClick(); return }
    setIsPreparing(true)
    setError('')
    try {
      let nextUrl = drop.media_url || playerUrl
      if (!nextUrl && drop.storage_path) {
        nextUrl = await MediaDrop.getSignedUrl(drop.storage_path)
      }
      if (!nextUrl) throw new Error('No playable URL for this drop.')
      setPlayerUrl(nextUrl)
      await MediaDrop.recordPlay(drop.id)
    } catch (err) {
      setError(`Could not open media drop. ${err.message}`)
    } finally {
      setIsPreparing(false)
    }
  }

  async function shareDrop() {
    const shareUrl = `${window.location.origin}${window.location.pathname}?drop=${drop.id}`
    const shareData = {
      title: drop.title || 'FanDirect media drop',
      text: `Listen to ${drop.title || 'this exclusive creator drop'} on FanDirect.`,
      url: shareUrl,
    }

    try {
      if (navigator.share) {
        await navigator.share(shareData)
      } else {
        await navigator.clipboard.writeText(shareUrl)
        toast.success('Share link copied')
      }
    } catch (error) {
      if (error?.name !== 'AbortError') toast.error('Could not share this drop')
    }
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-border bg-card">
      <div className="relative h-44 bg-muted">
        {drop.thumbnail_url ? (
          <img src={drop.thumbnail_url} alt={drop.title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center bg-primary/10">
            <Music className="h-12 w-12 text-primary" />
          </div>
        )}
        {!accessAllowed && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/70 backdrop-blur-sm">
            <div className="rounded-full bg-card px-4 py-2 text-sm font-semibold text-foreground shadow-sm">
              🔒 {drop.access_tier} access
            </div>
          </div>
        )}
      </div>
      <div className="p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">{drop.media_type || 'media'} drop</p>
        <h3 className="mt-2 font-heading text-xl font-bold text-foreground">{drop.title}</h3>
        {drop.description && <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{drop.description}</p>}
        <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span>{Number(drop.play_count || 0).toLocaleString()} plays</span>
          <span>•</span>
          <span>{Number(drop.fdt_reward || 0).toLocaleString()} FDT/play</span>
        </div>
        {playerUrl && accessAllowed && (
          <div className="mt-4">
            {drop.media_type === 'audio'
              ? <audio controls src={playerUrl} className="w-full" />
              : <video controls src={playerUrl} className="max-h-72 w-full rounded-2xl" />}
          </div>
        )}
        <div className="mt-5 grid grid-cols-[1fr_auto] gap-2">
          <button type="button" onClick={preparePlayback} disabled={isPreparing}
            className={`inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60 ${
              accessAllowed && isAuthenticated
                ? 'bg-primary text-white hover:opacity-90'
                : 'border border-border bg-background text-foreground hover:bg-muted'
            }`}>
            {isPreparing ? <Loader2 className="h-4 w-4 animate-spin" /> : accessAllowed && isAuthenticated ? <PlayCircle className="h-4 w-4" /> : <Crown className="h-4 w-4" />}
            {accessAllowed && isAuthenticated ? 'Play drop' : 'Subscribe to access'}
          </button>
          <button type="button" onClick={shareDrop}
            className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-background text-muted-foreground hover:bg-muted hover:text-primary"
            aria-label={`Share ${drop.title}`}>
            <Share2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

function SubscriptionPanel({ creator, user, isAuthenticated, activeTier, userSubscription, onChanged, setError, setMessage }) {
  const [isSavingTier, setIsSavingTier] = useState('')

  async function handleSubscribe(tier) {
    if (!isAuthenticated || !user?.email) { window.location.assign('/mine'); return }
    setIsSavingTier(tier)
    setError('')
    setMessage('')
    try {
      const expiresAt = tier === 'free' ? null : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      if (userSubscription?.id) {
        await CreatorSubscription.update(userSubscription.id, { tier, status: 'active', expires_at: expiresAt })
      } else {
        await CreatorSubscription.create({ fan_email: user.email, creator_id: creator.id, tier, status: 'active', expires_at: expiresAt })
      }
      setMessage(`Subscribed as ${tier}.`)
      await onChanged()
    } catch (err) {
      setError(`Could not update subscription. ${err.message}`)
    } finally {
      setIsSavingTier('')
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      {subscriptionPlans.map((plan) => {
        const isCurrentTier = activeTier === plan.tier && userSubscription
        const isSaving = isSavingTier === plan.tier
        return (
          <div key={plan.tier} className={`rounded-3xl border bg-card p-6 ${plan.tier === 'superfan' ? 'border-secondary/40 shadow-sm' : 'border-border'}`}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-heading text-xl font-bold text-foreground">{plan.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>
              </div>
              {plan.tier === 'superfan' && <Sparkles className="h-6 w-6 text-secondary" />}
            </div>
            <p className="mt-5 font-heading text-3xl font-bold text-foreground">
              {plan.price}
              {plan.tier !== 'free' && <span className="text-sm font-medium text-muted-foreground">/mo</span>}
            </p>
            <ul className="mt-5 space-y-2 text-sm text-muted-foreground">
              {plan.benefits.map((benefit) => (
                <li key={benefit} className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-primary" /> {benefit}
                </li>
              ))}
            </ul>
            <button type="button" onClick={() => handleSubscribe(plan.tier)} disabled={isSaving || isCurrentTier}
              className={`mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60 ${
                isCurrentTier ? 'border border-border bg-muted text-muted-foreground' : 'bg-primary text-white hover:opacity-90'
              }`}>
              {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
              {isCurrentTier ? 'Current plan' : isAuthenticated ? `Choose ${plan.name}` : 'Log in to subscribe'}
            </button>
          </div>
        )
      })}
      <div className="rounded-3xl border border-border bg-muted/40 p-5 text-sm text-muted-foreground lg:col-span-3">
        Connect Paystack or another payment provider before charging real fans.
      </div>
    </div>
  )
}

function MetricCard({ icon: Icon, label, value, iconClassName }) {
  return (
    <div className="rounded-3xl border border-border bg-card p-6">
      <Icon className={`h-6 w-6 ${iconClassName}`} />
      <p className="mt-3 font-heading text-2xl font-bold text-foreground">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  )
}

function TabButton({ active, onClick, icon: Icon, children }) {
  return (
    <button type="button" onClick={onClick}
      className={`inline-flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold transition ${
        active ? 'bg-primary text-white' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      }`}>
      <Icon className="h-4 w-4" />
      {children}
    </button>
  )
}
