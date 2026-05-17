import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/components/AuthContext'
import { Card } from '@/components/ui/card'
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
  RefreshCw,
  ShoppingBag,
  Store,
  ShieldCheck,
  PackageCheck,
  FileSpreadsheet,
  Image as ImageIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { Creator, CreatorSubscription, MediaDrop, Order, Product } from '@/entities'
import { calculatePlatformPricing, formatNaira } from '@/lib/pricing'
import { readProductImportFile } from '@/lib/productImport'

const creatorCategories = [
  'music',
  'comedy',
  'fashion',
  'beauty',
  'tech',
  'gaming',
  'sports',
  'fitness',
  'food',
  'lifestyle',
  'education',
  'film',
  'podcast',
  'art',
  'dance',
  'photography',
  'other',
]

const sellTypes = [
  'physical merch',
  'digital drops',
  'event tickets',
  'experiences',
  'subscriptions',
]

const emptyCreatorForm = {
  name: '',
  username: '',
  category: 'music',
  bio: '',
  business_type: 'individual',
  country: 'NG',
  phone: '',
  full_name: '',
  selling: ['physical merch'],
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

const emptyProductForm = {
  title: '',
  description: '',
  type: 'merch',
  creator_base_price: '',
  stock: 100,
  status: 'active',
  image_url: '',
}

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
})

function cleanUsername(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/^@+/, '')
    .replace(/\s+/g, '.')
    .replace(/[^a-z0-9._]/g, '')
    .slice(0, 30)
}

function formatDate(value) {
  if (!value) return 'No expiry'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'No expiry'
  return `Expires ${dateFormatter.format(date)}`
}

function statusLabel(creator) {
  if (creator?.verified) return 'Verified'
  if (creator?.verification_status === 'pending_review') return 'Review pending'
  if (creator?.status === 'pending_review') return 'Review pending'
  return 'Verification not started'
}

export default function CreatorPortal() {
  const { user, isAuthenticated, isLoadingAuth } = useAuth()
  const [activeTab, setActiveTab] = useState('store')
  const [myCreator, setMyCreator] = useState(null)
  const [subscribers, setSubscribers] = useState([])
  const [drops, setDrops] = useState([])
  const [orders, setOrders] = useState([])
  const [products, setProducts] = useState([])
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
      const creator = await Creator.getMine()
      setMyCreator(creator)

      if (!creator?.id) {
        setSubscribers([])
        setDrops([])
        setOrders([])
        setProducts([])
        return
      }

      const [creatorSubscribers, creatorDrops, allOrders, creatorProducts] = await Promise.all([
        CreatorSubscription.list({ creator_id: creator.id, status: 'active' }),
        MediaDrop.listAll(creator.id),
        Order.list(),
        Product.listAll(creator.id),
      ])

      setSubscribers(creatorSubscribers || [])
      setDrops(creatorDrops || [])
      setOrders(allOrders || [])
      setProducts(creatorProducts || [])
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
      .reduce((sum, order) => sum + Number(order.creator_payout_total || order.total_amount || 0), 0)
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
          Log in to build a creator profile, publish drops, and manage sales.
        </p>
      </div>
    )
  }

  if (!myCreator) {
    return (
      <CreatorProfileSetup
        user={user}
        onCreated={(creator) => {
          setMyCreator(creator)
          setNotice('Creator profile submitted. Store setup is ready while verification is reviewed.')
          loadPortalData()
        }}
      />
    )
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-6 overflow-hidden rounded-[2rem] border border-border bg-card">
        <div
          className="h-36 bg-gradient-to-br from-primary/30 via-secondary/20 to-background bg-cover bg-center"
          style={{ backgroundImage: myCreator.cover_url ? `url(${myCreator.cover_url})` : undefined }}
        />
        <div className="flex flex-col gap-4 px-5 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-end gap-4">
            <img
              src={
                myCreator.avatar_url ||
                myCreator.image_url ||
                'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200'
              }
              alt={myCreator.name || 'Creator'}
              className="-mt-10 h-24 w-24 rounded-[1.7rem] border-4 border-card object-cover"
            />
            <div className="pb-1">
              <h1 className="font-heading text-2xl font-bold text-foreground">
                {myCreator.name}
              </h1>
              <p className="text-sm text-muted-foreground">@{myCreator.username || cleanUsername(myCreator.name)}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold capitalize text-primary">
                  {myCreator.category || 'Creator'}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                  <ShieldCheck className="h-3.5 w-3.5" /> {statusLabel(myCreator)}
                </span>
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
        <StatCard label="Subscribers" value={subscribers.length.toLocaleString()} icon={Users} iconClassName="text-primary" />
        <StatCard label="Products" value={products.length.toLocaleString()} icon={ShoppingBag} iconClassName="text-secondary" />
        <StatCard label="Media Drops" value={drops.length.toLocaleString()} icon={PlayCircle} iconClassName="text-accent-foreground" />
        <StatCard label="Creator Revenue" value={formatNaira(revenue)} icon={TrendingUp} iconClassName="text-emerald-500" />
      </div>

      <div className="mb-6 flex gap-1 overflow-x-auto rounded-2xl border border-border bg-card p-1">
        <TabButton active={activeTab === 'store'} onClick={() => setActiveTab('store')} icon={Store}>Store</TabButton>
        <TabButton active={activeTab === 'drops'} onClick={() => setActiveTab('drops')} icon={Music}>Media Drops</TabButton>
        <TabButton active={activeTab === 'orders'} onClick={() => setActiveTab('orders')} icon={PackageCheck}>Orders</TabButton>
        <TabButton active={activeTab === 'subscribers'} onClick={() => setActiveTab('subscribers')} icon={Users}>Subscribers</TabButton>
        <TabButton active={activeTab === 'analytics'} onClick={() => setActiveTab('analytics')} icon={TrendingUp}>Analytics</TabButton>
      </div>

      {activeTab === 'store' && (
        <CreatorStoreManager
          creator={myCreator}
          products={products}
          onChanged={loadPortalData}
          setError={setError}
          setNotice={setNotice}
        />
      )}

      {activeTab === 'drops' && (
        <MediaDropManager creator={myCreator} drops={drops} onChanged={loadPortalData} setError={setError} setNotice={setNotice} />
      )}

      {activeTab === 'orders' && <OrdersPanel creator={myCreator} orders={orders} />}
      {activeTab === 'subscribers' && <SubscribersPanel subscribers={subscribers} />}
      {activeTab === 'analytics' && <AnalyticsPanel tierCounts={tierCounts} totalPlays={totalPlays} fdtDistributed={fdtDistributed} />}
    </div>
  )
}

function CreatorProfileSetup({ user, onCreated }) {
  const [step, setStep] = useState(0)
  const [form, setForm] = useState({
    ...emptyCreatorForm,
    name: user?.user_metadata?.display_name || user?.email?.split('@')[0] || '',
    username: cleanUsername(user?.user_metadata?.username || user?.email?.split('@')[0] || ''),
    full_name: user?.user_metadata?.full_name || user?.user_metadata?.display_name || '',
  })
  const [avatarFile, setAvatarFile] = useState(null)
  const [coverFile, setCoverFile] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState('')

  const avatarPreview = avatarFile ? URL.createObjectURL(avatarFile) : ''
  const coverPreview = coverFile ? URL.createObjectURL(coverFile) : ''

  function toggleSellType(type) {
    setForm((current) => ({
      ...current,
      selling: current.selling.includes(type)
        ? current.selling.filter((item) => item !== type)
        : [...current.selling, type],
    }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setIsSaving(true)
    setMessage('')

    try {
      const creator = await Creator.create({
        name: form.name.trim(),
        display_name: form.name.trim(),
        username: cleanUsername(form.username),
        category: form.category,
        bio: form.bio,
        business_type: form.business_type,
        country: form.country,
        phone: form.phone,
        full_name: form.full_name,
        owner_email: user?.email || '',
        owner_user_id: user?.id || null,
        status: 'pending_review',
        verification_status: 'pending_review',
        onboarding_status: 'review_pending',
        payout_status: 'not_started',
        verified: false,
      })

      const uploaded = {}
      if (avatarFile) uploaded.avatar_url = await Creator.uploadAvatar(avatarFile, creator.id)
      if (coverFile) uploaded.cover_url = await Creator.uploadCover(coverFile, creator.id)

      const savedCreator = Object.keys(uploaded).length > 0
        ? await Creator.update(creator.id, uploaded)
        : creator

      onCreated(savedCreator)
    } catch (error) {
      setMessage(`Could not create creator profile. ${error.message}`)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <form onSubmit={handleSubmit} className="overflow-hidden rounded-[2rem] border border-border bg-card">
        <div
          className="h-40 bg-gradient-to-br from-primary/30 via-secondary/20 to-background bg-cover bg-center"
          style={{ backgroundImage: coverPreview ? `url(${coverPreview})` : undefined }}
        />
        <div className="p-6 sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-primary">Creator setup</p>
          <h1 className="mt-3 font-heading text-3xl font-bold">Complete your creator profile</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            Build the public profile fans will see when they discover content, products, drops, and experiences. Verification and payout setup continue after this profile is submitted.
          </p>

          <div className="mt-6 grid gap-2 sm:grid-cols-3">
            {['Profile', 'Store', 'Verification'].map((label, index) => (
              <button
                key={label}
                type="button"
                onClick={() => setStep(index)}
                className={`rounded-2xl border px-4 py-3 text-left text-sm font-semibold ${
                  step === index ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-background text-muted-foreground'
                }`}
              >
                {index + 1}. {label}
              </button>
            ))}
          </div>

          {step === 0 && (
            <div className="mt-8 grid gap-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-[1.7rem] border border-border bg-background">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Profile preview" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                      <ImageIcon className="h-8 w-8" />
                    </div>
                  )}
                </div>
                <div>
                  <p className="font-semibold">Profile photo</p>
                  <p className="mt-1 text-sm text-muted-foreground">Upload a clear image. This appears across the creator feed and store.</p>
                  <UploadButton label={avatarFile ? avatarFile.name : 'Upload profile photo'} onChange={setAvatarFile} />
                </div>
              </div>

              <div>
                <p className="font-semibold">Cover photo</p>
                <p className="mt-1 text-sm text-muted-foreground">Add a banner for the top of the creator profile.</p>
                <UploadButton label={coverFile ? coverFile.name : 'Upload cover photo'} onChange={setCoverFile} />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <InputField label="Creator name" required value={form.name} onChange={(value) => setForm({ ...form, name: value })} />
                <InputField label="Username" required value={form.username} onChange={(value) => setForm({ ...form, username: cleanUsername(value) })} prefix="@" />
              </div>

              <SelectField
                label="Category"
                value={form.category}
                onChange={(value) => setForm({ ...form, category: value })}
                options={creatorCategories.map((category) => ({ value: category, label: category }))}
              />

              <label className="grid gap-2 text-sm font-medium">
                Bio
                <textarea
                  value={form.bio}
                  onChange={(event) => setForm({ ...form, bio: event.target.value })}
                  className="min-h-28 rounded-xl border border-border bg-background px-4 py-3 outline-none focus:border-primary"
                  placeholder="Tell fans what they can expect from your community."
                />
              </label>
            </div>
          )}

          {step === 1 && (
            <div className="mt-8 grid gap-5">
              <SelectField
                label="Account type"
                value={form.business_type}
                onChange={(value) => setForm({ ...form, business_type: value })}
                options={[
                  { value: 'individual', label: 'Individual creator' },
                  { value: 'brand', label: 'Brand / team' },
                  { value: 'agency', label: 'Manager / agency' },
                ]}
              />

              <div>
                <p className="text-sm font-semibold">What will this creator sell?</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {sellTypes.map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => toggleSellType(type)}
                      className={`rounded-2xl border px-4 py-3 text-left text-sm font-semibold capitalize ${
                        form.selling.includes(type) ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-background text-foreground'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-background p-4 text-sm text-muted-foreground">
                FanDirect automatically adds a 5% platform service fee to product prices. Creators keep the base price entered for each item.
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="mt-8 grid gap-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <InputField label="Legal or business name" value={form.full_name} onChange={(value) => setForm({ ...form, full_name: value })} />
                <InputField label="Phone number" value={form.phone} onChange={(value) => setForm({ ...form, phone: value })} />
              </div>

              <InputField label="Country" value={form.country} onChange={(value) => setForm({ ...form, country: value.toUpperCase() })} />

              <div className="rounded-2xl border border-primary/20 bg-primary/10 p-4 text-sm leading-6 text-primary">
                Identity, payout, and business information can be reviewed before the creator receives full selling and payout access.
              </div>
            </div>
          )}

          <div className="mt-8 flex flex-wrap gap-3">
            {step > 0 && (
              <button type="button" onClick={() => setStep((value) => value - 1)} className="rounded-2xl border border-border bg-background px-5 py-3 font-semibold hover:bg-muted">
                Back
              </button>
            )}
            {step < 2 ? (
              <button type="button" onClick={() => setStep((value) => value + 1)} disabled={!form.name || !form.username} className="rounded-2xl bg-primary px-5 py-3 font-semibold text-white hover:opacity-90 disabled:opacity-60">
                Continue
              </button>
            ) : (
              <button type="submit" disabled={isSaving || !form.name || !form.username} className="inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 font-semibold text-white hover:opacity-90 disabled:opacity-60">
                {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                Submit creator profile
              </button>
            )}
          </div>

          {message && (
            <p className="mt-5 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              {message}
            </p>
          )}
        </div>
      </form>
    </div>
  )
}

function CreatorStoreManager({ creator, products, onChanged, setError, setNotice }) {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyProductForm)
  const [imageFile, setImageFile] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const [importRows, setImportRows] = useState([])
  const [isImporting, setIsImporting] = useState(false)

  const pricing = calculatePlatformPricing(form.creator_base_price || 0)

  function resetForm() {
    setForm(emptyProductForm)
    setImageFile(null)
  }

  async function handleSaveProduct() {
    if (!form.title || !Number(form.creator_base_price)) {
      toast.error('Product title and base price are required.')
      return
    }

    setIsSaving(true)
    setError('')
    setNotice('')

    try {
      const product = await Product.create({
        ...form,
        creator_id: creator.id,
        creator_name: creator.name,
        creator_base_price: Number(form.creator_base_price || 0),
        stock: Number(form.stock || 0),
      })

      if (imageFile) {
        const imageUrl = await Product.uploadImage(imageFile, creator.id)
        await Product.update(product.id, { image_url: imageUrl })
      }

      resetForm()
      setShowForm(false)
      setNotice('Product added to creator store.')
      await onChanged()
    } catch (error) {
      setError(`Could not save product. ${error.message}`)
    } finally {
      setIsSaving(false)
    }
  }

  async function handleImportFile(event) {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const rows = await readProductImportFile(file, creator)
      setImportRows(rows)
      const valid = rows.filter((row) => row.errors.length === 0).length
      setNotice(`${valid} product rows are ready to import.`)
    } catch (error) {
      setError(`Could not read inventory file. ${error.message}`)
    }
  }

  async function handleImportProducts() {
    const validProducts = importRows.filter((row) => row.errors.length === 0).map((row) => row.product)
    if (validProducts.length === 0) return

    setIsImporting(true)
    setError('')
    setNotice('')

    try {
      await Product.bulkCreate(validProducts)
      setImportRows([])
      setNotice(`${validProducts.length} products imported.`)
      await onChanged()
    } catch (error) {
      setError(`Import failed. ${error.message}`)
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
        <div>
          <h2 className="font-heading text-xl font-bold">Creator Store</h2>
          <p className="mt-1 text-sm text-muted-foreground">Add merch, digital products, event access, and import existing inventory.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-background px-4 py-2 text-sm font-semibold hover:bg-muted">
            <FileSpreadsheet className="h-4 w-4" /> Import inventory
            <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleImportFile} />
          </label>
          <button type="button" onClick={() => setShowForm((value) => !value)} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90">
            <Plus className="h-4 w-4" /> New product
          </button>
        </div>
      </div>

      {importRows.length > 0 && (
        <div className="rounded-3xl border border-border bg-card p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-semibold">Import preview</h3>
              <p className="text-sm text-muted-foreground">{importRows.length} rows found. Invalid rows are skipped until fixed in the sheet.</p>
            </div>
            <button type="button" onClick={handleImportProducts} disabled={isImporting || importRows.every((row) => row.errors.length > 0)} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
              {isImporting && <Loader2 className="h-4 w-4 animate-spin" />}
              Import valid rows
            </button>
          </div>
          <div className="mt-4 max-h-64 overflow-auto rounded-2xl border border-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Row</th>
                  <th className="px-3 py-2">Title</th>
                  <th className="px-3 py-2">Base</th>
                  <th className="px-3 py-2">Fan price</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {importRows.slice(0, 20).map((row) => (
                  <tr key={row.rowNumber} className="border-t border-border">
                    <td className="px-3 py-2">{row.rowNumber}</td>
                    <td className="px-3 py-2">{row.product.title || '—'}</td>
                    <td className="px-3 py-2">{formatNaira(row.product.creator_base_price)}</td>
                    <td className="px-3 py-2">{formatNaira(row.product.fan_price)}</td>
                    <td className={row.errors.length ? 'px-3 py-2 text-destructive' : 'px-3 py-2 text-emerald-500'}>{row.errors.join(', ') || 'Ready'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showForm && (
        <div className="rounded-3xl border border-primary/20 bg-card p-5">
          <h3 className="font-semibold">New product</h3>
          <div className="mt-4 grid gap-4">
            <InputField label="Product title" required value={form.title} onChange={(value) => setForm({ ...form, title: value })} />
            <label className="grid gap-2 text-sm font-medium">
              Description
              <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className="min-h-20 rounded-xl border border-border bg-background px-4 py-3 outline-none focus:border-primary" />
            </label>
            <div className="grid gap-4 sm:grid-cols-3">
              <SelectField label="Type" value={form.type} onChange={(value) => setForm({ ...form, type: value })} options={['merch', 'digital', 'event', 'experience', 'exclusive'].map((type) => ({ value: type, label: type }))} />
              <InputField label="Creator base price" type="number" value={form.creator_base_price} onChange={(value) => setForm({ ...form, creator_base_price: value })} />
              <InputField label="Stock" type="number" value={form.stock} onChange={(value) => setForm({ ...form, stock: value })} />
            </div>
            <div className="rounded-2xl border border-border bg-background p-4 text-sm">
              <div className="flex justify-between text-muted-foreground"><span>Base price</span><span>{formatNaira(pricing.creator_base_price)}</span></div>
              <div className="mt-1 flex justify-between text-muted-foreground"><span>FanDirect fee 5%</span><span>{formatNaira(pricing.platform_fee_amount)}</span></div>
              <div className="mt-2 flex justify-between border-t border-border pt-2 font-semibold"><span>Fan price</span><span>{formatNaira(pricing.fan_price)}</span></div>
            </div>
            <UploadButton label={imageFile ? imageFile.name : 'Upload product image'} onChange={setImageFile} />
            <div className="flex flex-wrap gap-2 pt-2">
              <button type="button" onClick={handleSaveProduct} disabled={isSaving} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
                {isSaving && <Loader2 className="h-4 w-4 animate-spin" />} Save product
              </button>
              <button type="button" onClick={() => { resetForm(); setShowForm(false) }} className="rounded-xl border border-border bg-background px-4 py-2 text-sm font-semibold hover:bg-muted">Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-3">
        {products.map((product) => (
          <div key={product.id} className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4">
            <img src={product.image_url || 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=200'} alt={product.title} className="h-16 w-16 rounded-xl object-cover" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{product.title}</p>
              <p className="text-xs capitalize text-muted-foreground">{product.type || 'merch'} · Stock {Number(product.stock || 0).toLocaleString()}</p>
            </div>
            <div className="text-right">
              <p className="font-heading font-bold">{formatNaira(product.fan_price || product.price)}</p>
              <p className="text-xs text-muted-foreground">Creator gets {formatNaira(product.creator_base_price || product.price)}</p>
            </div>
          </div>
        ))}
        {products.length === 0 && !showForm && <EmptyState icon={ShoppingBag} text="No products yet. Add one product or import an inventory sheet." />}
      </div>
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
      setForm((current) => ({ ...current, storage_path: upload.path, media_url: '' }))
      setNotice('Media file uploaded.')
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
      setForm((current) => ({ ...current, thumbnail_url: thumbnailUrl }))
      setNotice('Thumbnail uploaded.')
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
        <p className="text-sm text-muted-foreground">{drops.length} drops published</p>
        <button type="button" onClick={() => setShowForm((value) => !value)} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90">
          <Plus className="h-4 w-4" /> New Drop
        </button>
      </div>

      {showForm && (
        <div className="rounded-3xl border border-primary/20 bg-card p-5">
          <h3 className="font-semibold text-foreground">New Media Drop</h3>
          <div className="mt-4 grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <InputField label="Title" required value={form.title} onChange={(value) => setForm({ ...form, title: value })} placeholder="Track or video title" />
              <SelectField label="Type" value={form.media_type} onChange={(value) => setForm({ ...form, media_type: value })} options={[{ value: 'audio', label: 'Audio' }, { value: 'video', label: 'Video' }]} />
            </div>

            <label className="grid gap-2 text-sm font-medium">
              Description
              <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className="min-h-24 rounded-xl border border-border bg-background px-4 py-3 outline-none focus:border-primary" placeholder="Optional context for fans." />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField label="Access Tier" value={form.access_tier} onChange={(value) => setForm({ ...form, access_tier: value })} options={[{ value: 'free', label: 'Free' }, { value: 'supporter', label: 'Supporter+' }, { value: 'superfan', label: 'Superfan Only' }]} />
              <InputField label="FDT Reward per Play" type="number" min="0" value={form.fdt_reward} onChange={(value) => setForm({ ...form, fdt_reward: Number(value) })} />
            </div>

            <div>
              <label className="text-sm font-medium">Thumbnail image</label>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <input type="file" accept="image/*" onChange={handleThumbnailUpload} className="hidden" id="thumbnail-upload" />
                <label htmlFor="thumbnail-upload" className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-background px-4 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted">
                  {thumbnailUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  {thumbnailUploading ? 'Uploading...' : 'Choose thumbnail'}
                </label>
                {form.thumbnail_url && <ReadyLabel text="Thumbnail ready" />}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Upload media file</label>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <input type="file" accept="audio/*,video/*" onChange={handleFileUpload} className="hidden" id="media-upload" />
                <label htmlFor="media-upload" className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-background px-4 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted">
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  {uploading ? 'Uploading...' : 'Choose file'}
                </label>
                {form.storage_path && <ReadyLabel text="Uploaded" />}
                {uploadPreviewUrl && <a href={uploadPreviewUrl} target="_blank" rel="noreferrer" className="text-xs font-semibold text-primary hover:underline">Preview file</a>}
              </div>
              <input value={form.media_url} onChange={(event) => setForm({ ...form, media_url: event.target.value, storage_path: '' })} className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary" placeholder="Or paste a direct media URL..." />
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              <button type="button" onClick={handleCreateDrop} disabled={!form.title || (!form.media_url && !form.storage_path) || isSaving} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60">
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />} Publish Drop
              </button>
              <button type="button" onClick={() => { resetForm(); setShowForm(false) }} className="rounded-xl border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted">Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {drops.map((drop) => <DropRow key={drop.id} drop={drop} onDelete={() => handleDeleteDrop(drop.id)} />)}
        {drops.length === 0 && !showForm && <EmptyState icon={Music} text="No drops yet. Create your first one." />}
      </div>
    </div>
  )
}

function OrdersPanel({ creator, orders }) {
  const creatorOrders = orders.filter((order) => Array.isArray(order.items) && order.items.some((item) => item.creator_id === creator.id))

  if (creatorOrders.length === 0) return <EmptyState icon={PackageCheck} text="No orders yet." />

  return (
    <div className="space-y-3">
      {creatorOrders.map((order) => (
        <div key={order.id} className="rounded-2xl border border-border bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold">{order.order_number || order.id}</p>
              <p className="text-xs text-muted-foreground">{order.buyer_email}</p>
            </div>
            <div className="text-right">
              <p className="font-heading font-bold">{formatNaira(order.creator_payout_total || order.total_amount)}</p>
              <p className="text-xs capitalize text-muted-foreground">{order.payment_status || 'pending'} · {order.fulfillment_status || 'pending'}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function SubscribersPanel({ subscribers }) {
  if (subscribers.length === 0) return <EmptyState icon={Users} text="No subscribers yet." />

  return (
    <div className="space-y-2">
      {subscribers.map((subscriber) => (
        <div key={subscriber.id} className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3">
          <div>
            <p className="text-sm font-medium text-foreground">{subscriber.fan_email}</p>
            <p className="text-xs text-muted-foreground">{formatDate(subscriber.expires_at)}</p>
          </div>
          <TierBadge tier={subscriber.tier} />
        </div>
      ))}
    </div>
  )
}

function AnalyticsPanel({ tierCounts, totalPlays, fdtDistributed }) {
  const maxCount = Math.max(tierCounts.free, tierCounts.supporter, tierCounts.superfan, 1)
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
            <div key={item.name} className="grid grid-cols-[90px_1fr_50px] items-center gap-3 text-sm">
              <span className="text-muted-foreground">{item.name}</span>
              <div className="h-3 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max((item.count / maxCount) * 100, item.count ? 8 : 0)}%` }} />
              </div>
              <span className="text-right font-semibold text-foreground">{item.count}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-3xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Total Plays</p>
          <p className="mt-1 font-heading text-2xl font-bold text-foreground">{totalPlays.toLocaleString()}</p>
        </div>
        <div className="rounded-3xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">FDT Distributed</p>
          <p className="mt-1 font-heading text-2xl font-bold text-accent">{fdtDistributed.toLocaleString()}</p>
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
    <button type="button" onClick={onClick} className={`inline-flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold transition ${active ? 'bg-primary text-white' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
      <Icon className="h-4 w-4" /> {children}
    </button>
  )
}

function DropRow({ drop, onDelete }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
        {drop.media_type === 'audio' ? <Music className="h-5 w-5 text-primary" /> : <Video className="h-5 w-5 text-secondary" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{drop.title}</p>
        <p className="truncate text-xs capitalize text-muted-foreground">{drop.media_type || 'media'} · {drop.access_tier || 'free'} · {Number(drop.play_count || 0).toLocaleString()} plays</p>
      </div>
      <TierBadge tier={drop.access_tier} />
      <button type="button" onClick={onDelete} className="rounded-xl p-2 text-destructive hover:bg-destructive/10" aria-label={`Delete ${drop.title}`}>
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  )
}

function TierBadge({ tier = 'free' }) {
  const className = { superfan: 'bg-secondary/20 text-secondary', supporter: 'bg-primary/20 text-primary', free: 'bg-muted text-muted-foreground' }[tier] || 'bg-muted text-muted-foreground'
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${className}`}>{tier}</span>
}

function InputField({ label, value, onChange, type = 'text', required = false, placeholder = '', min, prefix }) {
  return (
    <label className="grid gap-2 text-sm font-medium">
      {label}
      <div className="relative">
        {prefix && <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">{prefix}</span>}
        <input type={type} min={min} required={required} value={value} onChange={(event) => onChange(event.target.value)} className={`w-full rounded-xl border border-border bg-background px-4 py-3 outline-none focus:border-primary ${prefix ? 'pl-8' : ''}`} placeholder={placeholder} />
      </div>
    </label>
  )
}

function SelectField({ label, value, onChange, options }) {
  return (
    <label className="grid gap-2 text-sm font-medium">
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)} className="rounded-xl border border-border bg-background px-4 py-3 capitalize outline-none focus:border-primary">
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  )
}

function UploadButton({ label, onChange }) {
  return (
    <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-background px-4 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted">
      <Upload className="h-4 w-4" /> {label}
      <input type="file" accept="image/*" className="hidden" onChange={(event) => onChange(event.target.files?.[0] || null)} />
    </label>
  )
}

function ReadyLabel({ text }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-500">
      <CheckCircle className="h-3.5 w-3.5" /> {text}
    </span>
  )
}

function EmptyState({ icon: Icon, text }) {
  return (
    <div className="rounded-3xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
      <Icon className="mx-auto mb-2 h-8 w-8 opacity-30" /> {text}
    </div>
  )
}
