import React, { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { CheckCircle, Crown, Zap, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { addMonths } from 'date-fns'
import { CreatorSubscription } from '@/entities'

const TIERS = [
  {
    id: 'free',
    label: 'Free Fan',
    price: 0,
    color: 'bg-muted text-muted-foreground',
    benefits: ['Access to free content', 'Community feed', 'Basic FDT mining'],
  },
  {
    id: 'supporter',
    label: 'Supporter',
    price: 1500,
    color: 'bg-primary/20 text-primary',
    icon: Zap,
    benefits: [
      'All Free benefits',
      'Supporter-tier media drops',
      '+20% FDT bonus',
      'Early access to drops',
    ],
  },
  {
    id: 'superfan',
    label: 'Superfan',
    price: 5000,
    color: 'bg-secondary/20 text-secondary',
    icon: Crown,
    benefits: [
      'All Supporter benefits',
      'Exclusive superfan content',
      '+50% FDT bonus',
      'Direct creator messages',
    ],
  },
]

export default function SubscriptionModule({ creator, userEmail }) {
  const [currentSub, setCurrentSub] = useState(null)
  const [isLoadingSub, setIsLoadingSub] = useState(true)
  const [loading, setLoading] = useState(null)
  const [error, setError] = useState('')

  const loadSubscription = useCallback(async () => {
    if (!creator?.id || !userEmail) {
      setCurrentSub(null)
      setIsLoadingSub(false)
      return
    }

    setError('')

    try {
      let subscription = null

      if (typeof CreatorSubscription.getByFanAndCreator === 'function') {
        subscription = await CreatorSubscription.getByFanAndCreator(
          userEmail,
          creator.id
        )
      } else {
        const rows = await CreatorSubscription.list({
          creator_id: creator.id,
          fan_email: userEmail,
          status: 'active',
        })

        subscription = rows?.[0] || null
      }

      setCurrentSub(subscription)
    } catch (loadError) {
      console.warn(loadError)
      setError(loadError.message || 'Could not load your subscription.')
      setCurrentSub(null)
    } finally {
      setIsLoadingSub(false)
    }
  }, [creator?.id, userEmail])

  useEffect(() => {
    loadSubscription()
  }, [loadSubscription])

  async function handleSubscribe(tier) {
    if (!creator?.id || !userEmail) {
      toast.error('Please log in to subscribe.')
      return
    }

    setLoading(tier.id)
    setError('')

    const payload = {
      fan_email: userEmail,
      creator_id: creator.id,
      creator_name: creator.name,
      tier: tier.id,
      price_naira: tier.price,
      benefits: tier.benefits,
      status: 'active',
      expires_at: addMonths(new Date(), 1).toISOString(),
    }

    try {
      if (currentSub?.id) {
        await CreatorSubscription.update(currentSub.id, payload)
      } else {
        await CreatorSubscription.create(payload)
      }

      toast.success(`Subscribed as ${tier.label}!`)
      await loadSubscription()
    } catch (subscribeError) {
      console.warn(subscribeError)
      setError(subscribeError.message || 'Could not update subscription.')
      toast.error(subscribeError.message || 'Could not update subscription.')
    } finally {
      setLoading(null)
    }
  }

  if (isLoadingSub) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl space-y-4">
      <p className="text-sm text-muted-foreground">
        Choose a subscription tier to unlock exclusive content from{' '}
        <span className="font-medium text-foreground">{creator.name}</span>.
      </p>

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {currentSub && (
        <div className="flex items-center gap-2 rounded-xl border border-chart-4/20 bg-chart-4/10 px-4 py-2.5">
          <CheckCircle className="h-4 w-4 text-chart-4" />
          <span className="text-sm font-medium capitalize text-chart-4">
            You're subscribed as a <strong>{currentSub.tier}</strong>
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {TIERS.map((tier) => {
          const isActive = currentSub?.tier === tier.id
          const Icon = tier.icon

          return (
            <Card
              key={tier.id}
              className={`flex flex-col border-border/50 bg-card p-5 ${
                isActive ? 'border-primary/50 ring-1 ring-primary/30' : ''
              }`}
            >
              <div className="mb-3 flex items-center gap-2">
                {Icon && <Icon className="h-4 w-4 text-primary" />}
                <Badge className={`${tier.color} border-0 text-xs`}>
                  {tier.label}
                </Badge>
              </div>

              <p className="mb-1 font-heading text-2xl font-bold text-foreground">
                {tier.price === 0 ? 'Free' : `₦${tier.price.toLocaleString()}`}
                {tier.price > 0 && (
                  <span className="text-xs font-normal text-muted-foreground">
                    /mo
                  </span>
                )}
              </p>

              <ul className="my-4 flex-1 space-y-1.5">
                {tier.benefits.map((benefit) => (
                  <li
                    key={benefit}
                    className="flex items-start gap-2 text-xs text-muted-foreground"
                  >
                    <CheckCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-chart-4" />
                    {benefit}
                  </li>
                ))}
              </ul>

              <Button
                size="sm"
                disabled={isActive || loading === tier.id}
                onClick={() => handleSubscribe(tier)}
                className={
                  isActive
                    ? 'border-0 bg-chart-4/20 text-chart-4'
                    : 'bg-primary hover:bg-primary/90'
                }
              >
                {loading === tier.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : isActive ? (
                  'Current Plan'
                ) : (
                  'Subscribe'
                )}
              </Button>
            </Card>
          )
        })}
      </div>
    </div>
  )
}