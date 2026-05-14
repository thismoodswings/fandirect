import React, { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { differenceInHours, parseISO, isValid } from 'date-fns'

export default function StreakNotifier({ wallet }) {
  const notified = useRef(false)

  useEffect(() => {
    if (!wallet || notified.current) return

    const lastDate = wallet.last_submission_date
    if (!lastDate) return

    const parsedLastDate = parseISO(lastDate)

    if (!isValid(parsedLastDate)) return

    const hoursSinceLast = differenceInHours(new Date(), parsedLastDate)
    const streak = Number(wallet.mining_streak || 0)

    if (hoursSinceLast >= 18 && hoursSinceLast < 24) {
      toast.warning(
        `⚡ Your ${streak}-day streak is at risk! Mine FDT before midnight to keep it.`,
        {
          duration: 6000,
        }
      )

      notified.current = true
      return
    }

    const milestones = [3, 7, 14, 21, 30]

    if (milestones.includes(streak) && hoursSinceLast < 2) {
      toast.success(`🔥 ${streak}-day streak! You're on fire. Keep mining!`, {
        duration: 5000,
      })

      notified.current = true
    }
  }, [wallet])

  return null
}