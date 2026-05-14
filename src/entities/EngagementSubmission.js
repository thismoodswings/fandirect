import { supabase } from '../lib/supabase';

function firstSelectedRow(data, fallbackMessage) {
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error(fallbackMessage);
  return row;
}

export const EngagementSubmission = {

  // Fetch all submissions (with optional filters)
  async list(filters = {}) {
    let query = supabase.from('engagement_submissions').select('*');

    if (filters.user_email)      query = query.eq('user_email', filters.user_email);
    if (filters.creator_id)      query = query.eq('creator_id', filters.creator_id);
    if (filters.status)          query = query.eq('status', filters.status);
    if (filters.platform)        query = query.eq('platform', filters.platform);
    if (filters.engagement_type) query = query.eq('engagement_type', filters.engagement_type);

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  // Fetch a single submission by ID
  async get(id) {
    const { data, error } = await supabase
      .from('engagement_submissions')
      .select('*')
      .eq('id', id)
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Engagement submission not found.');
    return data;
  },

  // Create a new submission
  async create(submissionData) {
    const { data, error } = await supabase
      .from('engagement_submissions')
      .insert([{ ...submissionData, status: 'pending', fdt_awarded: 0 }])
      .select();
    if (error) throw error;
    return firstSelectedRow(data, 'Engagement submission could not be created.');
  },

  // Approve a submission and award FDT tokens
  async approve(id, fdtAmount) {
    const { data, error } = await supabase
      .from('engagement_submissions')
      .update({
        status: 'approved',
        fdt_awarded: fdtAmount,
      })
      .eq('id', id)
      .select();
    if (error) throw error;
    return firstSelectedRow(data, 'Engagement submission not found.');
  },

  // Reject a submission with an optional reason
  async reject(id, reason = '') {
    const { data, error } = await supabase
      .from('engagement_submissions')
      .update({
        status: 'rejected',
        notes: reason,
        fdt_awarded: 0,
      })
      .eq('id', id)
      .select();
    if (error) throw error;
    return firstSelectedRow(data, 'Engagement submission not found.');
  },

  // Update notes/admin feedback on a submission
  async update(id, updates) {
    const { data, error } = await supabase
      .from('engagement_submissions')
      .update(updates)
      .eq('id', id)
      .select();
    if (error) throw error;
    return firstSelectedRow(data, 'Engagement submission not found.');
  },

  // Delete a submission
  async delete(id) {
    const { error } = await supabase
      .from('engagement_submissions')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  },

  // Get total FDT tokens earned by a user
  async getTotalFDTForUser(userEmail) {
    const { data, error } = await supabase
      .from('engagement_submissions')
      .select('fdt_awarded')
      .eq('user_email', userEmail)
      .eq('status', 'approved');
    if (error) throw error;
    return data.reduce((sum, row) => sum + (row.fdt_awarded || 0), 0);
  },

  // Upload proof screenshot to Supabase Storage
  async uploadProof(file, submissionId) {
    const ext = file.name.split('.').pop();
    const path = `${submissionId}/proof.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('engagement-proofs')
      .upload(path, file, { upsert: true });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('engagement-proofs')
      .getPublicUrl(path);

    return data.publicUrl;
  },
};
