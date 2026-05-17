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
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import {
  Plus,
  Pencil,
  Trash2,
  CheckCircle,
  Users,
  Loader2,
  RefreshCw,
  Upload,
} from 'lucide-react'
import { toast } from 'sonner'
import { Creator } from '@/entities'

const categories = [
  'music',
  'lifestyle',
  'dance',
  'fitness',
  'comedy',
  'sports',
  'other',
]

const emptyForm = {
  name: '',
  category: 'music',
  bio: '',
  avatar_url: '',
  cover_url: '',
  verified: false,
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

export default function ManageCreators() {
  const [creators, setCreators] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [deletingId, setDeletingId] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [avatarFile, setAvatarFile] = useState(null)
  const [coverFile, setCoverFile] = useState(null)
  const [error, setError] = useState('')

  async function loadCreators() {
    setError('')

    try {
      const rows = await Creator.list()
      setCreators(sortNewestFirst(rows || []).slice(0, 100))
    } catch (loadError) {
      console.warn(loadError)
      setError(loadError.message || 'Could not load creators.')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    loadCreators()
  }, [])

  function resetForm() {
    setForm(emptyForm)
    setAvatarFile(null)
    setCoverFile(null)
  }

  function openEdit(creator) {
    setEditing(creator)
    setForm({
      name: creator.name || '',
      category: creator.category || 'music',
      bio: creator.bio || '',
      avatar_url: creator.avatar_url || '',
      cover_url: creator.cover_url || '',
      verified: Boolean(creator.verified),
      status: creator.status || 'active',
    })
    setDialogOpen(true)
    setAvatarFile(null)
    setCoverFile(null)
  }

  function openNew() {
    setEditing(null)
    resetForm()
    setDialogOpen(true)
  }

  async function handleRefresh() {
    setIsRefreshing(true)
    await loadCreators()
  }

  async function handleSave() {
    if (!form.name.trim()) {
      toast.error('Creator name is required.')
      return
    }

    setIsSaving(true)
    setError('')

    try {
      const payload = {
        name: form.name.trim(),
        category: form.category,
        bio: form.bio,
        avatar_url: form.avatar_url,
        cover_url: form.cover_url,
        verified: Boolean(form.verified),
        status: form.status,
      }

      if (editing?.id) {
        if (avatarFile) {
          payload.avatar_url = await Creator.uploadAvatar(avatarFile, editing.id)
        }

        if (coverFile) {
          payload.cover_url = await Creator.uploadCover(coverFile, editing.id)
        }

        await Creator.update(editing.id, payload)
        toast.success('Creator updated!')
      } else {
        const creator = await Creator.create(payload)
        const uploaded = {}

        if (avatarFile) {
          uploaded.avatar_url = await Creator.uploadAvatar(avatarFile, creator.id)
        }

        if (coverFile) {
          uploaded.cover_url = await Creator.uploadCover(coverFile, creator.id)
        }

        if (Object.keys(uploaded).length > 0) {
          await Creator.update(creator.id, uploaded)
        }

        toast.success('Creator added!')
      }

      await loadCreators()
      setDialogOpen(false)
      setEditing(null)
      resetForm()
    } catch (saveError) {
      console.warn(saveError)
      setError(saveError.message || 'Could not save creator.')
      toast.error(saveError.message || 'Could not save creator.')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete(id) {
    const shouldDelete = window.confirm('Delete this creator?')
    if (!shouldDelete) return

    setDeletingId(id)
    setError('')

    try {
      await Creator.delete(id)
      await loadCreators()
      toast.success('Creator deleted')
    } catch (deleteError) {
      console.warn(deleteError)
      setError(deleteError.message || 'Could not delete creator.')
      toast.error(deleteError.message || 'Could not delete creator.')
    } finally {
      setDeletingId('')
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="font-heading text-2xl font-bold text-foreground">
          Manage Creators
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
            Add Creator
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="grid gap-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card
              key={index}
              className="h-24 animate-pulse border-border/50 bg-card"
            />
          ))}
        </div>
      ) : (
        <div className="grid gap-4">
          {creators.map((creator) => (
            <Card
              key={creator.id}
              className="flex items-center gap-4 border-border/50 bg-card p-4"
            >
              <img
                src={
                  creator.avatar_url ||
                  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'
                }
                alt={creator.name}
                className="h-12 w-12 shrink-0 rounded-full object-cover"
              />

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate font-heading font-semibold text-foreground">
                    {creator.name}
                  </p>

                  {creator.verified && (
                    <CheckCircle className="h-4 w-4 shrink-0 text-primary" />
                  )}
                </div>

                <div className="mt-0.5 flex flex-wrap items-center gap-2">
                  <Badge className="border-0 bg-primary/10 text-xs capitalize text-primary">
                    {creator.category || 'music'}
                  </Badge>

                  <Badge
                    className={`border-0 text-xs capitalize ${
                      creator.status === 'active'
                        ? 'bg-chart-4/20 text-chart-4'
                        : creator.status === 'pending'
                          ? 'bg-accent/20 text-accent-foreground'
                          : 'bg-destructive/20 text-destructive'
                    }`}
                  >
                    {creator.status || 'active'}
                  </Badge>

                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Users className="h-3 w-3" />
                    {(creator.fan_count || 0).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="flex shrink-0 gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => openEdit(creator)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive"
                  onClick={() => handleDelete(creator.id)}
                  disabled={deletingId === creator.id}
                >
                  {deletingId === creator.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </Card>
          ))}

          {creators.length === 0 && (
            <div className="py-12 text-center text-muted-foreground">
              No creators yet. Add one!
            </div>
          )}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="border-border bg-card sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading">
              {editing ? 'Edit Creator' : 'Add Creator'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(event) =>
                  setForm({ ...form, name: event.target.value })
                }
                className="mt-1 border-border/50 bg-background"
              />
            </div>

            <div>
              <Label>Category</Label>
              <Select
                value={form.category}
                onValueChange={(value) =>
                  setForm({ ...form, category: value })
                }
              >
                <SelectTrigger className="mt-1 border-border/50 bg-background">
                  <SelectValue />
                </SelectTrigger>

                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem
                      key={category}
                      value={category}
                      className="capitalize"
                    >
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Bio</Label>
              <Textarea
                value={form.bio}
                onChange={(event) =>
                  setForm({ ...form, bio: event.target.value })
                }
                className="mt-1 border-border/50 bg-background"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Avatar</Label>
                <Input
                  value={form.avatar_url}
                  onChange={(event) =>
                    setForm({ ...form, avatar_url: event.target.value })
                  }
                  className="mt-1 border-border/50 bg-background"
                  placeholder="https://..."
                />
                <label className="mt-2 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted">
                  <Upload className="h-3.5 w-3.5" />
                  {avatarFile ? avatarFile.name : 'Upload avatar'}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) =>
                      setAvatarFile(event.target.files?.[0] || null)
                    }
                  />
                </label>
              </div>

              <div>
                <Label>Cover</Label>
                <Input
                  value={form.cover_url}
                  onChange={(event) =>
                    setForm({ ...form, cover_url: event.target.value })
                  }
                  className="mt-1 border-border/50 bg-background"
                  placeholder="https://..."
                />
                <label className="mt-2 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted">
                  <Upload className="h-3.5 w-3.5" />
                  {coverFile ? coverFile.name : 'Upload cover'}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) =>
                      setCoverFile(event.target.files?.[0] || null)
                    }
                  />
                </label>
              </div>
            </div>

            <div>
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(value) => setForm({ ...form, status: value })}
              >
                <SelectTrigger className="mt-1 border-border/50 bg-background">
                  <SelectValue />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-3">
              <Switch
                checked={form.verified}
                onCheckedChange={(value) =>
                  setForm({ ...form, verified: value })
                }
              />
              <Label>Verified</Label>
            </div>

            <Button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="w-full rounded-xl bg-primary"
            >
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? 'Save Changes' : 'Add Creator'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
