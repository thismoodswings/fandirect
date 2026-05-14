import React from 'react'
import { Badge } from '@/components/ui/badge'
import { Coins, TrendingUp, Flame, ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PLATFORM_ICONS } from '@/lib/tokenUtils'

export default function TokenWallet({ wallet, isLoading }) {
  if (isLoading) {
    return (
      <div className="bg-card rounded-2xl border border-border/50 h-48 animate-pulse" />
    )
  }

  const balance = Number(wallet?.balance || 0)
  const totalMined = Number(wallet?.total_mined || 0)
  const streak = Number(wallet?.mining_streak || 0)
  const breakdown = wallet?.platform_breakdown || {}

  return (
    <div className="bg-card rounded-2xl border border-border/50 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent to-accent/60 flex items-center justify-center">
            <Coins className="w-5 h-5 text-accent-foreground" />
          </div>

          <div>
            <p className="text-xs text-muted-foreground font-medium">
              FanDirect Token
            </p>
            <p className="text-xs text-muted-foreground">FDT Wallet</p>
          </div>
        </div>

        {streak > 0 && (
          <Badge className="bg-secondary/10 text-secondary border-secondary/20 text-xs gap-1">
            <Flame className="w-3 h-3" />
            {streak}d streak
          </Badge>
        )}
      </div>

      <div className="mb-4">
        <p className="font-heading text-3xl font-bold text-foreground">
          {balance.toLocaleString()}{' '}
          <span className="text-lg text-accent font-semibold">FDT</span>
        </p>

        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
          <TrendingUp className="w-3 h-3 text-chart-4" />
          {totalMined.toLocaleString()} total mined
        </p>
      </div>

      {Object.keys(breakdown).length > 0 && (
        <div className="flex gap-2 mb-4 flex-wrap">
          {Object.entries(breakdown)
            .filter(([, value]) => Number(value || 0) > 0)
            .map(([platform, amount]) => (
              <div
                key={platform}
                className="flex items-center gap-1 bg-muted/50 rounded-lg px-2 py-1"
              >
                <span className="text-sm">{PLATFORM_ICONS[platform] || '🌐'}</span>

                <span className="text-xs text-muted-foreground capitalize">
                  {platform}
                </span>

                <span className="text-xs font-semibold text-foreground ml-1">
                  {Number(amount || 0).toLocaleString()}
                </span>
              </div>
            ))}
        </div>
      )}

      <Link
        to="/mine"
        className="flex items-center justify-between bg-accent/10 hover:bg-accent/20 border border-accent/20 rounded-xl px-4 py-2.5 transition-colors group"
      >
        <span className="text-sm font-semibold text-accent">
          Mine More FDT
        </span>

        <ArrowUpRight className="w-4 h-4 text-accent group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
      </Link>
    </div>
  )
}