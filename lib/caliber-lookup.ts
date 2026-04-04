import { supabaseRest } from './supabase'

interface CaliberPlayer {
  name: string
  caliber_score: number | null
}

/**
 * Look up a player's base caliber score from the shared caliber_players table.
 * Matches by name (case-insensitive, exact match).
 * Returns the caliber_score or null if not found.
 */
export const lookupCaliberScore = async (playerName: string): Promise<number | null> => {
  if (!playerName) return null

  const { data, error } = await supabaseRest.select<CaliberPlayer>(
    'caliber_players',
    `select=name,caliber_score&name=ilike.${encodeURIComponent(playerName)}&limit=1`
  )

  if (error || !data || data.length === 0) return null

  return data[0].caliber_score ?? null
}
