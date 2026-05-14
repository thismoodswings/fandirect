import React, { useEffect, useMemo, useState } from "react";
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Calendar,
  MapPin,
  Ticket,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { format } from 'date-fns'
import { motion } from 'framer-motion'
import { Product } from '@/entities'
import { fallbackProducts } from '@/lib/fallbackData'

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
})

function formatCurrency(value) {
  return `₦${Number(value || 0).toLocaleString()}`
}

function formatDate(value) {
  if (!value) return ''

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  return dateFormatter.format(date)
}

function getEventDate(event) {
  return event.event_date || event.date || event.starts_at || event.created_at || ''
}

function sortEventsNewestFirst(rows = []) {
  return [...rows].sort((a, b) => {
    const aTime = new Date(getEventDate(a)).getTime() || 0
    const bTime = new Date(getEventDate(b)).getTime() || 0

    return bTime - aTime
  })
}

function getFallbackEvents() {
  return fallbackProducts
    .filter((product) => product.type === 'event')
    .slice(0, 30)
}

export default function Events() {
  const [events, setEvents] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function loadEvents() {
    setError('')
    setMessage('')

    try {
      const rows = await Product.list({ type: 'event', status: 'active' })
      const sortedEvents = sortEventsNewestFirst(rows || []).slice(0, 30)

      setEvents(sortedEvents)

      if (sortedEvents.length > 0) {
        setMessage('Loaded from Supabase.')
      } else {
        setMessage('No active events in Supabase yet.')
      }
    } catch (loadError) {
      console.warn(loadError)

      const demoEvents = getFallbackEvents()

      setEvents(demoEvents)
      setMessage('Showing demo events because Supabase events could not be loaded.')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    loadEvents()
  }, [])

  async function handleRefresh() {
    setIsRefreshing(true)
    await loadEvents()
  }

  const visibleEvents = useMemo(() => events || [], [events])

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 inline-flex items-center gap-2 rounded-full bg-secondary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-secondary">
            <Ticket className="h-3.5 w-3.5" />
            FanDirect experiences
          </p>

          <h1 className="font-heading text-3xl font-bold text-foreground">
            Events
          </h1>

          <p className="mt-1 text-muted-foreground">
            Live shows, meet & greets, listening parties, and VIP experiences.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {message && (
            <p className="rounded-full bg-muted px-3 py-1.5 text-xs text-muted-foreground">
              {message}
            </p>
          )}

          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isRefreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="grid gap-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-40 animate-pulse rounded-2xl border border-border bg-card"
            />
          ))}
        </div>
      ) : visibleEvents.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border py-20 text-center">
          <Ticket className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />

          <p className="text-lg font-semibold text-foreground">
            No events available right now
          </p>

          <p className="mt-1 text-sm text-muted-foreground">
            Check back soon for upcoming creator events.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {visibleEvents.map((event) => (
            <EventRow key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  )
}

function EventRow({ event }) {
  const eventDate = formatDate(getEventDate(event))
  const eventLocation =
    event.event_location || event.location || event.venue || ''
  const price = formatCurrency(event.price)

  return (
    <Link to={`/product/${event.id}`} className="block">
      <article className="group overflow-hidden rounded-3xl border border-border bg-card transition hover:border-primary/40 hover:shadow-sm sm:flex">
        <div className="h-44 overflow-hidden bg-muted sm:h-auto sm:w-52 sm:shrink-0">
          <img
            src={
              event.image_url ||
              event.cover_url ||
              'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=500'
            }
            alt={event.title || 'FanDirect event'}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        </div>

        <div className="flex flex-1 flex-col justify-between p-5">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-secondary/20 px-2.5 py-1 text-xs font-semibold text-secondary">
                Event
              </span>

              {event.is_limited && (
                <span className="rounded-full bg-destructive px-2.5 py-1 text-xs font-semibold text-white">
                  Limited
                </span>
              )}

              {event.status && (
                <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold capitalize text-muted-foreground">
                  {event.status}
                </span>
              )}
            </div>

            <p className="text-xs font-medium text-muted-foreground">
              {event.creator_name || 'FanDirect Creator'}
            </p>

            <h3 className="mt-1 font-heading text-xl font-bold text-foreground">
              {event.title || event.name || 'Untitled event'}
            </h3>

            {event.description && (
              <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                {event.description}
              </p>
            )}

            <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted-foreground">
              {eventDate && (
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-4 w-4 text-primary" />
                  {eventDate}
                </span>
              )}

              {eventLocation && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-4 w-4 text-secondary" />
                  {eventLocation}
                </span>
              )}
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between gap-4">
            <span className="font-heading text-2xl font-bold text-foreground">
              {price}
            </span>

            <span className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition group-hover:opacity-90">
              <Ticket className="h-4 w-4" />
              Get Tickets
            </span>
          </div>
        </div>
      </article>
    </Link>
  )
}