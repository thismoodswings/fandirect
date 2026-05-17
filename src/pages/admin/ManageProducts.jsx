import React, { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  RefreshCw,
  Upload,
} from 'lucide-react'
import { toast } from 'sonner'
import { Creator, Product } from '@/entities'
import { calculatePlatformPricing, formatNaira, normalizeProductPricing } from '@/lib/pricing'

const types = ['merch', 'event', 'digital', 'experience', 'exclusive']

const defaultForm = {
  title: '',
  description: '',
  type: 'merch',
  creator_base_price: '',
  price: '',
  original_price: '',
  image_url: '',
  creator_id: '',
  creator_name: '',
  stock: 100,
  cashback_percent: 0,
  loyalty_points: 0,
  is_limited: false,
  event_date: '',
  event_location: '',
  status: 'active',
}

function getCreatedDate(row) {
  return row?.created_date || row?.created_at || ''
}

function sortNewestFirst(rows = []) {
  return [...rows].sort((a, b) => {
    const aTime = new Date(getCreatedDate(a)).getTime() || 0
    const bTime = new Date(getCreatedDate(b)).getTime() || 0

    return bTime - aTime
  })
}

function createPayload(data) {
  return normalizeProductPricing({
    ...data,
    creator_base_price: Number(data.creator_base_price || data.price) || 0,
    original_price: Number(data.original_price) || 0,
    stock: Number(data.stock) || 0,
    cashback_percent: Number(data.cashback_percent) || 0,
    loyalty_points: Number(data.loyalty_points) || 0,
    is_limited: Boolean(data.is_limited),
  })
}

export default function ManageProducts() {
  const [products, setProducts] = useState([])
  const [creators, setCreators] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [deletingId, setDeletingId] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(defaultForm)
  const [imageFile, setImageFile] = useState(null)
  const [error, setError] = useState('')

  async function loadProducts() {
    setError('')

    try {
      const [productRows, creatorRows] = await Promise.all([
        Product.list(),
        Creator.list({ status: 'active' }),
      ])

      setProducts(sortNewestFirst(productRows || []).slice(0, 100))
      setCreators(creatorRows || [])
    } catch (loadError) {
      console.warn(loadError)
      setError(loadError.message || 'Could not load products.')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    loadProducts()
  }, [])

  function resetForm() {
    setForm({ ...defaultForm })
    setImageFile(null)
  }

  function openNew() {
    setEditing(null)
    resetForm()
    setDialogOpen(true)
  }

  function openEdit(product) {
    setEditing(product)
    setForm({
      title: product.title || '',
      description: product.description || '',
      type: product.type || 'merch',
      creator_base_price: product.creator_base_price ?? product.price ?? '',
      price: product.price ?? '',
      original_price: product.original_price ?? '',
      image_url: product.image_url || '',
      creator_id: product.creator_id || '',
      creator_name: product.creator_name || '',
      stock: product.stock ?? 100,
      cashback_percent: product.cashback_percent ?? 0,
      loyalty_points: product.loyalty_points ?? 0,
      is_limited: Boolean(product.is_limited),
      event_date: product.event_date || '',
      event_location: product.event_location || '',
      status: product.status || 'active',
    })
    setDialogOpen(true)
    setImageFile(null)
  }

  function handleCreatorChange(creatorId) {
    const creator = creators.find((item) => item.id === creatorId)

    setForm({
      ...form,
      creator_id: creatorId,
      creator_name: creator?.name || '',
    })
  }

  async function handleRefresh() {
    setIsRefreshing(true)
    await loadProducts()
  }

  async function handleSave() {
    if (!form.title.trim()) {
      toast.error('Product title is required.')
      return
    }

    setIsSaving(true)
    setError('')

    try {
      const payload = createPayload(form)

      if (editing?.id) {
        if (imageFile) {
          payload.image_url = await Product.uploadImage(
            imageFile,
            form.creator_id || editing.creator_id || editing.id
          )
        }

        await Product.update(editing.id, payload)
        toast.success('Product updated!')
      } else {
        const product = await Product.create(payload)

        if (imageFile) {
          const imageUrl = await Product.uploadImage(
            imageFile,
            product.creator_id || product.id
          )

          await Product.update(product.id, { image_url: imageUrl })
        }

        toast.success('Product added!')
      }

      await loadProducts()
      setDialogOpen(false)
      setEditing(null)
      resetForm()
    } catch (saveError) {
      console.warn(saveError)
      setError(saveError.message || 'Could not save product.')
      toast.error(saveError.message || 'Could not save product.')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete(id) {
    const shouldDelete = window.confirm('Delete this product?')
    if (!shouldDelete) return

    setDeletingId(id)
    setError('')

    try {
      await Product.delete(id)
      await loadProducts()
      toast.success('Product deleted')
    } catch (deleteError) {
      console.warn(deleteError)
      setError(deleteError.message || 'Could not delete product.')
      toast.error(deleteError.message || 'Could not delete product.')
    } finally {
      setDeletingId('')
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="font-heading text-2xl font-bold text-foreground">
          Manage Products
        </h1>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="rounded-xl border-border/50"
          >
            {isRefreshing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Refresh
          </Button>

          <Button onClick={openNew} className="rounded-xl bg-primary">
            <Plus className="mr-2 h-4 w-4" />
            Add Product
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="grid gap-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <Card
              key={index}
              className="h-24 animate-pulse border-border/50 bg-card"
            />
          ))}
        </div>
      ) : (
        <div className="grid gap-3">
          {products.map((product) => (
            <Card
              key={product.id}
              className="flex items-center gap-4 border-border/50 bg-card p-4"
            >
              <img
                src={
                  product.image_url ||
                  'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=100'
                }
                alt={product.title}
                className="h-14 w-14 shrink-0 rounded-lg object-cover"
              />

              <div className="min-w-0 flex-1">
                <p className="truncate font-heading text-sm font-semibold text-foreground">
                  {product.title}
                </p>

                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <Badge className="border-0 bg-primary/10 text-xs capitalize text-primary">
                    {product.type || 'merch'}
                  </Badge>

                  <span className="text-xs text-muted-foreground">
                    {product.creator_name || 'No creator'}
                  </span>

                  <span className="text-xs font-medium text-foreground">
                    {formatNaira(product.fan_price || product.price)}
                  </span>

                  <Badge
                    className={`border-0 text-xs capitalize ${
                      product.status === 'active'
                        ? 'bg-chart-4/20 text-chart-4'
                        : product.status === 'upcoming'
                          ? 'bg-accent/20 text-accent-foreground'
                          : product.status === 'sold_out'
                            ? 'bg-destructive/20 text-destructive'
                            : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {product.status || 'active'}
                  </Badge>
                </div>
              </div>

              <div className="flex shrink-0 gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => openEdit(product)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive"
                  onClick={() => handleDelete(product.id)}
                  disabled={deletingId === product.id}
                >
                  {deletingId === product.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </Card>
          ))}

          {products.length === 0 && (
            <div className="py-12 text-center text-muted-foreground">
              No products yet. Add one!
            </div>
          )}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto border-border bg-card sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading">
              {editing ? 'Edit Product' : 'Add Product'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Title</Label>
              <Input
                value={form.title}
                onChange={(event) =>
                  setForm({ ...form, title: event.target.value })
                }
                className="mt-1 border-border/50 bg-background"
              />
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(event) =>
                  setForm({ ...form, description: event.target.value })
                }
                className="mt-1 border-border/50 bg-background"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Type</Label>
                <Select
                  value={form.type}
                  onValueChange={(value) =>
                    setForm({ ...form, type: value })
                  }
                >
                  <SelectTrigger className="mt-1 border-border/50 bg-background">
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent>
                    {types.map((type) => (
                      <SelectItem
                        key={type}
                        value={type}
                        className="capitalize"
                      >
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Creator</Label>
                <Select
                  value={form.creator_id}
                  onValueChange={handleCreatorChange}
                >
                  <SelectTrigger className="mt-1 border-border/50 bg-background">
                    <SelectValue placeholder="Select creator" />
                  </SelectTrigger>

                  <SelectContent>
                    {creators.map((creator) => (
                      <SelectItem key={creator.id} value={creator.id}>
                        {creator.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Creator Base Price (₦)</Label>
                <Input
                  type="number"
                  value={form.creator_base_price}
                  onChange={(event) =>
                    setForm({ ...form, creator_base_price: event.target.value })
                  }
                  className="mt-1 border-border/50 bg-background"
                />
              </div>

              <div>
                <Label>Original Price (₦)</Label>
                <Input
                  type="number"
                  value={form.original_price}
                  onChange={(event) =>
                    setForm({ ...form, original_price: event.target.value })
                  }
                  className="mt-1 border-border/50 bg-background"
                />
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-background p-4 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Creator base price</span>
                <span>{formatNaira(calculatePlatformPricing(form.creator_base_price).creator_base_price)}</span>
              </div>
              <div className="mt-1 flex justify-between text-muted-foreground">
                <span>FanDirect service fee 5%</span>
                <span>{formatNaira(calculatePlatformPricing(form.creator_base_price).platform_fee_amount)}</span>
              </div>
              <div className="mt-2 flex justify-between border-t border-border pt-2 font-semibold text-foreground">
                <span>Fan price</span>
                <span>{formatNaira(calculatePlatformPricing(form.creator_base_price).fan_price)}</span>
              </div>
            </div>

            <div>
              <Label>Product Image</Label>
              <Input
                value={form.image_url}
                onChange={(event) =>
                  setForm({ ...form, image_url: event.target.value })
                }
                className="mt-1 border-border/50 bg-background"
                placeholder="https://..."
              />
              <label className="mt-2 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted">
                <Upload className="h-3.5 w-3.5" />
                {imageFile ? imageFile.name : 'Upload product image'}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) =>
                    setImageFile(event.target.files?.[0] || null)
                  }
                />
              </label>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Stock</Label>
                <Input
                  type="number"
                  value={form.stock}
                  onChange={(event) =>
                    setForm({ ...form, stock: event.target.value })
                  }
                  className="mt-1 border-border/50 bg-background"
                />
              </div>

              <div>
                <Label>Cashback %</Label>
                <Input
                  type="number"
                  value={form.cashback_percent}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      cashback_percent: event.target.value,
                    })
                  }
                  className="mt-1 border-border/50 bg-background"
                />
              </div>

              <div>
                <Label>Points</Label>
                <Input
                  type="number"
                  value={form.loyalty_points}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      loyalty_points: event.target.value,
                    })
                  }
                  className="mt-1 border-border/50 bg-background"
                />
              </div>
            </div>

            {form.type === 'event' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Event Date</Label>
                  <Input
                    type="datetime-local"
                    value={form.event_date}
                    onChange={(event) =>
                      setForm({ ...form, event_date: event.target.value })
                    }
                    className="mt-1 border-border/50 bg-background"
                  />
                </div>

                <div>
                  <Label>Location</Label>
                  <Input
                    value={form.event_location}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        event_location: event.target.value,
                      })
                    }
                    className="mt-1 border-border/50 bg-background"
                  />
                </div>
              </div>
            )}

            <div>
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(value) =>
                  setForm({ ...form, status: value })
                }
              >
                <SelectTrigger className="mt-1 border-border/50 bg-background">
                  <SelectValue />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="sold_out">Sold Out</SelectItem>
                  <SelectItem value="upcoming">Upcoming</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-3">
              <Switch
                checked={form.is_limited}
                onCheckedChange={(value) =>
                  setForm({ ...form, is_limited: value })
                }
              />
              <Label>Limited Edition</Label>
            </div>

            <Button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="w-full rounded-xl bg-primary"
            >
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? 'Save Changes' : 'Add Product'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
