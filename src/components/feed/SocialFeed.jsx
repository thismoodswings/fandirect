import React, { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Heart, Coins, Loader2, Share2, Radio } from 'lucide-react'
import { PLATFORM_ICONS } from '@/lib/tokenUtils'
import { formatDistanceToNow } from 'date-fns'
import { SocialFeedPost } from '@/entities'

function getCreatedDate(post) {
  return post?.created_date || post?.created_at || ''
}

function sortNewestFirst(rows = []) {
  return [...rows].sort((a, b) => {
    const aTime = new Date(getCreatedDate(a)).getTime() || 0
    const bTime = new Date(getCreatedDate(b)).getTime() || 0

    return bTime - aTime
  })
}

function getUserEmail(user) {
  return user?.email || user?.user_metadata?.email || ''
}

function getDisplayName(post) {
  return (
    post.user_name ||
    post.user_email?.split('@')?.[0] ||
    'FanDirect fan'
  )
}

export default function SocialFeed({ currentUser }) {
  const [posts, setPosts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [likingId, setLikingId] = useState('')
  const [error, setError] = useState('')

  const currentUserEmail = getUserEmail(currentUser)

  async function loadPosts() {
    setError('')

    try {
      const result = await SocialFeedPost.list()
      const rows = Array.isArray(result) ? result : result?.posts || []
      setPosts(sortNewestFirst(rows || []).slice(0, 30))
    } catch (loadError) {
      console.warn(loadError)
      setError(loadError.message || 'Could not load social feed.')
      setPosts([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadPosts()
    const interval = window.setInterval(loadPosts, 30000)

    let channel = null
    if (typeof SocialFeedPost.subscribeToFeed === 'function') {
      channel = SocialFeedPost.subscribeToFeed((nextPost) => {
        setPosts((currentPosts) =>
          sortNewestFirst([nextPost, ...currentPosts]).slice(0, 30)
        )
      })
    }

    return () => {
      window.clearInterval(interval)
      if (channel && typeof SocialFeedPost.unsubscribe === 'function') {
        SocialFeedPost.unsubscribe(channel)
      }
    }
  }, [])

  async function handleLike(post) {
    if (!post?.id) return

    setLikingId(post.id)
    setError('')

    try {
      const nextLikes = Number(post.likes || 0) + 1

      await SocialFeedPost.update(post.id, {
        likes: nextLikes,
      })

      setPosts((currentPosts) =>
        currentPosts.map((item) =>
          item.id === post.id ? { ...item, likes: nextLikes } : item
        )
      )
    } catch (likeError) {
      console.warn(likeError)
      setError(likeError.message || 'Could not like this post.')
    } finally {
      setLikingId('')
    }
  }

  async function handleShare(post) {
    const shareUrl = post.proof_url || `${window.location.origin}/mine`
    const shareData = {
      title: 'FanDirect mining activity',
      text: `${getDisplayName(post)} earned ${Number(post.fdt_earned || 0)} FDT on FanDirect.`,
      url: shareUrl,
    }

    try {
      if (navigator.share) {
        await navigator.share(shareData)
      } else {
        await navigator.clipboard.writeText(shareUrl)
      }
    } catch {
      // Sharing is optional, so keep the feed calm if the user cancels.
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-16 animate-pulse rounded-xl bg-muted/40"
          />
        ))}
      </div>
    )
  }

  if (posts.length === 0) {
    return (
      <div className="py-10 text-center text-sm text-muted-foreground">
        {error || 'No activity yet — be the first to mine!'}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between rounded-xl border border-primary/20 bg-primary/10 px-3 py-2 text-xs">
        <span className="inline-flex items-center gap-2 font-semibold text-primary">
          <Radio className="h-3.5 w-3.5 animate-pulse" /> Live mining feed
        </span>
        <span className="text-muted-foreground">Auto-refreshing</span>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {posts.map((post) => {
        const createdDate = getCreatedDate(post)
        const isOwnPost = post.user_email === currentUserEmail
        const isLiking = likingId === post.id

        return (
          <div
            key={post.id}
            className="flex items-start gap-3 rounded-xl border border-border/40 bg-muted/30 px-4 py-3"
          >
            <span className="mt-0.5 text-xl">
              {PLATFORM_ICONS[post.platform] || '🌐'}
            </span>

            <div className="min-w-0 flex-1">
              <p className="text-sm text-foreground">
                <span className="font-medium">{getDisplayName(post)}</span>
                <span className="text-muted-foreground">
                  {' '}
                  {post.content ||
                    `did a ${post.engagement_type || 'social engagement'} on ${
                      post.platform || 'social media'
                    }`}
                </span>
              </p>

              <div className="mt-1 flex flex-wrap items-center gap-2">
                {post.creator_name && (
                  <Badge className="border-0 bg-primary/10 text-xs text-primary">
                    {post.creator_name}
                  </Badge>
                )}

                {Number(post.fdt_earned || 0) > 0 && (
                  <span className="flex items-center gap-0.5 text-xs text-accent">
                    <Coins className="h-3 w-3" /> +{post.fdt_earned} FDT
                  </span>
                )}

                {createdDate && (
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(createdDate), {
                      addSuffix: true,
                    })}
                  </span>
                )}
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1">
              <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={() => handleShare(post)}>
                <Share2 className="h-3.5 w-3.5" />
              </Button>
              <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-secondary" onClick={() => handleLike(post)} disabled={isOwnPost || isLiking}>
                {isLiking ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <>
                    <Heart className="h-3.5 w-3.5" />
                    {Number(post.likes || 0) > 0 && (
                      <span className="ml-0.5 text-xs">{post.likes}</span>
                    )}
                  </>
                )}
              </Button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
