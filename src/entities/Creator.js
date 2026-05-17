import { supabase } from '../lib/supabase'

function firstSelectedRow(data, fallbackMessage) {
  const row = Array.isArray(data) ? data[0] : data
  if (!row) throw new Error(fallbackMessage)
  return row
}

function cleanUsername(value = '') {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/^@+/, '')
    .replace(/\s+/g, '.')
    .replace(/[^a-z0-9._]/g, '')
    .slice(0, 30)
}

function publicSlug(value = '') {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/^@+/, '')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '')
}

function creatorMatchesSlug(creator, slug) {
  const target = publicSlug(slug)
  if (!target) return false

  return [
    creator?.id,
    creator?.username,
    creator?.name,
    creator?.display_name,
    creator?.full_name,
    creator?.slug,
    creator?.handle,
  ].some((value) => publicSlug(value) === target)
}

async function getCurrentUser() {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return user || null
}

export const Creator = {
  async list(filters = {}) {
    let query = supabase.from('creators').select('*')
    if (filters.status) query = query.eq('status', filters.status)
    if (filters.category) query = query.eq('category', filters.category)
    if (filters.verified !== undefined) query = query.eq('verified', filters.verified)
    const { data, error } = await query.order('created_at', { ascending: false })
    if (error) throw error
    return data
  },

  async get(id) {
    const { data, error } = await supabase
      .from('creators')
      .select('*')
      .eq('id', id)
      .limit(1)
      .maybeSingle()
    if (error) throw error
    if (!data) throw new Error('Creator not found.')
    return data
  },

  async getMine() {
    const user = await getCurrentUser()
    if (!user?.id && !user?.email) return null

    if (user?.id) {
      const { data, error } = await supabase
        .from('creators')
        .select('*')
        .eq('owner_user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error && error.code !== 'PGRST116') throw error
      if (data) return data
    }

    if (user?.email) {
      const { data, error } = await supabase
        .from('creators')
        .select('*')
        .eq('owner_email', user.email)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error && error.code !== 'PGRST116') throw error
      if (data) return data
    }

    return null
  },

  async getByUsername(username) {
    const cleanedUsername = cleanUsername(username)

    const { data, error } = await supabase
      .from('creators')
      .select('*')
      .eq('username', cleanedUsername)
      .limit(1)
      .maybeSingle()

    if (error) throw error
    if (data) return data

    // Older seeded profiles were sometimes linked by name/display name instead of username.
    // Keep the public profile route resilient so /creator/terryg and /creator/terry-g both resolve.
    const { data: activeCreators, error: listError } = await supabase
      .from('creators')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false })

    if (listError) throw listError

    const matchedCreator = (activeCreators || []).find((creator) =>
      creatorMatchesSlug(creator, username) || creatorMatchesSlug(creator, cleanedUsername)
    )

    if (!matchedCreator) throw new Error('Creator not found.')
    return matchedCreator
  },

  toUsername(name) {
    return cleanUsername(name)
  },

  async create(creatorData) {
    const user = await getCurrentUser()
    const username = cleanUsername(
      creatorData.username || creatorData.display_name || creatorData.name || user?.email?.split('@')[0]
    )

    const displayName = creatorData.display_name || creatorData.name || creatorData.full_name || username

    const payload = {
      ...creatorData,
      name: creatorData.name || displayName,
      display_name: displayName,
      username,
      owner_user_id: creatorData.owner_user_id || user?.id || null,
      owner_email: creatorData.owner_email || user?.email || '',
      status: creatorData.status || 'pending_review',
      verification_status: creatorData.verification_status || 'not_started',
      onboarding_status: creatorData.onboarding_status || 'profile_started',
      payout_status: creatorData.payout_status || 'not_started',
      verified: Boolean(creatorData.verified),
    }

    const { data, error } = await supabase.from('creators').insert([payload]).select()
    if (error) throw error
    return firstSelectedRow(data, 'Creator could not be created.')
  },

  async update(id, updates) {
    const payload = { ...updates }
    if (payload.username) payload.username = cleanUsername(payload.username)

    const { data, error } = await supabase
      .from('creators')
      .update(payload)
      .eq('id', id)
      .select()
    if (error) throw error

    if (Array.isArray(data) && data.length === 0) {
      const existing = await Creator.get(id).catch(() => null)

      if (existing) {
        throw new Error(
          'Creator update was not applied. Check creator ownership or profile permissions for this account.'
        )
      }

      throw new Error('Creator not found.')
    }

    return firstSelectedRow(data, 'Creator not found.')
  },

  async delete(id) {
    const { error } = await supabase.from('creators').delete().eq('id', id)
    if (error) throw error
    return true
  },

  async uploadAvatar(file, creatorId) {
    const ext = file.name.split('.').pop()
    const path = `${creatorId}/avatar-${Date.now()}.${ext}`
    const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
    if (uploadError) throw uploadError
    const { data } = supabase.storage.from('avatars').getPublicUrl(path)
    return data.publicUrl
  },

  async uploadCover(file, creatorId) {
    const ext = file.name.split('.').pop()
    const path = `${creatorId}/cover-${Date.now()}.${ext}`
    const { error: uploadError } = await supabase.storage.from('covers').upload(path, file, { upsert: true })
    if (uploadError) throw uploadError
    const { data } = supabase.storage.from('covers').getPublicUrl(path)
    return data.publicUrl
  },
}
