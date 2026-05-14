import { supabase } from '../lib/supabase';

function firstSelectedRow(data, fallbackMessage) {
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error(fallbackMessage);
  return row;
}

export const SocialFeedPost = {

  // Fetch the global activity feed (paginated)
  async list(filters = {}, { page = 1, limit = 20 } = {}) {
    const from = (page - 1) * limit;
    const to   = from + limit - 1;

    let query = supabase.from('social_feed_posts').select('*', { count: 'exact' });

    if (filters.user_email)  query = query.eq('user_email', filters.user_email);
    if (filters.creator_id)  query = query.eq('creator_id', filters.creator_id);
    if (filters.platform)    query = query.eq('platform', filters.platform);
    if (filters.engagement_type) query = query.eq('engagement_type', filters.engagement_type);

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw error;
    return { posts: data, total: count, page, limit };
  },

  // Get a single post by ID
  async get(id) {
    const { data, error } = await supabase
      .from('social_feed_posts')
      .select('*')
      .eq('id', id)
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Feed post not found.');
    return data;
  },

  // Create a new feed post
  // Typically called automatically when an EngagementSubmission is approved
  async create(postData) {
    const { data, error } = await supabase
      .from('social_feed_posts')
      .insert([postData])
      .select();
    if (error) throw error;
    return firstSelectedRow(data, 'Feed post could not be created.');
  },

  // Like a post — increments like count
  async like(id) {
    const post = await SocialFeedPost.get(id);

    const { data, error } = await supabase
      .from('social_feed_posts')
      .update({ likes: (post.likes || 0) + 1 })
      .eq('id', id)
      .select();
    if (error) throw error;
    return firstSelectedRow(data, 'Feed post not found.');
  },

  // Unlike a post — decrements like count (floor at 0)
  async unlike(id) {
    const post = await SocialFeedPost.get(id);

    const { data, error } = await supabase
      .from('social_feed_posts')
      .update({ likes: Math.max((post.likes || 0) - 1, 0) })
      .eq('id', id)
      .select();
    if (error) throw error;
    return firstSelectedRow(data, 'Feed post not found.');
  },

  // Update a post (e.g. set fdt_earned after approval)
  async update(id, updates) {
    const { data, error } = await supabase
      .from('social_feed_posts')
      .update(updates)
      .eq('id', id)
      .select();
    if (error) throw error;
    return firstSelectedRow(data, 'Feed post not found.');
  },

  // Delete a post (admin moderation)
  async delete(id) {
    const { error } = await supabase
      .from('social_feed_posts')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  },

  // Subscribe to real-time feed updates (for live feed UI)
  subscribeToFeed(callback) {
    return supabase
      .channel('social_feed')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'social_feed_posts' },
        (payload) => callback(payload.new)
      )
      .subscribe();
  },

  // Unsubscribe from real-time feed
  unsubscribe(channel) {
    supabase.removeChannel(channel);
  },
};
