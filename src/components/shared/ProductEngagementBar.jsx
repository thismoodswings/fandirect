import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  Heart,
  Bookmark,
  Share2,
  Copy,
  MessageCircle,
  Send,
  Facebook,
  Loader2,
  Twitter,
  Instagram,
  Ghost,
  Smartphone,
  ExternalLink,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/components/AuthContext'
import { ProductInteraction } from '@/entities'

const platforms = [
  { id: 'native', label: 'Phone share sheet', helper: 'Best for Instagram, Snapchat, TikTok', icon: Smartphone },
  { id: 'whatsapp', label: 'WhatsApp', helper: 'Status or chats', icon: MessageCircle },
  { id: 'facebook', label: 'Facebook', helper: 'Post with item preview', icon: Facebook },
  { id: 'x', label: 'X / Twitter', helper: 'Tweet with item card', icon: Twitter },
  { id: 'telegram', label: 'Telegram', helper: 'Send to chats/channels', icon: Send },
  { id: 'snapchat', label: 'Snapchat', helper: 'Deep-link share when supported', icon: Ghost },
  { id: 'instagram', label: 'Instagram', helper: 'Uses phone share sheet', icon: Instagram },
  { id: 'copy', label: 'Copy link', helper: 'Manual share anywhere', icon: Copy },
]

function getUserEmail(user) {
  return user?.email || user?.user_metadata?.email || ''
}

function isMobileBrowser() {
  if (typeof navigator === 'undefined') return false
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '')
}

function getItemImage(item) {
  return item?.image_url || item?.cover_url || item?.thumbnail_url || item?.avatar_url || '/logo-512.png'
}

function getItemDescription(item, shareTitle) {
  return item?.description || item?.bio || `Check out ${shareTitle} on FanDirect.`
}

function formatPrice(item) {
  const value = Number(item?.price || item?.fan_price || 0)
  if (!value) return ''
  return `₦${value.toLocaleString()}`
}

function openWindow(url) {
  window.open(url, '_blank', 'noopener,noreferrer')
}

function openSocialShare(platform, url, text) {
  const encodedUrl = encodeURIComponent(url)
  const encodedText = encodeURIComponent(text)

  if (platform === 'whatsapp') {
    openWindow(`https://wa.me/?text=${encodedText}%20${encodedUrl}`)
    return true
  }

  if (platform === 'telegram') {
    openWindow(`https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`)
    return true
  }

  if (platform === 'facebook') {
    openWindow(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`)
    return true
  }

  if (platform === 'x') {
    openWindow(`https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`)
    return true
  }

  if (platform === 'snapchat') {
    if (isMobileBrowser()) {
      window.location.href = `snapchat://creativekit/share?attachmentUrl=${encodedUrl}`
      return true
    }

    openWindow(`https://www.snapchat.com/scan?attachmentUrl=${encodedUrl}`)
    return true
  }

  return false
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
    if (itemType === 'media_drop') return `${window.location.origin}/creator/${item?.creator_username || item?.creator_slug || item?.creator_id || ''}?drop=${targetId}`
    return `${window.location.origin}/product/${targetId}`
  }, [itemType, targetId, url, item?.creator_id, item?.creator_slug, item?.creator_username])

  const shareTitle = title || item?.title || item?.name || 'FanDirect drop'
  const shareText = `Check out ${shareTitle} on FanDirect.`
  const shareImage = getItemImage(item)
  const shareDescription = getItemDescription(item, shareTitle)
  const sharePrice = formatPrice(item)

  function positionShareMenu(buttonElement = shareButtonRef.current) {
    if (!buttonElement || typeof window === 'undefined') return

    const rect = buttonElement.getBoundingClientRect()
    const menuWidth = compact ? 310 : 340
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

  async function runNativeShare(platform) {
    if (!navigator.share) return false

    await navigator.share({
      title: shareTitle,
      text: shareText,
      url: shareUrl,
    })

    toast.success(`${platform === 'native' ? 'Share' : platform} opened · +5 FDT`)
    return true
  }

  async function handleShare(platform = 'copy', event) {
    event?.preventDefault?.()
    event?.stopPropagation?.()

    setIsBusy(`share-${platform}`)

    try {
      if (platform === 'native' || platform === 'instagram' || platform === 'tiktok') {
        const shared = await runNativeShare(platform)

        if (!shared) {
          await navigator.clipboard.writeText(shareUrl)
          toast.success(`${platform} link copied. Paste it into the app. · +5 FDT`)
        }
      } else if (platform === 'copy') {
        await navigator.clipboard.writeText(shareUrl)
        toast.success('Link copied · +5 FDT')
      } else {
        openSocialShare(platform, shareUrl, shareText)
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
              className="fixed w-[min(340px,calc(100vw-24px))] overflow-hidden rounded-3xl border border-border bg-card p-3 shadow-2xl ring-1 ring-black/10"
              style={{ top: sharePosition.top, left: sharePosition.left }}
              onClick={(event) => {
                event.preventDefault()
                event.stopPropagation()
              }}
            >
              <div className="overflow-hidden rounded-2xl border border-border bg-background">
                <div className="flex gap-3 p-3">
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-muted">
                    <img src={shareImage} alt={shareTitle} className="h-full w-full object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm font-bold text-foreground">{shareTitle}</p>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{shareDescription}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-muted-foreground">
                      {sharePrice && <span className="rounded-full bg-primary/10 px-2 py-1 text-primary">{sharePrice}</span>}
                      <span className="rounded-full bg-muted px-2 py-1">FanDirect preview card</span>
                    </div>
                  </div>
                </div>
                <div className="border-t border-border/70 px-3 py-2 text-[11px] text-muted-foreground">
                  The shared link points back to this item. Social previews use the item image when the Render dynamic share server is enabled.
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                {platforms.map((platform) => {
                  const Icon = platform.icon
                  return (
                    <button
                      key={platform.id}
                      type="button"
                      onClick={(event) => handleShare(platform.id, event)}
                      className="flex items-start gap-2 rounded-2xl border border-border bg-background px-3 py-2 text-left text-xs font-semibold text-foreground hover:bg-muted"
                    >
                      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span className="min-w-0">
                        <span className="block truncate">{platform.label}</span>
                        <span className="mt-0.5 block line-clamp-1 text-[10px] font-medium text-muted-foreground">{platform.helper}</span>
                      </span>
                    </button>
                  )
                })}
              </div>

              <button
                type="button"
                onClick={() => openWindow(shareUrl)}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-background px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <ExternalLink className="h-4 w-4" />
                Open deep link
              </button>
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
