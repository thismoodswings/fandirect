import { supabase } from '../lib/supabase';

function firstSelectedRow(data, fallbackMessage) {
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error(fallbackMessage);
  return row;
}

export const CreatorSubscription = {

  // Fetch all subscriptions (with optional filters)
  async list(filters = {}) {
    let query = supabase.from('creator_subscriptions').select('*');

    if (filters.fan_email)  query = query.eq('fan_email', filters.fan_email);
    if (filters.creator_id) query = query.eq('creator_id', filters.creator_id);
    if (filters.status)     query = query.eq('status', filters.status);
    if (filters.tier)       query = query.eq('tier', filters.tier);

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  // Fetch a single subscription by ID
  async get(id) {
    const { data, error } = await supabase
      .from('creator_subscriptions')
      .select('*')
      .eq('id', id)
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Subscription not found.');
    return data;
  },

  // Get a fan's active subscription to a specific creator
  async getByFanAndCreator(fanEmail, creatorId) {
    const { data, error } = await supabase
      .from('creator_subscriptions')
      .select('*')
      .eq('fan_email', fanEmail)
      .eq('creator_id', creatorId)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  // Create a new subscription
  async create(subscriptionData) {
    const { data, error } = await supabase
      .from('creator_subscriptions')
      .insert([subscriptionData])
      .select();
    if (error) throw error;
    return firstSelectedRow(data, 'Subscription could not be created.');
  },

  // Update a subscription (e.g. upgrade tier, extend expiry)
  async update(id, updates) {
    const { data, error } = await supabase
      .from('creator_subscriptions')
      .update(updates)
      .eq('id', id)
      .select();
    if (error) throw error;
    return firstSelectedRow(data, 'Subscription not found.');
  },

  // Cancel a subscription
  async cancel(id) {
    const { data, error } = await supabase
      .from('creator_subscriptions')
      .update({ status: 'cancelled' })
      .eq('id', id)
      .select();
    if (error) throw error;
    return firstSelectedRow(data, 'Subscription not found.');
  },

  // Mark expired subscriptions (call via a scheduled job or on load)
  async expireStale() {
    const { data, error } = await supabase
      .from('creator_subscriptions')
      .update({ status: 'expired' })
      .eq('status', 'active')
      .lt('expires_at', new Date().toISOString())
      .select();
    if (error) throw error;
    return data;
  },

  // Delete a subscription record
  async delete(id) {
    const { error } = await supabase
      .from('creator_subscriptions')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  },
};
