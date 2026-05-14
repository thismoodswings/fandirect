import { supabase } from '../lib/supabase';

// Tier hierarchy for access control checks
const TIER_RANK = { free: 0, supporter: 1, superfan: 2 };

function firstSelectedRow(data, fallbackMessage) {
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error(fallbackMessage);
  return row;
}

export const MediaDrop = {

  // Fetch published drops (with optional filters)
  async list(filters = {}) {
    let query = supabase
      .from('media_drops')
      .select('*')
      .eq('status', 'published');

    if (filters.creator_id)  query = query.eq('creator_id', filters.creator_id);
    if (filters.media_type)  query = query.eq('media_type', filters.media_type);
    if (filters.access_tier) query = query.eq('access_tier', filters.access_tier);

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  // Fetch all drops including drafts/scheduled (for creator dashboard)
  async listAll(creatorId) {
    const { data, error } = await supabase
      .from('media_drops')
      .select('*')
      .eq('creator_id', creatorId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  // Get a single drop by ID
  async get(id) {
    const { data, error } = await supabase
      .from('media_drops')
      .select('*')
      .eq('id', id)
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Media drop not found.');
    return data;
  },

  // Create a new media drop
  async create(dropData) {
    const { data, error } = await supabase
      .from('media_drops')
      .insert([dropData])
      .select();
    if (error) throw error;
    return firstSelectedRow(data, 'Media drop could not be created.');
  },

  // Update a media drop
  async update(id, updates) {
    const { data, error } = await supabase
      .from('media_drops')
      .update(updates)
      .eq('id', id)
      .select();
    if (error) throw error;
    return firstSelectedRow(data, 'Media drop not found.');
  },

  // Delete a media drop
  async delete(id) {
    const { error } = await supabase
      .from('media_drops')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  },

  // Increment play count and return FDT reward amount
  async recordPlay(id) {
    const drop = await MediaDrop.get(id);

    const { data, error } = await supabase
      .from('media_drops')
      .update({ play_count: (drop.play_count || 0) + 1 })
      .eq('id', id)
      .select();
    if (error) throw error;

    // Return the fdt_reward so the caller can credit the fan's wallet
    return {
      drop: firstSelectedRow(data, 'Media drop not found.'),
      fdtReward: drop.fdt_reward || 0,
    };
  },

  // Check if a fan's subscription tier grants access to a drop
  canAccess(fanTier, dropAccessTier) {
    const fanRank  = TIER_RANK[fanTier]  ?? 0;
    const dropRank = TIER_RANK[dropAccessTier] ?? 0;
    return fanRank >= dropRank;
  },

  // Upload media file to Supabase Storage (private bucket)
  async uploadMedia(file, creatorId) {
    const ext  = file.name.split('.').pop();
    const path = `${creatorId}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('media-drops')
      .upload(path, file);

    if (uploadError) throw uploadError;

    // Return a signed URL valid for 1 hour — regenerate on each play request
    const { data, error: urlError } = await supabase.storage
      .from('media-drops')
      .createSignedUrl(path, 3600);

    if (urlError) throw urlError;
    return { path, signedUrl: data.signedUrl };
  },

  // Generate a fresh signed URL for a private media file
  async getSignedUrl(storagePath, expiresInSeconds = 3600) {
    const { data, error } = await supabase.storage
      .from('media-drops')
      .createSignedUrl(storagePath, expiresInSeconds);
    if (error) throw error;
    return data.signedUrl;
  },

  // Upload thumbnail to public bucket
  async uploadThumbnail(file, creatorId) {
    const ext  = file.name.split('.').pop();
    const path = `${creatorId}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('media-thumbnails')
      .upload(path, file, { upsert: true });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('media-thumbnails')
      .getPublicUrl(path);

    return data.publicUrl;
  },

  TIER_RANK,
};
