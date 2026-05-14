import { supabase } from '../lib/supabase';

function firstSelectedRow(data, fallbackMessage) {
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error(fallbackMessage);
  return row;
}

export const Investor = {

  async list() {
    const { data, error } = await supabase
      .from('investors')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async get(id) {
    const { data, error } = await supabase
      .from('investors')
      .select('*')
      .eq('id', id)
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Investor not found.');
    return data;
  },

  async getByEmail(userEmail) {
    const { data, error } = await supabase
      .from('investors')
      .select('*')
      .eq('user_email', userEmail)
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async create(investorData) {
    const { data, error } = await supabase
      .from('investors')
      .insert([investorData])
      .select();
    if (error) throw error;

    if (Array.isArray(data) && data.length === 0) {
      throw new Error(
        'Investor was not added. Supabase accepted the request but returned no row; check the investors insert RLS policy for your admin user.'
      );
    }

    return firstSelectedRow(data, 'Investor could not be created.');
  },

  async update(id, updates) {
    const { data, error } = await supabase
      .from('investors')
      .update(updates)
      .eq('id', id)
      .select();
    if (error) throw error;

    if (Array.isArray(data) && data.length === 0) {
      const existing = await Investor.get(id).catch(() => null);

      if (existing) {
        throw new Error(
          'Investor update was not applied. Supabase policies are allowing reads, but blocking investor updates for this signed-in admin.'
        );
      }

      throw new Error('Investor not found.');
    }

    return firstSelectedRow(data, 'Investor not found.');
  },

  async delete(id) {
    const { error } = await supabase.from('investors').delete().eq('id', id);
    if (error) throw error;
    return true;
  },

  // Calculate investor's share of a given amount
  calculateShare(amount, equityPercent) {
    return (amount * equityPercent) / 100;
  },
};
