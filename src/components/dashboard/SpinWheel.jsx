import React, { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, Gift, Sparkles, Trophy, ShieldCheck, Clock, Zap } from 'lucide-react'
import { toast } from 'sonner'

const prizes = [
  { label: '+20 FDT', value: 20, type: 'fdt', color: '#7c3aed', weight: 22 },
  { label: '50 Points', value: 50, type: 'points', color: '#a855f7', weight: 20 },
  { label: '₦200 Cashback', value: 200, type: 'cashback', color: '#ec4899', weight: 14 },
  { label: '+1 Bonus Spin', value: 1, type: 'spin', color: '#06b6d4', weight: 10 },
  { label: '+75 FDT', value: 75, type: 'fdt', color: '#f59e0b', weight: 8 },
  { label: 'Try Again', value: 0, type: 'none', color: '#334155', weight: 14 },
  { label: '150 Points', value: 150, type: 'points', color: '#14b8a6', weight: 8 },
  { label: '₦500 Cashback', value: 500, type: 'cashback', color: '#f97316', weight: 4 },
]

function selectWeightedPrize() {
  const totalWeight = prizes.reduce((sum, prize) => sum + Number(prize.weight || 1), 0)
  let cursor = Math.random() * totalWeight

  for (let index = 0; index < prizes.length; index += 1) {
    cursor -= Number(prizes[index].weight || 1)
    if (cursor <= 0) return { prize: prizes[index], index }
  }

  return { prize: prizes[0], index: 0 }
}

function getPrizeDescription(prize) {
  if (!prize) return 'Spin to reveal a reward.'
  if (prize.type === 'fdt') return 'FDT token reward added to your mining wallet.'
  if (prize.type === 'points') return 'FanPoints reward added to your loyalty profile.'
  if (prize.type === 'cashback') return 'Cashback credit added to your FanPoints balance.'
  if (prize.type === 'spin') return 'Extra spin added for another chance.'
  return 'No reward this time. Keep mining and try again.'
}

export default function SpinWheel({ spinsRemaining = 0, onSpin }) {
  const [spinning, setSpinning] = useState(false)
  const [rotation, setRotation] = useState(0)
  const [result, setResult] = useState(null)
  const [history, setHistory] = useState([])
  const [ticketCode, setTicketCode] = useState('')

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
    setTicketCode('')

    const { prize, index: prizeIndex } = selectWeightedPrize()
    const degreesPerSlice = 360 / prizes.length
    const targetDegree = 360 - (prizeIndex * degreesPerSlice + degreesPerSlice / 2)
    const newRotation = rotation + 7 * 360 + targetDegree
    const nextTicketCode = `FDT-${Date.now().toString(36).toUpperCase().slice(-6)}-${String(prizeIndex + 1).padStart(2, '0')}`

    setRotation(newRotation)

    window.setTimeout(async () => {
      setResult(prize)
      setTicketCode(nextTicketCode)
      setHistory((current) => [{ ...prize, code: nextTicketCode }, ...current].slice(0, 5))
      setSpinning(false)

      if (prize.type !== 'none') {
        toast.success(`You won ${prize.label}`)
      } else {
        toast.info('So close. Try again next time.')
      }

      if (typeof onSpin === 'function') {
        await onSpin({ ...prize, code: nextTicketCode })
      }
    }, 4200)
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-border/50 bg-card shadow-[0_18px_80px_rgba(168,85,247,0.12)]">
      <div className="border-b border-border/50 bg-gradient-to-br from-primary/20 via-secondary/10 to-accent/10 p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="font-heading text-xl font-bold text-foreground">Lucky FDT Wheel</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Daily spins, auditable prize tickets, and mining rewards.
            </p>
          </div>
          <Badge className="border-0 bg-accent/15 text-accent">
            {spinsRemaining} spin{spinsRemaining === 1 ? '' : 's'} left
          </Badge>
        </div>
      </div>

      <div className="p-6 text-center">
        <div className="mb-5 grid grid-cols-3 gap-2 text-xs">
          <MiniStat icon={ShieldCheck} label="Fair draw" value="Weighted" />
          <MiniStat icon={Clock} label="Reset" value="Daily" />
          <MiniStat icon={Zap} label="Rewards" value="FDT + Points" />
        </div>

        <div className="relative mx-auto mb-6 h-72 w-72 max-w-full">
          <div className="absolute left-1/2 top-0 z-20 h-0 w-0 -translate-x-1/2 -translate-y-1 border-l-[15px] border-r-[15px] border-t-[26px] border-l-transparent border-r-transparent border-t-primary drop-shadow-lg" />
          <div className="absolute inset-0 rounded-full bg-primary/20 blur-2xl" />
          <div
            className="relative h-full w-full overflow-hidden rounded-full border-[10px] border-background shadow-[0_0_0_1px_hsl(var(--border)),0_22px_80px_rgba(168,85,247,0.35)] transition-transform ease-out"
            style={{
              background: wheelGradient,
              transform: `rotate(${rotation}deg)`,
              transitionDuration: spinning ? '4200ms' : '500ms',
            }}
          >
            <div className="absolute inset-8 rounded-full border border-white/20 bg-background/30 backdrop-blur-[1px]" />
            {prizes.map((prize, index) => {
              const angle = index * (360 / prizes.length) + 360 / prizes.length / 2
              return (
                <span
                  key={prize.label}
                  className="absolute left-1/2 top-1/2 w-24 origin-left text-[10px] font-black uppercase leading-3 text-white drop-shadow"
                  style={{ transform: `rotate(${angle}deg) translateX(58px) rotate(90deg)` }}
                >
                  {prize.label}
                </span>
              )
            })}
            <div className="absolute left-1/2 top-1/2 flex h-24 w-24 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border border-border bg-card shadow-xl">
              {spinning ? <Sparkles className="h-8 w-8 animate-pulse text-accent" /> : <Gift className="h-8 w-8 text-accent" />}
              <span className="mt-1 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Spin</span>
            </div>
          </div>
        </div>

        {result && (
          <div className="mb-4 rounded-2xl border border-primary/20 bg-primary/10 p-4 text-left">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-heading text-base font-bold text-foreground">
                  {result.type !== 'none' ? `Reward unlocked: ${result.label}` : 'No reward this time'}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{getPrizeDescription(result)}</p>
              </div>
              <Badge className="border-0 bg-background text-primary">{ticketCode}</Badge>
            </div>
          </div>
        )}

        <Button
          onClick={handleSpin}
          disabled={spinsRemaining <= 0 || spinning}
          className="h-12 rounded-2xl bg-gradient-to-r from-primary to-secondary px-8 font-semibold text-white hover:opacity-90"
        >
          {spinning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trophy className="mr-2 h-4 w-4" />}
          {spinning ? 'Wheel spinning...' : spinsRemaining > 0 ? 'Spin Lucky Wheel' : 'No spins available'}
        </Button>

        <p className="mt-4 text-xs leading-5 text-muted-foreground">
          Spins are earned from purchases, streaks, approved social engagement, and selected creator campaigns.
        </p>

        {history.length > 0 && (
          <div className="mt-5 space-y-2 text-left">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Recent spins</p>
            {history.map((item, index) => (
              <div key={`${item.label}-${item.code}-${index}`} className="flex items-center justify-between rounded-2xl border border-border bg-background px-3 py-2 text-xs">
                <span className="font-semibold text-foreground">{item.label}</span>
                <span className="text-muted-foreground">{item.code}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function MiniStat({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl border border-border bg-background/70 p-3 text-left">
      <Icon className="mb-2 h-4 w-4 text-primary" />
      <p className="font-heading text-sm font-bold text-foreground">{value}</p>
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
    </div>
  )
}
