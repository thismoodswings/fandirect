import { supabase } from '../lib/supabase';

// Streak bonus multipliers — reward consistent engagement
const STREAK_BONUSES = {
  3:  1.1,  // 3-day streak  → 10% bonus
  7:  1.25, // 7-day streak  → 25% bonus
  14: 1.5,  // 14-day streak → 50% bonus
  30: 2.0,  // 30-day streak → 100% bonus
};

function getStreakMultiplier(streak) {
  if (streak >= 30) return STREAK_BONUSES[30];
  if (streak >= 14) return STREAK_BONUSES[14];
  if (streak >= 7)  return STREAK_BONUSES[7];
  if (streak >= 3)  return STREAK_BONUSES[3];
  return 1.0;
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

export const FanToken = {

  // Fetch all wallets (for leaderboard / admin)
  async list(filters = {}) {
    let query = supabase.from('fan_tokens').select('*');

    if (filters.user_email) query = query.eq('user_email', filters.user_email);

    const { data, error } = await query.order('balance', { ascending: false });
    if (error) throw error;
    return data;
  },

  // Get a fan's wallet by email
  async getByEmail(userEmail) {
    const { data, error } = await supabase
      .from('fan_tokens')
      .select('*')
      .eq('user_email', userEmail)
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  // Get or create a wallet for a fan
  async getOrCreate(userEmail) {
    const existing = await FanToken.getByEmail(userEmail);
    if (existing) return existing;

    const { data, error } = await supabase
      .from('fan_tokens')
      .insert([{ user_email: userEmail }])
      .select();
    if (error) throw error;
    return firstSelectedRow(data, 'FanToken wallet could not be created.');
  },

  async create(walletData) {
    const { data, error } = await supabase
      .from('fan_tokens')
      .insert([walletData])
      .select();
    if (error) throw error;
    return firstSelectedRow(data, 'FanToken wallet could not be created.');
  },

  // Award FDT after an engagement submission is approved
  // Handles streak calculation and platform breakdown update
  async awardFromEngagement(userEmail, baseAmount, platform) {
    const wallet = await FanToken.getOrCreate(userEmail);

    const today = new Date().toISOString().split('T')[0];
    const lastDate = wallet.last_submission_date;

    // Calculate new streak
    let newStreak = wallet.mining_streak || 0;
    if (lastDate) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      if (lastDate === yesterdayStr) {
        newStreak += 1; // consecutive day
      } else if (lastDate !== today) {
        newStreak = 1;  // streak broken, reset
      }
      // if lastDate === today, keep streak as-is (already submitted today)
    } else {
      newStreak = 1;
    }

    // Apply streak multiplier to base FDT amount
    const multiplier  = getStreakMultiplier(newStreak);
    const finalAmount = Math.round(baseAmount * multiplier);

    // Update platform breakdown
    const breakdown = { ...(wallet.platform_breakdown || {}) };
    breakdown[platform] = (breakdown[platform] || 0) + finalAmount;

    const { data, error } = await supabase
      .from('fan_tokens')
      .update({
        balance:               (wallet.balance || 0) + finalAmount,
        total_mined:           (wallet.total_mined || 0) + finalAmount,
        mining_streak:         newStreak,
        last_submission_date:  today,
        platform_breakdown:    breakdown,
      })
      .eq('user_email', userEmail)
      .select();
    if (error) throw error;
    return {
      wallet: firstSelectedRow(data, 'FanToken wallet not found.'),
      awarded: finalAmount,
      multiplier,
    };
  },

  // Spend FDT tokens (purchase, redemption, etc.)
  async spend(userEmail, amount) {
    const wallet = await FanToken.getOrCreate(userEmail);

    if ((wallet.balance || 0) < amount) {
      throw new Error(`Insufficient FDT balance. Have ${wallet.balance}, need ${amount}`);
    }

    const { data, error } = await supabase
      .from('fan_tokens')
      .update({
        balance:      wallet.balance - amount,
        total_spent:  (wallet.total_spent || 0) + amount,
      })
      .eq('user_email', userEmail)
      .select();
    if (error) throw error;
    return firstSelectedRow(data, 'FanToken wallet not found.');
  },

  // Manually credit FDT (admin grants, bonuses, etc.)
  async credit(userEmail, amount) {
    const wallet = await FanToken.getOrCreate(userEmail);

    const { data, error } = await supabase
      .from('fan_tokens')
      .update({
        balance:     (wallet.balance || 0) + amount,
        total_mined: (wallet.total_mined || 0) + amount,
      })
      .eq('user_email', userEmail)
      .select();
    if (error) throw error;
    return firstSelectedRow(data, 'FanToken wallet not found.');
  },

  // Direct update (admin override)
  async update(identifier, updates) {
    let query = supabase
      .from('fan_tokens')
      .update(updates);

    query = applyIdentifierFilter(query, identifier);

    const { data, error } = await query.select();
    if (error) throw error;
    return firstSelectedRow(data, 'FanToken wallet not found.');
  },

  // Utility: get streak multiplier info for display
  getStreakInfo(streak) {
    return {
      multiplier: getStreakMultiplier(streak),
      nextMilestone: streak < 3  ? 3  :
                     streak < 7  ? 7  :
                     streak < 14 ? 14 :
                     streak < 30 ? 30 : null,
    };
  },

  STREAK_BONUSES,
  getStreakMultiplier,
};
