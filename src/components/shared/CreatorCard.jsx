import React from 'react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, Users } from 'lucide-react'

const categoryColors = {
  artist:     'bg-primary/20 text-primary',
  influencer: 'bg-secondary/20 text-secondary',
  actor:      'bg-chart-4/20 text-chart-4',
  musician:   'bg-chart-5/20 text-chart-5',
  comedian:   'bg-accent/20 text-accent-foreground',
  athlete:    'bg-chart-2/20 text-chart-2',
  other:      'bg-muted text-muted-foreground',
}

export default function CreatorCard({ creator }) {
  const category = creator.category || 'other'
  const profileSlug = creator.username || creator.id

  return (
    <div className="transition-transform duration-200 hover:-translate-y-1">
      <Link to={`/creator/${profileSlug}`} className="block group">
        <div className="bg-card rounded-xl border border-border/50 overflow-hidden hover:border-primary/30 transition-all duration-300">
          <div className="relative h-28 overflow-hidden">
            <img
              src={
                creator.cover_url ||
                'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600'
              }
              alt=""
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-card via-card/30 to-transparent" />
          </div>

          <div className="px-4 pb-4 -mt-10 relative">
            <div className="relative w-16 h-16 mb-3">
              <img
                src={
                  creator.avatar_url ||
                  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200'
                }
                alt={creator.name || 'Creator'}
                className="w-16 h-16 rounded-full object-cover border-3 border-card"
              />
              {creator.verified && (
                <CheckCircle className="w-5 h-5 text-primary absolute -bottom-0.5 -right-0.5 bg-card rounded-full" />
              )}
            </div>

            <h3 className="font-heading font-semibold text-foreground mb-1 flex items-center gap-1.5">
              {creator.name || 'FanDirect Creator'}
            </h3>

            <div className="flex items-center gap-2 mb-2">
              <Badge
                className={`${categoryColors[category] || categoryColors.other} border-0 text-xs capitalize`}
              >
                {category}
              </Badge>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Users className="w-3 h-3" />
                {(creator.fan_count || 0).toLocaleString()} fans
              </span>
            </div>

            <p className="text-xs text-muted-foreground line-clamp-2">
              {creator.bio || 'Exclusive creator updates, drops, and fan rewards.'}
            </p>
          </div>
        </div>
      </Link>
    </div>
  )
}
