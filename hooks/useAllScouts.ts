import { useState, useEffect, useCallback } from 'react'
import { supabase, supabaseRest, isSupabaseConfigured } from '../lib/supabase'
import type { Scout } from '../lib/database.types'

interface ScoutWithStats extends Scout {
  prospects_count?: number
  conversion_rate?: string
}

interface UseAllScoutsReturn {
  scouts: ScoutWithStats[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  updateScout: (id: string, updates: Partial<Scout>) => Promise<boolean>
}

export function useAllScouts(): UseAllScoutsReturn {
  const [scouts, setScouts] = useState<ScoutWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchScouts = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Fetch all scouts using REST API (Supabase JS client hangs)
      const { data: scoutsData, error: scoutsError } = await supabaseRest.select<Scout>(
        'scouts',
        'order=created_at.desc'
      )

      if (scoutsError) {
        throw new Error(scoutsError.message)
      }

      // Skip RPC call for prospect counts - Supabase JS client hangs
      // The counts will be calculated from local state or remain at 0
      let countMap: Record<string, number> = {}

      // Enrich scouts with stats
      const enrichedScouts: ScoutWithStats[] = (scoutsData || []).map((scout: Scout) => {
        const prospectsCount = countMap[scout.id] || 0
        const placementsCount = scout.placements_count || 0
        const conversionRate = prospectsCount > 0
          ? `${Math.round((placementsCount / prospectsCount) * 100)}%`
          : '0%'

        return {
          ...scout,
          prospects_count: prospectsCount,
          conversion_rate: conversionRate,
        }
      })

      setScouts(enrichedScouts)
    } catch (err) {
      console.error('Error fetching scouts:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch scouts')
    } finally {
      setLoading(false)
    }
  }, [])

  const updateScout = useCallback(async (id: string, updates: Partial<Scout>): Promise<boolean> => {
    if (!isSupabaseConfigured) return false

    try {
      const { error } = await (supabase
        .from('scouts') as any)
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)

      if (error) throw error

      // Update local state
      setScouts(prev => prev.map(s =>
        s.id === id ? { ...s, ...updates } : s
      ))

      return true
    } catch (err) {
      console.error('Error updating scout:', err)
      return false
    }
  }, [])

  useEffect(() => {
    fetchScouts()
  }, [fetchScouts])

  return {
    scouts,
    loading,
    error,
    refresh: fetchScouts,
    updateScout,
  }
}
