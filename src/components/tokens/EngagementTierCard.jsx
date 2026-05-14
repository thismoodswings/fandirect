import React from 'react'
import { Badge } from '@/components/ui/badge'
import { Coins } from 'lucide-react'
import { FDT_REWARDS, TIER_BG, TIER_COLORS } from '@/lib/tokenUtils'

const TIERS = [
  {
    tier: 'high',
    label: 'High Value',
    description: 'Shares, reposts & stitches spread creator content furthest.',
    types: ['share', 'repost', 'stitch'],
  },
  {
    tier: 'medium',
    label: 'Medium Value',
    description: 'Comments, saves & sign-ups drive deep engagement.',
    types: ['comment', 'save', 'email_signup'],
  },
  {
    tier: 'low',
    label: 'Low Value',
    description: 'Likes and views still count — every bit helps!',
    types: ['like', 'view'],
  },
]

export default function EngagementTierCard() {
  return (
    <div className="space-y-3">
      {TIERS.map((tier) => (
        <div
          key={tier.tier}
          className={`rounded-xl border p-4 ${TIER_BG[tier.tier] || ''}`}
        >
          <div className="mb-1.5 flex items-center gap-2">
            <span
              className={`text-xs font-bold uppercase tracking-wider ${
                TIER_COLORS[tier.tier] || 'text-muted-foreground'
              }`}
            >
              {tier.label}
            </span>
          </div>

          <p className="mb-3 text-xs text-muted-foreground">
            {tier.description}
          </p>

          <div className="flex flex-wrap gap-2">
            {tier.types.map((type) => {
              const reward = FDT_REWARDS[type]

              if (!reward) return null

              return (
                <div
                  key={type}
                  className="flex items-center gap-1.5 rounded-lg bg-background/60 px-3 py-1.5"
                >
                  <span className="text-xs font-medium text-foreground">
                    {reward.label}
                  </span>

                  <Badge className="border-0 bg-accent/20 px-1.5 py-0 text-xs text-accent">
                    <Coins className="mr-0.5 h-2.5 w-2.5" />
                    +{reward.fdt}
                  </Badge>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}