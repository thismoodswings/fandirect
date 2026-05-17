import { supabase } from '../lib/supabase';

// Points threshold required to reach each level
const LEVEL_THRESHOLDS = {
  bronze:   0,
  silver:   500,
  gold:     2000,
  platinum: 5000,
  diamond:  10000,
};

function calculateLevel(totalPoints) {
  if (totalPoints >= LEVEL_THRESHOLDS.diamond)  return 'diamond';
  if (totalPoints >= LEVEL_THRESHOLDS.platinum) return 'platinum';
  if (totalPoints >= LEVEL_THRESHOLDS.gold)     return 'gold';
  if (totalPoints >= LEVEL_THRESHOLDS.silver)   return 'silver';
  return 'bronze';
}

function applyIdentifierFilter(query, identifier) {
  if (String(identifier || '').includes('@')) {
    return query.eq('user_email', identifier);
  }

  return query.eq('id', identifier);
}

function firstSelectedRow(data, fallbackMessage) {
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error(fallbackMessage);
  return row;
}

export const FanPoints = {

  // Fetch all fan points records (for leaderboard etc.)
  async list(filters = {}) {
    let query = supabase.from('fan_points').select('*');

    if (filters.user_email) query = query.eq('user_email', filters.user_email);
    if (filters.level) query = query.eq('level', filters.level);

    const { data, error } = await query.order('total_points', { ascending: false });
    if (error) throw error;
    return data;
  },

  // Backward-compatible Base44-style alias used by older UI flows
  async filter(filters = {}) {
    return FanPoints.list(filters);
  },

  // Get a fan's points record by email
  async getByEmail(userEmail) {
    const { data, error } = await supabase
      .from('fan_points')
      .select('*')
      .eq('user_email', userEmail)
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  // Get or create a fan's points record
  async getOrCreate(userEmail) {
    const existing = await FanPoints.getByEmail(userEmail);
    if (existing) return existing;

    const { data, error } = await supabase
      .from('fan_points')
      .insert([{ user_email: userEmail }])
      .select();
    if (error) throw error;
    return firstSelectedRow(data, 'FanPoints record could not be created.');
  },

  async create(pointsData) {
    const { data, error } = await supabase
      .from('fan_points')
      .insert([pointsData])
      .select();
    if (error) throw error;
    return firstSelectedRow(data, 'FanPoints record could not be created.');
  },

  // Add points to a fan's balance and recalculate level
  async addPoints(userEmail, pointsToAdd) {
    const record = await FanPoints.getOrCreate(userEmail);
    const newTotal = (record.total_points || 0) + pointsToAdd;
    const newLevel = calculateLevel(newTotal);

    const { data, error } = await supabase
      .from('fan_points')
      .update({ total_points: newTotal, level: newLevel })
      .eq('user_email', userEmail)
      .select();
    if (error) throw error;
    return firstSelectedRow(data, 'FanPoints record not found.');
  },

  // Add cashback to a fan's balance
  async addCashback(userEmail, cashbackAmount) {
    const record = await FanPoints.getOrCreate(userEmail);
    const newCashback = (record.total_cashback || 0) + cashbackAmount;

    const { data, error } = await supabase
      .from('fan_points')
      .update({ total_cashback: newCashback })
      .eq('user_email', userEmail)
      .select();
    if (error) throw error;
    return firstSelectedRow(data, 'FanPoints record not found.');
  },

  // Record a purchase — updates total_spent, orders_count, and adds points
  async recordPurchase(userEmail, amountSpent, pointsEarned) {
    const record = await FanPoints.getOrCreate(userEmail);
    const newTotalSpent  = (record.total_spent || 0) + amountSpent;
    const newOrdersCount = (record.orders_count || 0) + 1;
    const newTotalPoints = (record.total_points || 0) + pointsEarned;
    const newLevel = calculateLevel(newTotalPoints);

    const { data, error } = await supabase
      .from('fan_points')
      .update({
        total_spent:   newTotalSpent,
        orders_count:  newOrdersCount,
        total_points:  newTotalPoints,
        level:         newLevel,
      })
      .eq('user_email', userEmail)
      .select();
    if (error) throw error;
    return firstSelectedRow(data, 'FanPoints record not found.');
  },

  // Use a spin — decrements spins_remaining and records the date
  async useSpin(userEmail) {
    const record = await FanPoints.getOrCreate(userEmail);

    if (record.spins_remaining < 1) {
      throw new Error('No spins remaining');
    }

    const { data, error } = await supabase
      .from('fan_points')
      .update({
        spins_remaining: record.spins_remaining - 1,
        last_spin_date:  new Date().toISOString().split('T')[0], // store as date
      })
      .eq('user_email', userEmail)
      .select();
    if (error) throw error;
    return firstSelectedRow(data, 'FanPoints record not found.');
  },

  // Grant a free spin (e.g. daily reset or reward)
  async grantSpin(userEmail, count = 1) {
    const record = await FanPoints.getOrCreate(userEmail);

    const { data, error } = await supabase
      .from('fan_points')
      .update({ spins_remaining: record.spins_remaining + count })
      .eq('user_email', userEmail)
      .select();
    if (error) throw error;
    return firstSelectedRow(data, 'FanPoints record not found.');
  },

  // Direct update (for admin overrides)
  async update(identifier, updates) {
    let query = supabase
      .from('fan_points')
      .update(updates);

    query = applyIdentifierFilter(query, identifier);

    const { data, error } = await query.select();
    if (error) throw error;
    return firstSelectedRow(data, 'FanPoints record not found.');
  },

  // Utility: get points needed to reach next level
  getPointsToNextLevel(totalPoints) {
    const current = calculateLevel(totalPoints);
    const levels  = ['bronze', 'silver', 'gold', 'platinum', 'diamond'];
    const nextIdx = levels.indexOf(current) + 1;
    if (nextIdx >= levels.length) return 0; // already diamond
    return LEVEL_THRESHOLDS[levels[nextIdx]] - totalPoints;
  },

  LEVEL_THRESHOLDS,
  calculateLevel,
};
