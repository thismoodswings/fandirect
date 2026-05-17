import React, { useEffect, useMemo, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search } from 'lucide-react'
import CreatorCard from '@/components/shared/CreatorCard'
import { Creator } from '@/entities'
import { fallbackCreators } from '@/lib/fallbackData'

import {
 
  Sparkles,
} from "lucide-react";

const categories = [
  'all',
  'music',
  'comedy',
  'fashion',
  'beauty',
  'tech',
  'gaming',
  'sports',
  'lifestyle',
  'artist',
  'influencer',
  'other',
]

export default function Creators() {
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')
  const [creators, setCreators] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [message, setMessage] = useState('')

  useEffect(() => {
    let ignore = false

    async function loadCreators() {
      setIsLoading(true)
      setMessage('')

      try {
        const rows = await Creator.list({ status: 'active' })

        const sorted = [...(rows || [])].sort(
          (a, b) => Number(b.fan_count || 0) - Number(a.fan_count || 0)
        )

        if (!ignore) {
          setCreators(sorted)
          setMessage(sorted.length ? 'Content synced.' : 'No creators are live yet.')
        }
      } catch (error) {
        console.warn(error)

        if (!ignore) {
          setCreators(fallbackCreators)
          setMessage('Showing featured creators while live profiles load.')
        }
      } finally {
        if (!ignore) {
          setIsLoading(false)
        }
      }
    }

    loadCreators()

    return () => {
      ignore = true
    }
  }, [])

  const filteredCreators = useMemo(() => {
    const query = search.trim().toLowerCase()

    return creators.filter((creator) => {
      const name = String(creator.name || creator.display_name || '').toLowerCase()
      const category = String(creator.category || '').toLowerCase()
      const bio = String(creator.bio || '').toLowerCase()

      const matchesSearch =
        !query ||
        name.includes(query) ||
        category.includes(query) ||
        bio.includes(query)

      const matchesCategory =
        activeCategory === 'all' || category === activeCategory

      return matchesSearch && matchesCategory
    })
  }, [creators, search, activeCategory])

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            FanDirect creators
          </p>

          <h1 className="font-heading text-3xl font-bold text-foreground">
            Creators
          </h1>

          <p className="mt-1 text-muted-foreground">
            Discover artists, influencers, entertainers, and fan communities.
          </p>
        </div>

        {message && (
          <p className="rounded-full bg-muted px-3 py-1.5 text-xs text-muted-foreground">
            {message}
          </p>
        )}
      </div>

      <div className="mb-8 flex flex-col gap-4 sm:flex-row">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

          <input
            type="search"
            placeholder="Search creators..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full rounded-xl border border-border bg-card py-3 pl-10 pr-4 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {categories.map((category) => {
            const isActive = activeCategory === category

            return (
              <button
                key={category}
                type="button"
                onClick={() => setActiveCategory(category)}
                className={`rounded-xl px-4 py-2 text-xs font-semibold capitalize transition ${
                  isActive
                    ? 'bg-primary text-white'
                    : 'border border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                {category}
              </button>
            )
          })}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="h-64 animate-pulse rounded-2xl border border-border bg-card"
            />
          ))}
        </div>
      ) : filteredCreators.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          {filteredCreators.map((creator) => (
            <CreatorCard key={creator.id} creator={creator} />
          ))}
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-border py-20 text-center">
          <p className="text-lg font-semibold text-foreground">
            No creators found
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Try another search term or category.
          </p>
        </div>
      )}
    </div>
  )
}