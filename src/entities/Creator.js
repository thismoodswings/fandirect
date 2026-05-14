import { supabase } from '../lib/supabase';

function firstSelectedRow(data, fallbackMessage) {
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error(fallbackMessage);
  return row;
}

export const Creator = {

  async list(filters = {}) {
    let query = supabase.from('creators').select('*');
    if (filters.status)   query = query.eq('status', filters.status);
    if (filters.category) query = query.eq('category', filters.category);
    if (filters.verified !== undefined) query = query.eq('verified', filters.verified);
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async get(id) {
    const { data, error } = await supabase
      .from('creators').select('*').eq('id', id).limit(1).maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Creator not found.');
    return data;
  },

  async getByUsername(username) {
    const { data, error } = await supabase
      .from('creators').select('*').eq('username', username).limit(1).maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Creator not found.');
    return data;
  },

  toUsername(name) {
    return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  },

  async create(creatorData) {
    const username = creatorData.username || Creator.toUsername(creatorData.name);
    const { data, error } = await supabase
      .from('creators').insert([{ ...creatorData, username }]).select();
    if (error) throw error;
    return firstSelectedRow(data, 'Creator could not be created.');
  },

  async update(id, updates) {
    const { data, error } = await supabase
      .from('creators').update(updates).eq('id', id).select();
    if (error) throw error;

    if (Array.isArray(data) && data.length === 0) {
      const existing = await Creator.get(id).catch(() => null);

      if (existing) {
        throw new Error(
          'Creator update was not applied. Your Supabase policies are allowing reads, but blocking creator updates for this signed-in user.'
        );
      }

      throw new Error('Creator not found.');
    }

    return firstSelectedRow(data, 'Creator not found.');
  },

  async delete(id) {
    const { error } = await supabase.from('creators').delete().eq('id', id);
    if (error) throw error;
    return true;
  },

  async uploadAvatar(file, creatorId) {
    const ext = file.name.split('.').pop();
    const path = `${creatorId}/avatar.${ext}`;
    const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
    if (uploadError) throw uploadError;
    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    return data.publicUrl;
  },

  async uploadCover(file, creatorId) {
    const ext = file.name.split('.').pop();
    const path = `${creatorId}/cover.${ext}`;
    const { error: uploadError } = await supabase.storage.from('covers').upload(path, file, { upsert: true });
    if (uploadError) throw uploadError;
    const { data } = supabase.storage.from('covers').getPublicUrl(path);
    return data.publicUrl;
  },
};
