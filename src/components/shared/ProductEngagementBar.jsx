import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Heart, Bookmark, Share2, Copy, MessageCircle, Send, Facebook, Music2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/components/AuthContext'
import { ProductInteraction } from '@/entities'

const platforms = [
  { id: 'copy', label: 'Copy link', icon: Copy },
  { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
  { id: 'telegram', label: 'Telegram', icon: Send },
  { id: 'facebook', label: 'Facebook', icon: Facebook },
  { id: 'tiktok', label: 'TikTok', icon: Music2 },
  { id: 'instagram', label: 'Instagram', icon: Share2 },
]

function getUserEmail(user) {
  return user?.email || user?.user_metadata?.email || ''
}

function openSocialShare(platform, url, text) {
  const encodedUrl = encodeURIComponent(url)
  const encodedText = encodeURIComponent(text)

  if (platform === 'whatsapp') {
    window.open(`https://wa.me/?text=${encodedText}%20${encodedUrl}`, '_blank', 'noopener,noreferrer')
    return
  }

  if (platform === 'telegram') {
    window.open(`https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`, '_blank', 'noopener,noreferrer')
    return
  }

  if (platform === 'facebook') {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`, '_blank', 'noopener,noreferrer')
    return
  }
}

export default function ProductEngagementBar({
  item,
  itemType = 'product',
  title,
  url,
  compact = false,
  showLabels = true,
}) {
  const { user, isAuthenticated } = useAuth()
  const userEmail = getUserEmail(user)
  const targetId = item?.id
  const [summary, setSummary] = useState({
    likes: Number(item?.like_count || 0),
    wishlists: Number(item?.wishlist_count || 0),
    shares: Number(item?.share_count || 0),
    views: Number(item?.view_count || 0),
  })
  const [state, setState] = useState({ liked: false, wishlisted: false })
  const [isBusy, setIsBusy] = useState('')
  const [shareOpen, setShareOpen] = useState(false)
  const [sharePosition, setSharePosition] = useState({ top: 0, left: 0 })
  const shareButtonRef = useRef(null)

  const shareUrl = useMemo(() => {
    if (url) return url
    if (typeof window === 'undefined') return ''
    if (itemType === 'media_drop') return `${window.location.origin}${window.location.pathname}?drop=${targetId}`
    return `${window.location.origin}/product/${targetId}`
  }, [itemType, targetId, url])

  const shareTitle = title || item?.title || item?.name || 'FanDirect drop'

  function positionShareMenu(buttonElement = shareButtonRef.current) {
    if (!buttonElement || typeof window === 'undefined') return

    const rect = buttonElement.getBoundingClientRect()
    const menuWidth = 224
    const gutter = 12

    setSharePosition({
      top: Math.min(rect.bottom + 8, window.innerHeight - gutter),
      left: Math.min(
        Math.max(gutter, rect.right - menuWidth),
        window.innerWidth - menuWidth - gutter
      ),
    })
  }

  useEffect(() => {
    let mounted = true

    async function loadState() {
      if (!targetId) return

      try {
        const [nextSummary, nextState] = await Promise.all([
          ProductInteraction.getSummary(itemType, targetId),
          ProductInteraction.getUserState({ target_type: itemType, target_id: targetId, user_email: userEmail }),
        ])

        if (mounted) {
          setSummary(nextSummary)
          setState(nextState)
        }
      } catch (error) {
        console.warn(error)
      }
    }

    loadState()

    return () => {
      mounted = false
    }
  }, [itemType, targetId, userEmail])

  useEffect(() => {
    if (!shareOpen) return undefined

    function closeShareMenu(event) {
      if (event?.key && event.key !== 'Escape') return
      setShareOpen(false)
    }

    window.addEventListener('keydown', closeShareMenu)
    window.addEventListener('resize', closeShareMenu)
    window.addEventListener('scroll', closeShareMenu, true)

    return () => {
      window.removeEventListener('keydown', closeShareMenu)
      window.removeEventListener('resize', closeShareMenu)
      window.removeEventListener('scroll', closeShareMenu, true)
    }
  }, [shareOpen])

  async function handleToggle(interactionType, event) {
    event?.preventDefault?.()
    event?.stopPropagation?.()

    if (!isAuthenticated || !userEmail) {
      toast.info('Log in to mine FDT from interactions.')
      return
    }

    setIsBusy(interactionType)

    try {
      const result = await ProductInteraction.toggle({
        target_type: itemType,
        target_id: targetId,
        user_email: userEmail,
        interaction_type: interactionType,
      })

      setSummary(result.summary)
      setState((current) => ({
        ...current,
        liked: interactionType === 'like' ? result.active : current.liked,
        wishlisted: interactionType === 'wishlist' ? result.active : current.wishlisted,
      }))

      if (result.active) {
        toast.success(interactionType === 'wishlist' ? 'Saved to wishlist · +2 FDT' : 'Liked · +1 FDT')
      } else {
        toast.info(interactionType === 'wishlist' ? 'Removed from wishlist' : 'Like removed')
      }
    } catch (error) {
      toast.error(error.message || 'Interaction could not be saved')
    } finally {
      setIsBusy('')
    }
  }

  async function handleShare(platform = 'copy', event) {
    event?.preventDefault?.()
    event?.stopPropagation?.()

    setIsBusy(`share-${platform}`)

    try {
      const text = `Check out ${shareTitle} on FanDirect.`

      if (platform === 'native' && navigator.share) {
        await navigator.share({ title: shareTitle, text, url: shareUrl })
      } else if (platform === 'copy' || platform === 'instagram' || platform === 'tiktok') {
        await navigator.clipboard.writeText(shareUrl)
        toast.success(platform === 'copy' ? 'Link copied · +5 FDT' : `${platform} share link copied · +5 FDT`)
      } else {
        openSocialShare(platform, shareUrl, text)
        toast.success('Share opened · +5 FDT')
      }

      const nextSummary = await ProductInteraction.recordShare({
        target_type: itemType,
        target_id: targetId,
        user_email: userEmail || 'anonymous',
        platform,
      })

      setSummary(nextSummary)
      setShareOpen(false)
    } catch (error) {
      if (error?.name !== 'AbortError') toast.error(error.message || 'Could not share')
    } finally {
      setIsBusy('')
    }
  }

  const buttonClass = compact
    ? 'inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-background/90 px-3 text-xs font-semibold text-muted-foreground backdrop-blur hover:bg-muted hover:text-foreground'
    : 'inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-background px-3 text-sm font-semibold text-muted-foreground hover:bg-muted hover:text-foreground'

  return (
    <div className="relative flex flex-wrap items-center gap-2" onClick={(event) => event.stopPropagation()}>
      <button
        type="button"
        onClick={(event) => handleToggle('like', event)}
        className={`${buttonClass} ${state.liked ? 'border-primary/40 bg-primary/10 text-primary' : ''}`}
        aria-label={`Like ${shareTitle}`}
      >
        {isBusy === 'like' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Heart className={`h-4 w-4 ${state.liked ? 'fill-current' : ''}`} />}
        {showLabels && <span>Like</span>}
        <span>{Number(summary.likes || 0).toLocaleString()}</span>
      </button>

      <button
        type="button"
        onClick={(event) => handleToggle('wishlist', event)}
        className={`${buttonClass} ${state.wishlisted ? 'border-secondary/40 bg-secondary/10 text-secondary' : ''}`}
        aria-label={`Save ${shareTitle}`}
      >
        {isBusy === 'wishlist' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bookmark className={`h-4 w-4 ${state.wishlisted ? 'fill-current' : ''}`} />}
        {showLabels && <span>Save</span>}
        <span>{Number(summary.wishlists || 0).toLocaleString()}</span>
      </button>

      <div className="relative">
        <button
          ref={shareButtonRef}
          type="button"
          onClick={(event) => {
            event.preventDefault()
            event.stopPropagation()
            positionShareMenu(event.currentTarget)
            setShareOpen((value) => !value)
          }}
          className={buttonClass}
          aria-label={`Share ${shareTitle}`}
        >
          {String(isBusy).startsWith('share') ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
          {showLabels && <span>Share</span>}
          <span>{Number(summary.shares || 0).toLocaleString()}</span>
        </button>

        {shareOpen && typeof document !== 'undefined' && createPortal(
          <div
            className="fixed inset-0 z-[9999]"
            onClick={(event) => {
              event.preventDefault()
              event.stopPropagation()
              setShareOpen(false)
            }}
          >
            <div
              className="fixed w-56 overflow-hidden rounded-2xl border border-border bg-card p-2 shadow-2xl ring-1 ring-black/5"
              style={{ top: sharePosition.top, left: sharePosition.left }}
              onClick={(event) => {
                event.preventDefault()
                event.stopPropagation()
              }}
            >
              <div className="border-b border-border/70 px-3 py-2">
                <p className="text-xs font-bold text-foreground">Share item</p>
                <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">{shareTitle}</p>
              </div>

              <div className="py-1">
                {platforms.map((platform) => {
                  const Icon = platform.icon
                  return (
                    <button
                      key={platform.id}
                      type="button"
                      onClick={(event) => handleShare(platform.id, event)}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      <Icon className="h-4 w-4" />
                      {platform.label}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>

      {!compact && (
        <span className="rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent-foreground">
          Mine FDT through interactions
        </span>
      )}
    </div>
  )
}
