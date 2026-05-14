import React, { useEffect, useState } from 'react'
import { Trophy, Flame } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { FanToken } from '@/entities'

const RANK_STYLES = [
  { bg: 'bg-accent/20 border-accent/30', text: 'text-accent', icon: '🥇' },
  { bg: 'bg-muted/60 border-border', text: 'text-muted-foreground', icon: '🥈' },
  { bg: 'bg-chart-2/10 border-chart-2/20', text: 'text-chart-2', icon: '🥉' },
]

function sortByTotalMined(rows = []) {
  return [...rows].sort(
    (a, b) => Number(b.total_mined || 0) - Number(a.total_mined || 0)
  )
}

export default function FDTLeaderboard({ currentUserEmail }) {
  const [allWallets, setAllWallets] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  async function loadLeaderboard() {
    setError('')

    try {
      const rows = await FanToken.list()
      setAllWallets(sortByTotalMined(rows || []).slice(0, 20))
    } catch (loadError) {
      console.warn(loadError)
      setError(loadError.message || 'Could not load leaderboard.')
      setAllWallets([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadLeaderboard()
  }, [])

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={index}
            className="h-14 animate-pulse rounded-xl border border-border/50 bg-card"
          />
        ))}
      </div>
    )
  }

  if (allWallets.length === 0) {
    return (
      <div className="py-10 text-center text-sm text-muted-foreground">
        <Trophy className="mx-auto mb-2 h-8 w-8 opacity-40" />
        {error || 'No miners yet — be the first!'}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {allWallets.map((wallet, index) => {
        const rank = index + 1
        const style =
          RANK_STYLES[index] || {
            bg: 'bg-card border-border/50',
            text: 'text-muted-foreground',
            icon: `#${rank}`,
          }

        const isMe = wallet.user_email === currentUserEmail
        const displayName = wallet.user_email?.split('@')?.[0] || 'anon'
        const rankLabel =
          typeof style.icon === 'string' && style.icon.startsWith('#')
            ? rank
            : style.icon

        return (
          <div
            key={wallet.id}
            className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-all ${
              style.bg
            } ${isMe ? 'ring-2 ring-primary/50' : ''}`}
          >
            <span className="w-8 text-center text-xl">{rankLabel}</span>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-semibold text-foreground">
                  {displayName}
                </p>

                {isMe && (
                  <Badge className="border-0 bg-primary/20 py-0 text-xs text-primary">
                    You
                  </Badge>
                )}
              </div>

              {Number(wallet.mining_streak || 0) > 1 && (
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Flame className="h-3 w-3 text-secondary" />
                  {wallet.mining_streak}d streak
                </p>
              )}
            </div>

            <div className="shrink-0 text-right">
              <p className={`font-heading text-base font-bold ${style.text}`}>
                {Number(wallet.total_mined || 0).toLocaleString()}
              </p>

              <p className="text-xs text-muted-foreground">FDT mined</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}