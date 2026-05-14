import React, { useCallback, useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Lock, Music, Video, Coins, Play, Loader2, Share2 } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { FanToken, MediaDrop } from '@/entities'

const TIER_ORDER = {
  free: 0,
  supporter: 1,
  superfan: 2,
}

function hasAccess(userSub, requiredTier = 'free') {
  if (requiredTier === 'free') return true
  if (!userSub) return false

  return (TIER_ORDER[userSub.tier] ?? 0) >= (TIER_ORDER[requiredTier] ?? 0)
}

function getCreatedDate(drop) {
  return drop?.created_date || drop?.created_at || ''
}

function sortNewestFirst(rows = []) {
  return [...rows].sort((a, b) => {
    const aTime = new Date(getCreatedDate(a)).getTime() || 0
    const bTime = new Date(getCreatedDate(b)).getTime() || 0

    return bTime - aTime
  })
}

async function getPlayableUrl(drop) {
  if (drop.media_url) return drop.media_url

  if (drop.storage_path && typeof MediaDrop.getSignedUrl === 'function') {
    return MediaDrop.getSignedUrl(drop.storage_path)
  }

  return ''
}

export default function MediaDropsSection({
  creatorId,
  userEmail,
  userSubscription,
}) {
  const [drops, setDrops] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [playingId, setPlayingId] = useState('')
  const [error, setError] = useState('')

  const loadDrops = useCallback(async () => {
    if (!creatorId) {
      setDrops([])
      setIsLoading(false)
      return
    }

    setError('')

    try {
      const rows = await MediaDrop.list({
        creator_id: creatorId,
        status: 'published',
      })

      setDrops(sortNewestFirst(rows || []).slice(0, 50))
    } catch (loadError) {
      console.warn(loadError)
      setError(loadError.message || 'Could not load media drops.')
      setDrops([])
    } finally {
      setIsLoading(false)
    }
  }, [creatorId])

  useEffect(() => {
    loadDrops()
  }, [loadDrops])

  async function awardFdt(drop) {
    if (!userEmail || Number(drop.fdt_reward || 0) <= 0) return

    const reward = Number(drop.fdt_reward || 0)
    const wallets = await FanToken.list({ user_email: userEmail })

    if (wallets.length > 0) {
      const wallet = wallets[0]

      await FanToken.update(wallet.id, {
        balance: Number(wallet.balance || 0) + reward,
        total_mined: Number(wallet.total_mined || 0) + reward,
      })
    } else {
      await FanToken.create({
        user_email: userEmail,
        balance: reward,
        total_mined: reward,
        mining_streak: 0,
      })
    }

    toast.success(`+${reward} FDT earned!`)
  }

  async function handlePlay(drop) {
    setPlayingId(drop.id)
    setError('')

    try {
      const playableUrl = await getPlayableUrl(drop)

      if (!playableUrl) {
        throw new Error('This media drop does not have a playable URL yet.')
      }

      await MediaDrop.update(drop.id, {
        play_count: Number(drop.play_count || 0) + 1,
      })

      await awardFdt(drop)

      window.open(playableUrl, '_blank', 'noopener,noreferrer')
      await loadDrops()
    } catch (playError) {
      console.warn(playError)
      setError(playError.message || 'Could not play this media drop.')
      toast.error(playError.message || 'Could not play this media drop.')
    } finally {
      setPlayingId('')
    }
  }

  async function handleShare(drop) {
    const shareUrl = `${window.location.origin}${window.location.pathname}?drop=${drop.id}`
    const shareData = {
      title: drop.title || 'FanDirect media drop',
      text: `Check out ${drop.title || 'this creator drop'} on FanDirect.`,
      url: shareUrl,
    }

    try {
      if (navigator.share) {
        await navigator.share(shareData)
      } else {
        await navigator.clipboard.writeText(shareUrl)
        toast.success('Share link copied')
      }
    } catch (shareError) {
      if (shareError?.name !== 'AbortError') {
        toast.error('Could not share this drop')
      }
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="h-16 animate-pulse rounded-xl bg-card"
          />
        ))}
      </div>
    )
  }

  if (drops.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        No media drops yet — stay tuned!
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {drops.map((drop) => {
        const requiredTier = drop.access_tier || 'free'
        const accessible = hasAccess(userSubscription, requiredTier)
        const isPlaying = playingId === drop.id

        return (
          <div
            key={drop.id}
            className="flex items-center gap-4 rounded-xl border border-border/50 bg-card px-4 py-3"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              {drop.media_type === 'audio' ? (
                <Music className="h-5 w-5 text-primary" />
              ) : (
                <Video className="h-5 w-5 text-secondary" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">
                {drop.title}
              </p>

              <div className="mt-0.5 flex flex-wrap items-center gap-2">
                <span className="text-xs capitalize text-muted-foreground">
                  {drop.media_type || 'media'}
                </span>

                {Number(drop.fdt_reward || 0) > 0 && (
                  <span className="flex items-center gap-0.5 text-xs text-accent">
                    <Coins className="h-3 w-3" /> +{drop.fdt_reward} FDT
                  </span>
                )}

                {getCreatedDate(drop) && (
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(getCreatedDate(drop)), 'MMM d')}
                  </span>
                )}
              </div>
            </div>

            <Badge
              className={`shrink-0 border-0 text-xs capitalize ${
                requiredTier === 'superfan'
                  ? 'bg-secondary/20 text-secondary'
                  : requiredTier === 'supporter'
                    ? 'bg-primary/20 text-primary'
                    : 'bg-muted text-muted-foreground'
              }`}
            >
              {requiredTier}
            </Badge>

            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 shrink-0 text-muted-foreground hover:text-primary"
              onClick={() => handleShare(drop)}
              aria-label={`Share ${drop.title}`}
            >
              <Share2 className="h-3.5 w-3.5" />
            </Button>

            {accessible ? (
              <Button size="sm" variant="outline" className="h-8 shrink-0 px-3 text-xs" onClick={() => handlePlay(drop)} disabled={isPlaying}>
                {isPlaying ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Play className="mr-1 h-3 w-3" />}
                Play
              </Button>
            ) : (
              <div className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                <Lock className="h-3.5 w-3.5" />
                <span className="capitalize">{requiredTier}+</span>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
