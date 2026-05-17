import { supabase } from '../lib/supabase'
import { FanToken } from './FanToken'

const STORAGE_KEY = 'fandirect_item_interactions'
const REWARDS = {
  like: 1,
  wishlist: 2,
  share: 5,
  view: 0,
  play: 3,
}

function isBrowser() {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined'
}

function getLocalRows() {
  if (!isBrowser()) return []

  try {
    const rows = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    return Array.isArray(rows) ? rows : []
  } catch {
    return []
  }
}

function saveLocalRows(rows) {
  if (!isBrowser()) return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.isArray(rows) ? rows : []))
}

function makeId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `local-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function normalizeTarget({ target_type = 'product', target_id, product_id, media_drop_id }) {
  const inferredType = media_drop_id ? 'media_drop' : target_type || 'product'
  const inferredId = target_id || product_id || media_drop_id

  return {
    target_type: inferredType,
    target_id: inferredId,
  }
}

function matches(row, filters = {}) {
  const target = normalizeTarget(filters)

  if (target.target_id && row.target_id !== target.target_id) return false
  if (target.target_type && row.target_type !== target.target_type) return false
  if (filters.user_email && String(row.user_email || '').toLowerCase() !== String(filters.user_email).toLowerCase()) return false
  if (filters.interaction_type && row.interaction_type !== filters.interaction_type) return false

  return true
}

async function safelyCredit(userEmail, amount) {
  const rewardAmount = Number(amount || 0)
  if (!userEmail || userEmail === 'anonymous' || rewardAmount <= 0) return

  try {
    await FanToken.credit(userEmail, rewardAmount)
  } catch (error) {
    console.warn('FDT reward could not be credited:', error)
  }
}

async function updateTargetCounters(targetType, targetId, summary) {
  const table = targetType === 'media_drop' ? 'media_drops' : 'products'

  try {
    await supabase
      .from(table)
      .update({
        like_count: summary.likes,
        wishlist_count: summary.wishlists,
        share_count: summary.shares,
        view_count: summary.views,
      })
      .eq('id', targetId)
  } catch (error) {
    console.warn('Counters could not be updated:', error)
  }
}

export const ProductInteraction = {
  async list(filters = {}) {
    const target = normalizeTarget(filters)

    try {
      let query = supabase.from('item_interactions').select('*')

      if (target.target_type) query = query.eq('target_type', target.target_type)
      if (target.target_id) query = query.eq('target_id', target.target_id)
      if (filters.user_email) query = query.eq('user_email', filters.user_email)
      if (filters.interaction_type) query = query.eq('interaction_type', filters.interaction_type)

      const { data, error } = await query.order('created_at', { ascending: false })
      if (error) throw error
      return data || []
    } catch (error) {
      console.warn('Using local interaction fallback:', error)
      return getLocalRows().filter((row) => matches(row, filters))
    }
  },

  async getSummary(target_type, target_id) {
    if (!target_id) {
      return { likes: 0, wishlists: 0, shares: 0, views: 0 }
    }

    try {
      const table = target_type === 'media_drop' ? 'media_drops' : 'products'
      const { data, error } = await supabase
        .from(table)
        .select('like_count,wishlist_count,share_count,view_count')
        .eq('id', target_id)
        .limit(1)
        .maybeSingle()

      if (error) throw error

      if (data) {
        return {
          likes: Number(data.like_count || 0),
          wishlists: Number(data.wishlist_count || 0),
          shares: Number(data.share_count || 0),
          views: Number(data.view_count || 0),
        }
      }
    } catch (error) {
      console.warn('Counter columns unavailable, counting interactions instead:', error)
    }

    const rows = await ProductInteraction.list({ target_type, target_id })
    return ProductInteraction.summarize(rows)
  },

  summarize(rows = []) {
    return {
      likes: rows.filter((row) => row.interaction_type === 'like').length,
      wishlists: rows.filter((row) => row.interaction_type === 'wishlist').length,
      shares: rows.filter((row) => row.interaction_type === 'share').length,
      views: rows.filter((row) => row.interaction_type === 'view').length,
    }
  },

  async getUserState({ target_type = 'product', target_id, user_email }) {
    if (!user_email || !target_id) {
      return { liked: false, wishlisted: false }
    }

    const rows = await ProductInteraction.list({ target_type, target_id, user_email })

    return {
      liked: rows.some((row) => row.interaction_type === 'like'),
      wishlisted: rows.some((row) => row.interaction_type === 'wishlist'),
    }
  },

  async record(interaction = {}) {
    const target = normalizeTarget(interaction)
    if (!target.target_id) throw new Error('Interaction target is required.')

    const payload = {
      target_type: target.target_type,
      target_id: target.target_id,
      user_email: interaction.user_email || 'anonymous',
      interaction_type: interaction.interaction_type || 'view',
      share_platform: interaction.share_platform || null,
      points_awarded: Number(interaction.points_awarded ?? REWARDS[interaction.interaction_type] ?? 0),
      metadata: interaction.metadata || {},
    }

    const isToggleType = ['like', 'wishlist'].includes(payload.interaction_type)

    try {
      if (isToggleType && payload.user_email !== 'anonymous') {
        const existing = await ProductInteraction.list({
          target_type: payload.target_type,
          target_id: payload.target_id,
          user_email: payload.user_email,
          interaction_type: payload.interaction_type,
        })

        if (existing.length > 0) return existing[0]
      }

      const { data, error } = await supabase
        .from('item_interactions')
        .insert([payload])
        .select()

      if (error) throw error

      const row = Array.isArray(data) ? data[0] : data
      await safelyCredit(payload.user_email, payload.points_awarded)
      return row || payload
    } catch (error) {
      console.warn('Saving interaction locally:', error)

      const rows = getLocalRows()
      const existing = rows.find((row) =>
        row.target_type === payload.target_type &&
        row.target_id === payload.target_id &&
        row.user_email === payload.user_email &&
        row.interaction_type === payload.interaction_type &&
        isToggleType
      )

      if (existing) return existing

      const row = {
        id: makeId(),
        ...payload,
        created_at: new Date().toISOString(),
      }

      rows.unshift(row)
      saveLocalRows(rows)
      return row
    }
  },

  async remove({ target_type = 'product', target_id, user_email, interaction_type }) {
    if (!target_id || !user_email || !interaction_type) return true

    try {
      const { error } = await supabase
        .from('item_interactions')
        .delete()
        .eq('target_type', target_type)
        .eq('target_id', target_id)
        .eq('user_email', user_email)
        .eq('interaction_type', interaction_type)

      if (error) throw error
      return true
    } catch (error) {
      console.warn('Removing local interaction fallback:', error)
      const rows = getLocalRows().filter((row) =>
        !(row.target_type === target_type &&
          row.target_id === target_id &&
          row.user_email === user_email &&
          row.interaction_type === interaction_type)
      )
      saveLocalRows(rows)
      return true
    }
  },

  async toggle({ target_type = 'product', target_id, user_email, interaction_type }) {
    if (!user_email) throw new Error('Please log in first.')

    const state = await ProductInteraction.getUserState({ target_type, target_id, user_email })
    const current = interaction_type === 'wishlist' ? state.wishlisted : state.liked

    if (current) {
      await ProductInteraction.remove({ target_type, target_id, user_email, interaction_type })
      const summary = await ProductInteraction.getSummary(target_type, target_id)
      return { active: false, summary }
    }

    await ProductInteraction.record({ target_type, target_id, user_email, interaction_type })
    const summary = await ProductInteraction.getSummary(target_type, target_id)
    return { active: true, summary }
  },

  async recordShare({ target_type = 'product', target_id, user_email, platform }) {
    await ProductInteraction.record({
      target_type,
      target_id,
      user_email,
      interaction_type: 'share',
      share_platform: platform || 'copy',
    })

    return ProductInteraction.getSummary(target_type, target_id)
  },
}
