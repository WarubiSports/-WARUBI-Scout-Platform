import { useQuery } from '@tanstack/react-query'
import { isSupabaseConfigured, supabaseRest } from '../lib/supabase'
import type { ScoutAgreement } from '../lib/database.types'

export function useScoutAgreement(scoutId: string | undefined) {
  const { data, isLoading } = useQuery({
    queryKey: ['scout-agreement', scoutId],
    queryFn: async () => {
      if (!scoutId || !isSupabaseConfigured) return null

      const { data, error } = await supabaseRest.select<ScoutAgreement>(
        'scout_agreements',
        `scout_id=eq.${scoutId}&is_active=eq.true&limit=1`
      )

      if (error || !data || data.length === 0) return null
      return data[0]
    },
    enabled: !!scoutId && isSupabaseConfigured,
    staleTime: 5 * 60 * 1000, // 5 minutes - agreements rarely change
  })

  return {
    agreement: data || null,
    loading: isLoading,
    hasAgreement: !!data,
  }
}
