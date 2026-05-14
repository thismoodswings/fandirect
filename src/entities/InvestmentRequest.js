import { supabase } from '../lib/supabase';

function firstSelectedRow(data, fallbackMessage) {
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error(fallbackMessage);
  return row;
}

export const InvestmentRequest = {
  async list(filters = {}) {
    let query = supabase.from('investment_requests').select('*');

    if (filters.user_email) query = query.eq('user_email', filters.user_email);
    if (filters.status) query = query.eq('status', filters.status);

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async create(requestData) {
    const { data, error } = await supabase
      .from('investment_requests')
      .insert([requestData])
      .select();

    if (error) throw error;
    return firstSelectedRow(data, 'Investment request could not be created.');
  },

  async update(id, updates) {
    const { data, error } = await supabase
      .from('investment_requests')
      .update(updates)
      .eq('id', id)
      .select();

    if (error) throw error;
    return firstSelectedRow(data, 'Investment request not found.');
  },
};
