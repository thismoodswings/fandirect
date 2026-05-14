import React, { useCallback, useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Coins, Clock } from 'lucide-react'
import { format } from 'date-fns'
import { PLATFORM_ICONS, FDT_REWARDS } from '@/lib/tokenUtils'
import { EngagementSubmission } from '@/entities'

const statusColors = {
  approved: 'bg-chart-4/20 text-chart-4',
  pending: 'bg-accent/20 text-accent-foreground',
  rejected: 'bg-destructive/20 text-destructive',
}

function getCreatedDate(submission) {
  return submission?.created_date || submission?.created_at || ''
}

function sortNewestFirst(rows = []) {
  return [...rows].sort((a, b) => {
    const aTime = new Date(getCreatedDate(a)).getTime() || 0
    const bTime = new Date(getCreatedDate(b)).getTime() || 0

    return bTime - aTime
  })
}

function formatSubmissionDate(value) {
  if (!value) return ''

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  return format(date, 'MMM d, yyyy')
}

export default function EngagementHistory({ userEmail }) {
  const [submissions, setSubmissions] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const loadSubmissions = useCallback(async () => {
    if (!userEmail) {
      setSubmissions([])
      setIsLoading(false)
      return
    }

    setError('')

    try {
      const rows = await EngagementSubmission.list({
        user_email: userEmail,
      })

      setSubmissions(sortNewestFirst(rows || []).slice(0, 20))
    } catch (loadError) {
      console.warn(loadError)
      setError(loadError.message || 'Could not load engagement history.')
      setSubmissions([])
    } finally {
      setIsLoading(false)
    }
  }, [userEmail])

  useEffect(() => {
    loadSubmissions()
  }, [loadSubmissions])

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="h-14 animate-pulse rounded-xl border border-border/50 bg-card"
          />
        ))}
      </div>
    )
  }

  if (submissions.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        <Clock className="mx-auto mb-2 h-8 w-8 opacity-40" />
        {error || 'No submissions yet — start mining!'}
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

      {submissions.map((submission) => {
        const reward = FDT_REWARDS[submission.engagement_type]
        const createdDate = formatSubmissionDate(getCreatedDate(submission))
        const status = submission.status || 'pending'

        return (
          <div
            key={submission.id}
            className="flex items-center gap-3 rounded-xl border border-border/50 bg-card px-4 py-3"
          >
            <span className="text-xl">
              {PLATFORM_ICONS[submission.platform] || '🌐'}
            </span>

            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium capitalize text-foreground">
                {reward?.label || submission.engagement_type || 'Engagement'}

                {submission.creator_name && (
                  <span className="font-normal text-muted-foreground">
                    {' '}
                    · {submission.creator_name}
                  </span>
                )}
              </p>

              <p className="text-xs capitalize text-muted-foreground">
                {submission.platform || 'platform'}
                {createdDate && ` · ${createdDate}`}
              </p>
            </div>

            <div className="shrink-0 text-right">
              <div className="flex items-center justify-end gap-1">
                <Coins className="h-3 w-3 text-accent" />

                <span className="text-sm font-bold text-accent">
                  +{Number(submission.fdt_awarded || 0).toLocaleString()}
                </span>
              </div>

              <Badge
                className={`${
                  statusColors[status] || 'bg-muted text-muted-foreground'
                } border-0 text-xs capitalize`}
              >
                {status}
              </Badge>
            </div>
          </div>
        )
      })}
    </div>
  )
}