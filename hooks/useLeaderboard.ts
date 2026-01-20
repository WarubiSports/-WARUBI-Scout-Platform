import { useState, useEffect, useCallback } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

export interface LeaderboardEntry {
  id: string
  name: string
  region: string
  xp_score: number
  level: number
  placements_count: number
  rank: number
}

interface UseLeaderboardReturn {
  leaderboard: LeaderboardEntry[]
  currentUserRank: number | null
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

export function useLeaderboard(currentUserId?: string, limit: number = 10): UseLeaderboardReturn {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [currentUserRank, setCurrentUserRank] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchLeaderboard = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Fetch top scouts by XP score
      const { data, error: fetchError } = await supabase
        .from('scouts')
        .select('id, name, region, xp_score, level, placements_count')
        .eq('status', 'active')
        .order('xp_score', { ascending: false })
        .limit(limit)

      if (fetchError) throw fetchError

      // Add rank to each entry
      const rankedData: LeaderboardEntry[] = (data || []).map((scout, index) => ({
        ...scout,
        rank: index + 1,
      }))

      setLeaderboard(rankedData)

      // Find current user's rank if not in top list
      if (currentUserId) {
        const userInList = rankedData.find(s => s.id === currentUserId)
        if (userInList) {
          setCurrentUserRank(userInList.rank)
        } else {
          // Fetch user's actual rank
          const { data: allScouts, error: allError } = await supabase
            .from('scouts')
            .select('id, xp_score')
            .eq('status', 'active')
            .order('xp_score', { ascending: false })

          if (!allError && allScouts) {
            const userIndex = allScouts.findIndex(s => s.id === currentUserId)
            if (userIndex !== -1) {
              setCurrentUserRank(userIndex + 1)
            }
          }
        }
      }
    } catch (err) {
      console.error('Error fetching leaderboard:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch leaderboard')
    } finally {
      setLoading(false)
    }
  }, [currentUserId, limit])

  useEffect(() => {
    fetchLeaderboard()
  }, [fetchLeaderboard])

  return {
    leaderboard,
    currentUserRank,
    loading,
    error,
    refresh: fetchLeaderboard,
  }
}
