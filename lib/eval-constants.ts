export interface EvalCategory {
  key: string
  label: string
  options: string[]
}

export interface EvalSection {
  id: string
  title: string
  icon: string
  categories: EvalCategory[]
}

export const EVAL_SECTIONS: EvalSection[] = [
  {
    id: 'body',
    title: 'Body',
    icon: '👤',
    categories: [
      { key: 'height_rel', label: 'Relative Height', options: ['below avg', 'average', 'above avg'] },
      { key: 'proportion', label: 'Proportion', options: ['long-legged', 'balanced', 'compact'] },
      { key: 'hips', label: 'Hips', options: ['narrow', 'medium', 'wide'] },
      { key: 'shoulders', label: 'Shoulders', options: ['narrow', 'medium', 'wide'] },
      { key: 'muscle', label: 'Muscle Build', options: ['underdeveloped', 'age-appropriate', 'strong'] },
    ],
  },
  {
    id: 'athleticism',
    title: 'Athleticism',
    icon: '⚡',
    categories: [
      { key: 'acceleration', label: 'Acceleration (0-20m)', options: ['elite', 'good', 'average', 'weak'] },
      { key: 'top_speed', label: 'Top Speed (20m+)', options: ['elite', 'good', 'average', 'weak'] },
      { key: 'agility', label: 'Agility', options: ['very agile', 'agile', 'average', 'stiff'] },
      { key: 'coordination', label: 'Coordination', options: ['clean', 'normal', 'clumsy'] },
      { key: 'intensity', label: 'Intensity', options: ['high', 'medium', 'low'] },
    ],
  },
  {
    id: 'technique',
    title: 'Technique',
    icon: '🎯',
    categories: [
      { key: 'ball_control', label: 'Ball Control', options: ['elite', 'good', 'average', 'weak'] },
      { key: 'passing', label: 'Passing', options: ['elite', 'good', 'average', 'weak'] },
      { key: 'dribbling', label: 'Dribbling', options: ['elite', 'good', 'average', 'weak'] },
      { key: 'shooting', label: 'Shooting', options: ['elite', 'good', 'average', 'weak'] },
      { key: 'heading', label: 'Heading', options: ['elite', 'good', 'average', 'weak'] },
    ],
  },
  {
    id: 'tactical',
    title: 'Tactical',
    icon: '🧩',
    categories: [
      { key: 'positioning', label: 'Positioning', options: ['elite', 'good', 'average', 'weak'] },
      { key: 'game_iq', label: 'Game IQ', options: ['elite', 'good', 'average', 'weak'] },
      { key: 'defending', label: 'Defensive Awareness', options: ['elite', 'good', 'average', 'weak'] },
      { key: 'pressing', label: 'Pressing', options: ['active', 'normal', 'passive'] },
      { key: 'transitions', label: 'Transitions', options: ['elite', 'good', 'average', 'weak'] },
    ],
  },
  {
    id: 'mentality',
    title: 'Mentality',
    icon: '🧠',
    categories: [
      { key: 'intelligence', label: 'Game Intelligence', options: ['elite', 'good', 'average', 'weak'] },
      { key: 'body_language', label: 'Body Language', options: ['positive', 'neutral', 'negative'] },
      { key: 'assertiveness', label: 'Assertiveness', options: ['strong', 'normal', 'weak'] },
      { key: 'communication', label: 'Communication', options: ['vocal leader', 'normal', 'quiet'] },
      { key: 'error_response', label: 'Response to Errors', options: ['strong', 'normal', 'fragile'] },
    ],
  },
]

// Chip values for caliber score calculation (centered around 0)
export const CHIP_VALUES: Record<string, number> = {
  elite: 2, good: 1, average: 0, weak: -2,
  high: 2, medium: 0, low: -2,
  'very agile': 2, agile: 1, stiff: -2,
  clean: 2, normal: 0, clumsy: -2,
  positive: 2, neutral: 0, negative: -2,
  strong: 2, fragile: -2,
  'vocal leader': 2, quiet: -1,
  active: 2, passive: -1,
  'above avg': 1, 'below avg': -1,
  'age-appropriate': 0, underdeveloped: -1,
  'long-legged': 0, balanced: 0, compact: 0,
  narrow: 0, wide: 0,
}

export const HIGH_WEIGHT_CHIPS = [
  'acceleration', 'top_speed', 'intensity',
  'ball_control', 'passing', 'dribbling',
  'game_iq', 'positioning', 'defending',
  'intelligence', 'assertiveness',
]

export function calculateEvalBonus(chips: Record<string, string | null>): number {
  let totalPoints = 0
  let totalWeight = 0
  for (const [key, value] of Object.entries(chips)) {
    if (!value) continue
    const points = CHIP_VALUES[value.toLowerCase()] ?? 0
    const weight = HIGH_WEIGHT_CHIPS.includes(key) ? 2 : 1
    totalPoints += points * weight
    totalWeight += weight
  }
  if (totalWeight === 0) return 0
  const avg = totalPoints / totalWeight
  return Math.round(Math.max(-10, Math.min(10, avg * 5)))
}
