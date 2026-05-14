// FDT token values per engagement type
export const FDT_REWARDS = {
  // High Value
  share:        { fdt: 50,  label: 'Share',        tier: 'high' },
  repost:       { fdt: 50,  label: 'Repost',       tier: 'high' },
  stitch:       { fdt: 75,  label: 'Video Stitch',  tier: 'high' },
  // Medium Value
  comment:      { fdt: 20,  label: 'Comment',      tier: 'medium' },
  save:         { fdt: 15,  label: 'Save',          tier: 'medium' },
  email_signup: { fdt: 30,  label: 'Email Sign-up', tier: 'medium' },
  // Low Value
  like:         { fdt: 5,   label: 'Like',          tier: 'low' },
  view:         { fdt: 2,   label: 'View',          tier: 'low' },
};

export const PLATFORM_ICONS = {
  instagram: '📸',
  tiktok:    '🎵',
  youtube:   '▶️',
  telegram:  '✈️',
};

export const TIER_COLORS = {
  high:   'text-accent',
  medium: 'text-primary',
  low:    'text-muted-foreground',
};

export const TIER_BG = {
  high:   'bg-accent/10 border-accent/20',
  medium: 'bg-primary/10 border-primary/20',
  low:    'bg-muted/50 border-border',
};