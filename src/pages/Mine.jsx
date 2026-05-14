import React, { useCallback, useEffect, useState } from 'react'
import { Coins, Zap, Info, Gift, Trophy, Rss, Loader2, RefreshCw, Radio, Activity, Flame } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { useAuth } from '@/components/AuthContext'
import { FanToken } from '@/entities'
import TokenWallet from '@/components/tokens/TokenWallet'
import SubmitEngagementForm from '@/components/tokens/SubmitEngagementForm'
import EngagementHistory from '@/components/tokens/EngagementHistory'
import EngagementTierCard from '@/components/tokens/EngagementTierCard'
import RedemptionPanel from '@/components/tokens/RedemptionPanel'
import FDTLeaderboard from '@/components/tokens/FDTLeaderboard'
import SocialFeed from '@/components/feed/SocialFeed.jsx'
import StreakNotifier from '@/components/notifications/StreakNotifier.jsx'

const tabs = [
  { id: 'mine', label: 'Mine', icon: Zap },
  { id: 'feed', label: 'Feed', icon: Rss },
  { id: 'redeem', label: 'Redeem', icon: Gift },
  { id: 'leaderboard', label: 'Ranks', icon: Trophy },
  { id: 'history', label: 'History', icon: null },
  { id: 'how', label: 'Guide', icon: Info },
]

function getUserEmail(user) {
  return user?.email || user?.user_metadata?.email || ''
}

export default function Mine() {
  const { user, isAuthenticated, isLoadingAuth } = useAuth()
  const [activeTab, setActiveTab] = useState('mine')
  const [wallets, setWallets] = useState([])
  const [walletLoading, setWalletLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const userEmail = getUserEmail(user)
  const wallet = wallets[0] || null
  const liveEvents = [
    'TikTok duet approved +75 FDT',
    'Instagram story share submitted',
    'YouTube comment proof under review',
    'Supporter drop played +12 FDT',
    'Daily streak multiplier active',
  ]

  const loadWallet = useCallback(async () => {
    if (!userEmail) {
      setWallets([])
      setWalletLoading(false)
      setIsRefreshing(false)
      return
    }

    setError('')
    setNotice('')

    try {
      const rows = await FanToken.list({ user_email: userEmail })
      setWallets(rows || [])
    } catch (loadError) {
      console.warn(loadError)
      setWallets([])
      setError(loadError.message || 'Could not load your FDT wallet.')
    } finally {
      setWalletLoading(false)
      setIsRefreshing(false)
    }
  }, [userEmail])

  useEffect(() => {
    if (!isLoadingAuth) {
      loadWallet()
    }
  }, [isLoadingAuth, loadWallet])

  async function handleRefresh() {
    setIsRefreshing(true)
    await loadWallet()
  }

  async function handleWalletChanged() {
    await loadWallet()
    setNotice('Wallet updated.')
  }

  if (isLoadingAuth || walletLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-accent to-accent/60">
          <Coins className="h-8 w-8 text-accent-foreground" />
        </div>

        <h1 className="mb-2 font-heading text-3xl font-bold text-foreground">
          Mine <span className="text-accent">FanDirect Tokens</span>
        </h1>

        <p className="mx-auto max-w-md text-sm text-muted-foreground">
          Earn FDT by engaging with creator content across Instagram, TikTok,
          YouTube, and Telegram. Use FDT for discounts and exclusive purchases.
        </p>
      </div>

      {(error || notice) && (
        <div
          className={`mb-6 rounded-2xl border p-4 text-sm ${
            error
              ? 'border-destructive/30 bg-destructive/10 text-destructive'
              : 'border-primary/20 bg-primary/10 text-primary'
          }`}
        >
          {error || notice}
        </div>
      )}

      <div className="mb-6 flex justify-end">
        <button
          type="button"
          onClick={handleRefresh}
          disabled={isRefreshing || !userEmail}
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

      <StreakNotifier wallet={wallet} />

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <LiveStat icon={Radio} label="Network" value="Live" sub="30s refresh" />
        <LiveStat icon={Flame} label="Streak" value={`${Number(wallet?.mining_streak || 0)}d`} sub="keep mining daily" />
        <LiveStat icon={Activity} label="Velocity" value={`${Number(wallet?.total_mined || 0).toLocaleString()} FDT`} sub="lifetime mined" />
      </div>

      <div className="mb-6 overflow-hidden rounded-2xl border border-primary/20 bg-primary/10 px-4 py-3">
        <div className="flex animate-[pulse_4s_ease-in-out_infinite] flex-wrap items-center gap-3 text-xs text-primary">
          <span className="inline-flex items-center gap-1 font-bold">
            <Radio className="h-3.5 w-3.5" /> Live now
          </span>
          {liveEvents.map((event) => (
            <span key={event} className="rounded-full bg-background/70 px-3 py-1 text-muted-foreground">
              {event}
            </span>
          ))}
        </div>
      </div>

      <div className="mb-6">
        <TokenWallet wallet={wallet} isLoading={isRefreshing && !!userEmail} />
      </div>

      <div>
        <div className="mb-6 grid w-full grid-cols-3 gap-1 rounded-2xl border border-border bg-card p-1 sm:grid-cols-6">
          {tabs.map((tab) => (
            <TabButton
              key={tab.id}
              active={activeTab === tab.id}
              icon={tab.icon}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </TabButton>
          ))}
        </div>

        {activeTab === 'mine' && (
          <Panel title="Submit Engagement Proof">
            {isAuthenticated && userEmail ? (
              <SubmitEngagementForm
                userEmail={userEmail}
                onSubmitted={handleWalletChanged}
              />
            ) : (
              <LoginPrompt message="Please log in to mine FDT tokens." />
            )}
          </Panel>
        )}

        {activeTab === 'feed' && (
          <Panel
            title="Engagement Feed"
            description="See what fans are mining across the platform."
          >
            <SocialFeed currentUser={user} />
          </Panel>
        )}

        {activeTab === 'redeem' && (
          <Panel
            title="Redeem FDT"
            description="Exchange your earned tokens for real rewards."
          >
            {isAuthenticated && userEmail ? (
              <RedemptionPanel
                wallet={wallet}
                userEmail={userEmail}
                onRedeemed={handleWalletChanged}
              />
            ) : (
              <LoginPrompt message="Please log in to redeem tokens." />
            )}
          </Panel>
        )}

        {activeTab === 'leaderboard' && (
          <Panel
            title="FDT Leaderboard"
            description="Top miners ranked by total FDT earned."
          >
            <FDTLeaderboard currentUserEmail={userEmail} />
          </Panel>
        )}

        {activeTab === 'history' && (
          <Panel title="Mining History">
            {isAuthenticated && userEmail ? (
              <EngagementHistory userEmail={userEmail} />
            ) : (
              <LoginPrompt message="Please log in to view history." />
            )}
          </Panel>
        )}

        {activeTab === 'how' && (
          <Panel
            title="Proof of Engagement"
            description="FDT is mined through real social engagement. Higher-value actions that spread creator content earn more tokens."
          >
            <EngagementTierCard />

            <div className="mt-5 space-y-1 rounded-2xl bg-muted/40 p-4 text-xs text-muted-foreground">
              <p className="mb-2 text-sm font-semibold text-foreground">
                💡 Tips to maximize FDT
              </p>
              <p>• Stitch or duet creator TikToks for the highest rewards (+75 FDT)</p>
              <p>• Share posts to your Story for easy +50 FDT</p>
              <p>• Sign up for creator email lists to earn +30 FDT</p>
              <p>• Maintain a daily mining streak for bonus multipliers</p>
            </div>
          </Panel>
        )}
      </div>
    </div>
  )
}

function TabButton({ active, icon: Icon, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-1 rounded-xl px-2 py-2 text-xs font-semibold transition ${
        active
          ? 'bg-primary text-white'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      }`}
    >
      {Icon && <Icon className="h-3.5 w-3.5" />}
      {children}
    </button>
  )
}

function Panel({ title, description, children }) {
  return (
    <div className="rounded-3xl border border-border bg-card p-5">
      <h2 className="font-heading font-semibold text-foreground">{title}</h2>

      {description && (
        <p className="mb-4 mt-1 text-sm text-muted-foreground">{description}</p>
      )}

      {!description && <div className="mb-4" />}

      {children}
    </div>
  )
}

function LiveStat({ icon: Icon, label, value, sub }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground">{label}</span>
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <p className="font-heading text-xl font-bold text-foreground">{value}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>
    </div>
  )
}

function LoginPrompt({ message }) {
  return (
    <div className="rounded-2xl border border-dashed border-border py-10 text-center space-y-4">
      <p className="text-sm text-muted-foreground">{message}</p>
      <a href="/login" className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90">
        Sign In
      </a>
    </div>
  )
}
// Note: LoginPrompt updated to link to /login
