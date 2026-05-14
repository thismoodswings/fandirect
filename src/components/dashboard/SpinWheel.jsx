import React, { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, Gift, Sparkles, Trophy } from 'lucide-react'
import { toast } from 'sonner'

const prizes = [
  { label: '50 Points', value: 50, type: 'points', color: '#a855f7' },
  { label: 'NGN 200', value: 200, type: 'cashback', color: '#ec4899' },
  { label: '100 Points', value: 100, type: 'points', color: '#f59e0b' },
  { label: 'Try Again', value: 0, type: 'none', color: '#334155' },
  { label: '25 Points', value: 25, type: 'points', color: '#14b8a6' },
  { label: 'NGN 500', value: 500, type: 'cashback', color: '#f97316' },
  { label: '200 Points', value: 200, type: 'points', color: '#8b5cf6' },
  { label: 'NGN 100', value: 100, type: 'cashback', color: '#06b6d4' },
]

export default function SpinWheel({ spinsRemaining = 0, onSpin }) {
  const [spinning, setSpinning] = useState(false)
  const [rotation, setRotation] = useState(0)
  const [result, setResult] = useState(null)
  const [history, setHistory] = useState([])

  const wheelGradient = useMemo(() => {
    const slice = 100 / prizes.length
    return `conic-gradient(${prizes
      .map((prize, index) => {
        const start = index * slice
        const end = (index + 1) * slice
        return `${prize.color} ${start}% ${end}%`
      })
      .join(', ')})`
  }, [])

  const handleSpin = async () => {
    if (spinsRemaining <= 0 || spinning) return

    setSpinning(true)
    setResult(null)

    const prizeIndex = Math.floor(Math.random() * prizes.length)
    const degreesPerSlice = 360 / prizes.length
    const targetDegree =
      360 - (prizeIndex * degreesPerSlice + degreesPerSlice / 2)
    const newRotation = rotation + 6 * 360 + targetDegree

    setRotation(newRotation)

    window.setTimeout(async () => {
      const prize = prizes[prizeIndex]
      setResult(prize)
      setHistory((current) => [prize, ...current].slice(0, 3))
      setSpinning(false)

      if (prize.type !== 'none') {
        toast.success(`You won ${prize.label}`)
      } else {
        toast.info('So close. Try again next time.')
      }

      if (typeof onSpin === 'function') {
        await onSpin(prize)
      }
    }, 3600)
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-border/50 bg-card">
      <div className="border-b border-border/50 bg-gradient-to-r from-primary/15 via-secondary/10 to-accent/10 p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="font-heading text-xl font-bold text-foreground">
              Spin Rewards
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Land rewards, cashback, and extra FanPoints.
            </p>
          </div>
          <Badge className="border-0 bg-accent/15 text-accent">
            {spinsRemaining} spin{spinsRemaining === 1 ? '' : 's'}
          </Badge>
        </div>
      </div>

      <div className="p-6 text-center">
        <div className="relative mx-auto mb-6 h-64 w-64">
          <div className="absolute left-1/2 top-0 z-20 h-0 w-0 -translate-x-1/2 -translate-y-1 border-l-[13px] border-r-[13px] border-t-[22px] border-l-transparent border-r-transparent border-t-primary" />
          <div
            className="relative h-full w-full overflow-hidden rounded-full border-8 border-background shadow-[0_0_0_1px_hsl(var(--border)),0_18px_60px_rgba(168,85,247,0.25)] transition-transform ease-out"
            style={{
              background: wheelGradient,
              transform: `rotate(${rotation}deg)`,
              transitionDuration: spinning ? '3600ms' : '500ms',
            }}
          >
            <div className="absolute inset-7 rounded-full border border-white/20 bg-background/35 backdrop-blur-[1px]" />
            {prizes.map((prize, index) => {
              const angle = index * (360 / prizes.length) + 360 / prizes.length / 2
              return (
                <span
                  key={prize.label}
                  className="absolute left-1/2 top-1/2 w-20 origin-left text-[10px] font-black uppercase text-white drop-shadow"
                  style={{
                    transform: `rotate(${angle}deg) translateX(52px) rotate(90deg)`,
                  }}
                >
                  {prize.label}
                </span>
              )
            })}
            <div className="absolute left-1/2 top-1/2 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card shadow-xl">
              {spinning ? (
                <Sparkles className="h-8 w-8 animate-pulse text-accent" />
              ) : (
                <Gift className="h-8 w-8 text-accent" />
              )}
            </div>
          </div>
        </div>

        {result && (
          <div className="mb-4 rounded-2xl border border-primary/20 bg-primary/10 p-3">
            <p className="text-sm font-semibold text-foreground">
              {result.type !== 'none' ? `Reward unlocked: ${result.label}` : 'No reward this time'}
            </p>
          </div>
        )}

        <Button
          onClick={handleSpin}
          disabled={spinsRemaining <= 0 || spinning}
          className="h-11 rounded-xl bg-gradient-to-r from-primary to-secondary px-8 font-semibold text-white hover:opacity-90"
        >
          {spinning ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Trophy className="mr-2 h-4 w-4" />
          )}
          {spinning ? 'Wheel spinning...' : 'Spin Now'}
        </Button>

        {history.length > 0 && (
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {history.map((item, index) => (
              <span
                key={`${item.label}-${index}`}
                className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground"
              >
                {item.label}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
