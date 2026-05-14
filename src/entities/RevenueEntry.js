import { supabase } from '../lib/supabase';

function firstSelectedRow(data, fallbackMessage) {
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error(fallbackMessage);
  return row;
}

export const RevenueEntry = {

  async list(filters = {}) {
    let query = supabase.from('revenue_entries').select('*');
    if (filters.source)    query = query.eq('source', filters.source);
    if (filters.date_from) query = query.gte('date', filters.date_from);
    if (filters.date_to)   query = query.lte('date', filters.date_to);
    const { data, error } = await query.order('date', { ascending: false });
    if (error) throw error;
    return data;
  },

  async get(id) {
    const { data, error } = await supabase
      .from('revenue_entries')
      .select('*')
      .eq('id', id)
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Revenue entry not found.');
    return data;
  },

  async create(entryData) {
    const { data, error } = await supabase
      .from('revenue_entries')
      .insert([entryData])
      .select();
    if (error) throw error;
    return firstSelectedRow(data, 'Revenue entry could not be created.');
  },

  async update(id, updates) {
    const { data, error } = await supabase
      .from('revenue_entries')
      .update(updates)
      .eq('id', id)
      .select();
    if (error) throw error;
    return firstSelectedRow(data, 'Revenue entry not found.');
  },

  async delete(id) {
    const { error } = await supabase.from('revenue_entries').delete().eq('id', id);
    if (error) throw error;
    return true;
  },

  // Get totals for a date range
  async getTotals(dateFrom, dateTo) {
    let query = supabase.from('revenue_entries').select('revenue_naira, profit_naira');
    if (dateFrom) query = query.gte('date', dateFrom);
    if (dateTo)   query = query.lte('date', dateTo);
    const { data, error } = await query;
    if (error) throw error;
    return {
      totalRevenue: data.reduce((sum, r) => sum + (r.revenue_naira || 0), 0),
      totalProfit:  data.reduce((sum, r) => sum + (r.profit_naira  || 0), 0),
    };
  },
};
