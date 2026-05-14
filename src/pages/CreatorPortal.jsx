import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/components/AuthContext'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import {
  Users,
  Music,
  Video,
  TrendingUp,
  Upload,
  Plus,
  Trash2,
  Loader2,
  CheckCircle,
  PlayCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import {
  Creator,
  CreatorSubscription,
  MediaDrop,
  Order,
} from '@/entities'

const emptyCreatorForm = {
  name: '',
  category: '',
  bio: '',
  avatar_url: '',
  cover_url: '',
}

const emptyDropForm = {
  title: '',
  description: '',
  media_type: 'audio',
  media_url: '',
  storage_path: '',
  thumbnail_url: '',
  access_tier: 'free',
  fdt_reward: 5,
}

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
})

function formatDate(value) {
  if (!value) return 'No expiry'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'No expiry'

  return `Expires ${dateFormatter.format(date)}`
}

function currency(value) {
  return `₦${Number(value || 0).toLocaleString()}`
}

function hasCreatorOwnership(creator, email) {
  if (!creator || !email) return false

  return [
    creator.owner_email,
    creator.created_by,
    creator.created_by_email,
    creator.email,
  ]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase() === email.toLowerCase())
}

export default function CreatorPortal() {
  const { user, isAuthenticated, isLoadingAuth } = useAuth()
  const [activeTab, setActiveTab] = useState('drops')
  const [myCreator, setMyCreator] = useState(null)
  const [subscribers, setSubscribers] = useState([])
  const [drops, setDrops] = useState([])
  const [orders, setOrders] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const loadPortalData = useCallback(async () => {
    if (!user?.email) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const creators = await Creator.list({ status: 'active' })
      const creator =
        creators.find((item) => hasCreatorOwnership(item, user.email)) || null

      setMyCreator(creator)

      if (!creator?.id) {
        setSubscribers([])
        setDrops([])
        setOrders([])
        return
      }

      const [creatorSubscribers, creatorDrops, allOrders] = await Promise.all([
        CreatorSubscription.list({ creator_id: creator.id, status: 'active' }),
        MediaDrop.listAll(creator.id),
        Order.list(),
      ])

      setSubscribers(creatorSubscribers || [])
      setDrops(creatorDrops || [])
      setOrders(allOrders || [])
    } catch (loadError) {
      setError(loadError.message || 'Could not load creator portal data.')
    } finally {
      setIsLoading(false)
    }
  }, [user?.email])

  useEffect(() => {
    if (!isLoadingAuth) loadPortalData()
  }, [isLoadingAuth, loadPortalData])

  const tierCounts = useMemo(
    () => ({
      free: subscribers.filter((subscriber) => subscriber.tier === 'free').length,
      supporter: subscribers.filter((subscriber) => subscriber.tier === 'supporter').length,
      superfan: subscribers.filter((subscriber) => subscriber.tier === 'superfan').length,
    }),
    [subscribers]
  )

  const revenue = useMemo(() => {
    if (!myCreator?.id) return 0

    return orders
      .filter(
        (order) =>
          Array.isArray(order.items) &&
          order.items.some((item) => item.creator_id === myCreator.id)
      )
      .reduce((sum, order) => sum + Number(order.total_amount || 0), 0)
  }, [orders, myCreator?.id])

  const totalPlays = useMemo(
    () => drops.reduce((sum, drop) => sum + Number(drop.play_count || 0), 0),
    [drops]
  )

  const fdtDistributed = useMemo(
    () =>
      drops.reduce(
        (sum, drop) =>
          sum + Number(drop.play_count || 0) * Number(drop.fdt_reward || 5),
        0
      ),
    [drops]
  )

  if (isLoadingAuth || isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
          <Users className="h-8 w-8 text-primary" />
        </div>
        <h1 className="font-heading text-2xl font-bold text-foreground">
          Creator Portal
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Sign in from the Mine page first so FanDirect can connect this portal
          to your Supabase user.
        </p>
      </div>
    )
  }

  if (!myCreator) {
    return (
      <CreatorProfileSetup
        userEmail={user?.email}
        onCreated={(creator) => {
          setMyCreator(creator)
          setNotice('Creator profile created. You can now publish media drops.')
          loadPortalData()
        }}
      />
    )
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <img
            src={
              myCreator.avatar_url ||
              myCreator.image_url ||
              'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200'
            }
            alt={myCreator.name || 'Creator'}
            className="h-14 w-14 rounded-xl border-2 border-primary/30 object-cover"
          />
          <div>
            <h1 className="font-heading text-2xl font-bold text-foreground">
              {myCreator.name}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold capitalize text-primary">
                {myCreator.category || 'Creator'}
              </span>
              {myCreator.verified && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-500">
                  <CheckCircle className="h-3.5 w-3.5" /> Verified
                </span>
              )}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={loadPortalData}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted"
        >
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
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

      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard
          label="Total Subscribers"
          value={subscribers.length.toLocaleString()}
          icon={Users}
          iconClassName="text-primary"
        />
        <StatCard
          label="Superfans"
          value={tierCounts.superfan.toLocaleString()}
          icon={TrendingUp}
          iconClassName="text-secondary"
        />
        <StatCard
          label="Media Drops"
          value={drops.length.toLocaleString()}
          icon={PlayCircle}
          iconClassName="text-accent-foreground"
        />
        <StatCard
          label="Revenue"
          value={currency(revenue)}
          icon={TrendingUp}
          iconClassName="text-emerald-500"
        />
      </div>

      <div className="mb-6 flex gap-1 overflow-x-auto rounded-2xl border border-border bg-card p-1">
        <TabButton
          active={activeTab === 'drops'}
          onClick={() => setActiveTab('drops')}
          icon={Music}
        >
          Media Drops
        </TabButton>
        <TabButton
          active={activeTab === 'subscribers'}
          onClick={() => setActiveTab('subscribers')}
          icon={Users}
        >
          Subscribers
        </TabButton>
        <TabButton
          active={activeTab === 'analytics'}
          onClick={() => setActiveTab('analytics')}
          icon={TrendingUp}
        >
          Analytics
        </TabButton>
      </div>

      {activeTab === 'drops' && (
        <MediaDropManager
          creator={myCreator}
          drops={drops}
          onChanged={loadPortalData}
          setError={setError}
          setNotice={setNotice}
        />
      )}

      {activeTab === 'subscribers' && <SubscribersPanel subscribers={subscribers} />}

      {activeTab === 'analytics' && (
        <AnalyticsPanel
          tierCounts={tierCounts}
          totalPlays={totalPlays}
          fdtDistributed={fdtDistributed}
        />
      )}
    </div>
  )
}

function CreatorProfileSetup({ userEmail, onCreated }) {
  const [form, setForm] = useState(emptyCreatorForm)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()

    setIsSaving(true)
    setMessage('')

    try {
      const creator = await Creator.create({
        ...form,
        owner_email: userEmail || '',
        status: 'active',
        verified: false,
      })

      setForm(emptyCreatorForm)
      onCreated(creator)
    } catch (error) {
      setMessage(`Could not create creator profile. ${error.message}`)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <form onSubmit={handleSubmit} className="rounded-3xl border border-border bg-card p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-primary">
          Creator portal
        </p>
        <h1 className="mt-3 font-heading text-3xl font-bold">
          Create your FanDirect creator profile
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          No active creator profile is linked to {userEmail || 'this account'} yet.
          Create one in Supabase and your dashboard will open immediately.
        </p>

        <div className="mt-8 grid gap-4">
          <InputField
            label="Creator name"
            required
            value={form.name}
            onChange={(value) => setForm({ ...form, name: value })}
          />

          <InputField
            label="Category"
            value={form.category}
            onChange={(value) => setForm({ ...form, category: value })}
            placeholder="Music, comedy, film, sports..."
          />

          <label className="grid gap-2 text-sm font-medium">
            Bio
            <textarea
              value={form.bio}
              onChange={(event) => setForm({ ...form, bio: event.target.value })}
              className="min-h-28 rounded-xl border border-border bg-background px-4 py-3 outline-none focus:border-primary"
              placeholder="Tell fans what they get from your FanDirect community."
            />
          </label>

          <InputField
            label="Avatar image URL"
            value={form.avatar_url}
            onChange={(value) => setForm({ ...form, avatar_url: value })}
          />

          <InputField
            label="Cover image URL"
            value={form.cover_url}
            onChange={(value) => setForm({ ...form, cover_url: value })}
          />
        </div>

        <button
          type="submit"
          disabled={isSaving || !form.name}
          className="mt-6 inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-3 font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
          Save creator
        </button>

        {message && (
          <p className="mt-5 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            {message}
          </p>
        )}
      </form>
    </div>
  )
}

function MediaDropManager({ creator, drops, onChanged, setError, setNotice }) {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyDropForm)
  const [isSaving, setIsSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [thumbnailUploading, setThumbnailUploading] = useState(false)
  const [uploadPreviewUrl, setUploadPreviewUrl] = useState('')

  function resetForm() {
    setForm(emptyDropForm)
    setUploadPreviewUrl('')
  }

  async function handleFileUpload(event) {
    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)
    setError('')
    setNotice('')

    try {
      const upload = await MediaDrop.uploadMedia(file, creator.id)

      setUploadPreviewUrl(upload.signedUrl || '')
      setForm((current) => ({
        ...current,
        storage_path: upload.path,
        media_url: '',
      }))

      setNotice('Media file uploaded to Supabase Storage.')
    } catch (error) {
      setError(`Upload failed. ${error.message}`)
    } finally {
      setUploading(false)
    }
  }

  async function handleThumbnailUpload(event) {
    const file = event.target.files?.[0]
    if (!file) return

    setThumbnailUploading(true)
    setError('')
    setNotice('')

    try {
      const thumbnailUrl = await MediaDrop.uploadThumbnail(file, creator.id)

      setForm((current) => ({
        ...current,
        thumbnail_url: thumbnailUrl,
      }))
      setNotice('Thumbnail uploaded to Supabase Storage.')
    } catch (error) {
      setError(`Thumbnail upload failed. ${error.message}`)
    } finally {
      setThumbnailUploading(false)
    }
  }

  async function handleCreateDrop() {
    if (!form.title || (!form.media_url && !form.storage_path)) return

    setIsSaving(true)
    setError('')
    setNotice('')

    try {
      await MediaDrop.create({
        creator_id: creator.id,
        creator_name: creator.name,
        title: form.title,
        description: form.description,
        media_type: form.media_type,
        media_url: form.media_url || null,
        storage_path: form.storage_path || null,
        thumbnail_url: form.thumbnail_url || null,
        access_tier: form.access_tier,
        fdt_reward: Number(form.fdt_reward || 0),
        status: 'published',
      })

      resetForm()
      setShowForm(false)
      setNotice('Media drop published.')
      await onChanged()
    } catch (error) {
      setError(`Could not publish drop. ${error.message}`)
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDeleteDrop(id) {
    const shouldDelete = window.confirm('Delete this media drop?')
    if (!shouldDelete) return

    setError('')
    setNotice('')

    try {
      await MediaDrop.delete(id)
      setNotice('Drop deleted.')
      await onChanged()
    } catch (error) {
      setError(`Could not delete drop. ${error.message}`)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {drops.length} drops published
        </p>

        <button
          type="button"
          onClick={() => setShowForm((value) => !value)}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          <Plus className="h-4 w-4" /> New Drop
        </button>
      </div>

      {showForm && (
        <div className="rounded-3xl border border-primary/20 bg-card p-5">
          <h3 className="font-semibold text-foreground">New Media Drop</h3>

          <div className="mt-4 grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <InputField
                label="Title"
                required
                value={form.title}
                onChange={(value) => setForm({ ...form, title: value })}
                placeholder="Track or video title"
              />

              <SelectField
                label="Type"
                value={form.media_type}
                onChange={(value) => setForm({ ...form, media_type: value })}
                options={[
                  { value: 'audio', label: '🎵 Audio' },
                  { value: 'video', label: '🎬 Video' },
                ]}
              />
            </div>

            <label className="grid gap-2 text-sm font-medium">
              Description
              <textarea
                value={form.description}
                onChange={(event) =>
                  setForm({ ...form, description: event.target.value })
                }
                className="min-h-24 rounded-xl border border-border bg-background px-4 py-3 outline-none focus:border-primary"
                placeholder="Optional context for fans."
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField
                label="Access Tier"
                value={form.access_tier}
                onChange={(value) => setForm({ ...form, access_tier: value })}
                options={[
                  { value: 'free', label: 'Free' },
                  { value: 'supporter', label: 'Supporter+' },
                  { value: 'superfan', label: 'Superfan Only' },
                ]}
              />

              <InputField
                label="FDT Reward per Play"
                type="number"
                min="0"
                value={form.fdt_reward}
                onChange={(value) =>
                  setForm({ ...form, fdt_reward: Number(value) })
                }
              />
            </div>

            <InputField
              label="Thumbnail URL"
              value={form.thumbnail_url}
              onChange={(value) => setForm({ ...form, thumbnail_url: value })}
              placeholder="Optional public image URL"
            />

            <div>
              <label className="text-sm font-medium">Upload thumbnail image</label>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleThumbnailUpload}
                  className="hidden"
                  id="thumbnail-upload"
                />

                <label
                  htmlFor="thumbnail-upload"
                  className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-background px-4 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted"
                >
                  {thumbnailUploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  {thumbnailUploading ? 'Uploading...' : 'Choose Thumbnail'}
                </label>

                {form.thumbnail_url && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-500">
                    <CheckCircle className="h-3.5 w-3.5" /> Thumbnail ready
                  </span>
                )}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Upload media file</label>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <input
                  type="file"
                  accept="audio/*,video/*"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="media-upload"
                />

                <label
                  htmlFor="media-upload"
                  className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-background px-4 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted"
                >
                  {uploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  {uploading ? 'Uploading...' : 'Choose File'}
                </label>

                {form.storage_path && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-500">
                    <CheckCircle className="h-3.5 w-3.5" /> Uploaded
                  </span>
                )}

                {uploadPreviewUrl && (
                  <a
                    href={uploadPreviewUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-semibold text-primary hover:underline"
                  >
                    Preview uploaded file
                  </a>
                )}
              </div>

              <input
                value={form.media_url}
                onChange={(event) =>
                  setForm({
                    ...form,
                    media_url: event.target.value,
                    storage_path: '',
                  })
                }
                className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary"
                placeholder="Or paste a direct media URL instead..."
              />
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              <button
                type="button"
                onClick={handleCreateDrop}
                disabled={
                  !form.title ||
                  (!form.media_url && !form.storage_path) ||
                  isSaving
                }
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <PlayCircle className="h-4 w-4" />
                )}
                Publish Drop
              </button>

              <button
                type="button"
                onClick={() => {
                  resetForm()
                  setShowForm(false)
                }}
                className="rounded-xl border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {drops.map((drop) => (
          <DropRow
            key={drop.id}
            drop={drop}
            onDelete={() => handleDeleteDrop(drop.id)}
          />
        ))}

        {drops.length === 0 && !showForm && (
          <div className="rounded-3xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
            <Music className="mx-auto mb-2 h-8 w-8 opacity-30" />
            No drops yet. Create your first one.
          </div>
        )}
      </div>
    </div>
  )
}

function SubscribersPanel({ subscribers }) {
  if (subscribers.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
        <Users className="mx-auto mb-2 h-8 w-8 opacity-30" />
        No subscribers yet.
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {subscribers.map((subscriber) => (
        <div
          key={subscriber.id}
          className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3"
        >
          <div>
            <p className="text-sm font-medium text-foreground">
              {subscriber.fan_email}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatDate(subscriber.expires_at)}
            </p>
          </div>

          <TierBadge tier={subscriber.tier} />
        </div>
      ))}
    </div>
  )
}

function AnalyticsPanel({ tierCounts, totalPlays, fdtDistributed }) {
  const maxCount = Math.max(
    tierCounts.free,
    tierCounts.supporter,
    tierCounts.superfan,
    1
  )

  const chartData = [
    { name: 'Free', count: tierCounts.free },
    { name: 'Supporter', count: tierCounts.supporter },
    { name: 'Superfan', count: tierCounts.superfan },
  ]

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-border bg-card p-5">
        <h3 className="font-semibold text-foreground">Subscriber Tiers</h3>

        <div className="mt-5 space-y-4">
          {chartData.map((item) => (
            <div
              key={item.name}
              className="grid grid-cols-[90px_1fr_50px] items-center gap-3 text-sm"
            >
              <span className="text-muted-foreground">{item.name}</span>

              <div className="h-3 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{
                    width: `${Math.max(
                      (item.count / maxCount) * 100,
                      item.count ? 8 : 0
                    )}%`,
                  }}
                />
              </div>

              <span className="text-right font-semibold text-foreground">
                {item.count}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-3xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Total Plays</p>
          <p className="mt-1 font-heading text-2xl font-bold text-foreground">
            {totalPlays.toLocaleString()}
          </p>
        </div>

        <div className="rounded-3xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">FDT Distributed</p>
          <p className="mt-1 font-heading text-2xl font-bold text-accent">
            {fdtDistributed.toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, icon: Icon, iconClassName }) {
  return (
    <div className="rounded-3xl border border-border bg-card p-4">
      <Icon className={`mb-2 h-5 w-5 ${iconClassName}`} />
      <p className="font-heading text-xl font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  )
}

function TabButton({ active, onClick, icon: Icon, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold transition ${
        active
          ? 'bg-primary text-white'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      }`}
    >
      <Icon className="h-4 w-4" />
      {children}
    </button>
  )
}

function DropRow({ drop, onDelete }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
        {drop.media_type === 'audio' ? (
          <Music className="h-5 w-5 text-primary" />
        ) : (
          <Video className="h-5 w-5 text-secondary" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">
          {drop.title}
        </p>
        <p className="truncate text-xs capitalize text-muted-foreground">
          {drop.media_type || 'media'} · {drop.access_tier || 'free'} ·{' '}
          {Number(drop.play_count || 0).toLocaleString()} plays
        </p>
      </div>

      <TierBadge tier={drop.access_tier} />

      <button
        type="button"
        onClick={onDelete}
        className="rounded-xl p-2 text-destructive hover:bg-destructive/10"
        aria-label={`Delete ${drop.title}`}
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  )
}

function TierBadge({ tier = 'free' }) {
  const className =
    {
      superfan: 'bg-secondary/20 text-secondary',
      supporter: 'bg-primary/20 text-primary',
      free: 'bg-muted text-muted-foreground',
    }[tier] || 'bg-muted text-muted-foreground'

  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${className}`}>
      {tier}
    </span>
  )
}

function InputField({
  label,
  value,
  onChange,
  type = 'text',
  required = false,
  placeholder = '',
  min,
}) {
  return (
    <label className="grid gap-2 text-sm font-medium">
      {label}
      <input
        type={type}
        min={min}
        required={required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-xl border border-border bg-background px-4 py-3 outline-none focus:border-primary"
        placeholder={placeholder}
      />
    </label>
  )
}

function SelectField({ label, value, onChange, options }) {
  return (
    <label className="grid gap-2 text-sm font-medium">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-xl border border-border bg-background px-4 py-3 outline-none focus:border-primary"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}
