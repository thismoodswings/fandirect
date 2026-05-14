import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Coins,
  Gift,
  Percent,
  Ticket,
  Loader2,
  CheckCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { FanPoints, FanToken } from '@/entities'

const REDEMPTION_OPTIONS = [
  {
    id: 'discount_500',
    label: '₦500 Discount',
    description: 'Get ₦500 off your next order',
    cost: 200,
    icon: Percent,
    color: 'from-primary/20 to-primary/5',
    borderColor: 'border-primary/30',
  },
  {
    id: 'discount_2000',
    label: '₦2,000 Discount',
    description: 'Get ₦2,000 off your next order',
    cost: 700,
    icon: Percent,
    color: 'from-secondary/20 to-secondary/5',
    borderColor: 'border-secondary/30',
  },
  {
    id: 'free_spin',
    label: 'Extra Spin',
    description: 'Add 1 spin to your reward wheel',
    cost: 100,
    icon: Gift,
    color: 'from-chart-4/20 to-chart-4/5',
    borderColor: 'border-chart-4/30',
  },
  {
    id: 'exclusive_access',
    label: 'VIP Access Pass',
    description: 'Unlock exclusive creator content for 7 days',
    cost: 500,
    icon: Ticket,
    color: 'from-accent/20 to-accent/5',
    borderColor: 'border-accent/30',
  },
]

export default function RedemptionPanel({ wallet, userEmail, onRedeemed }) {
  const [redeeming, setRedeeming] = useState(null)
  const [lastRedeemed, setLastRedeemed] = useState(null)
  const [localWallet, setLocalWallet] = useState(wallet || null)

  const activeWallet = localWallet || wallet || null
  const balance = Number(activeWallet?.balance || 0)

  async function addFreeSpin() {
    if (!userEmail) return

    const pointsRows = await FanPoints.list({
      user_email: userEmail,
    })

    if (pointsRows.length > 0) {
      const fanPoints = pointsRows[0]

      await FanPoints.update(fanPoints.id, {
        spins_remaining: Number(fanPoints.spins_remaining || 0) + 1,
      })
    } else {
      await FanPoints.create({
        user_email: userEmail,
        total_points: 0,
        total_cashback: 0,
        level: 'bronze',
        spins_remaining: 1,
        total_spent: 0,
        orders_count: 0,
      })
    }
  }

  async function handleRedeem(option) {
    if (!activeWallet?.id) {
      toast.error('FDT wallet not found.')
      return
    }

    if (balance < option.cost) {
      toast.error('Insufficient FDT balance')
      return
    }

    setRedeeming(option.id)

    try {
      const nextBalance = balance - Number(option.cost || 0)
      const nextTotalSpent =
        Number(activeWallet.total_spent || 0) + Number(option.cost || 0)

      const updatedWallet = await FanToken.update(activeWallet.id, {
        balance: nextBalance,
        total_spent: nextTotalSpent,
      })

      if (option.id === 'free_spin') {
        await addFreeSpin()
      }

      setLocalWallet({
        ...activeWallet,
        ...(updatedWallet || {}),
        balance: nextBalance,
        total_spent: nextTotalSpent,
      })

      setLastRedeemed(option.id)
      onRedeemed?.()
      toast.success(`${option.label} redeemed!`)

      window.setTimeout(() => setLastRedeemed(null), 3000)
    } catch (error) {
      console.warn(error)
      toast.error(error.message || 'Redemption failed')
    } finally {
      setRedeeming(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-xl border border-accent/20 bg-accent/10 px-4 py-3">
        <span className="text-sm text-muted-foreground">Your FDT Balance</span>

        <div className="flex items-center gap-1.5">
          <Coins className="h-4 w-4 text-accent" />

          <span className="font-heading text-lg font-bold text-accent">
            {balance.toLocaleString()} FDT
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {REDEMPTION_OPTIONS.map((option) => {
          const Icon = option.icon
          const canAfford = balance >= option.cost
          const isRedeeming = redeeming === option.id
          const isSuccess = lastRedeemed === option.id

          return (
            <div
              key={option.id}
              className={`flex flex-col gap-3 rounded-xl border bg-gradient-to-br p-4 transition-all ${
                option.color
              } ${option.borderColor} ${!canAfford ? 'opacity-50' : ''}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-background/60">
                  <Icon className="h-5 w-5 text-foreground" />
                </div>

                <Badge className="border-0 bg-background/60 text-xs font-bold text-foreground">
                  <Coins className="mr-1 h-3 w-3 text-accent" />
                  {option.cost} FDT
                </Badge>
              </div>

              <div>
                <p className="text-sm font-semibold text-foreground">
                  {option.label}
                </p>

                <p className="mt-0.5 text-xs text-muted-foreground">
                  {option.description}
                </p>
              </div>

              <Button
                size="sm"
                onClick={() => handleRedeem(option)}
                disabled={!canAfford || Boolean(redeeming)}
                className="h-8 w-full rounded-lg border border-border/50 bg-background/80 text-xs text-foreground hover:bg-background"
                variant="outline"
              >
                {isRedeeming ? (
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                ) : isSuccess ? (
                  <CheckCircle className="mr-1 h-3 w-3 text-chart-4" />
                ) : null}

                {isSuccess ? 'Redeemed!' : canAfford ? 'Redeem' : 'Need more FDT'}
              </Button>
            </div>
          )
        })}
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Discount codes are applied automatically at checkout.
      </p>
    </div>
  )
}