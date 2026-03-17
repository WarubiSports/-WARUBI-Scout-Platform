import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useScoutAgreement } from './useScoutAgreement'
import { isSupabaseConfigured, supabaseRest } from '../lib/supabase'
import { Player } from '../types'
import type { ScoutingEvent } from '../lib/database.types'
import { calculateEarnings } from '../lib/earnings'

// Re-export types so existing imports keep working
export type { PlacementEarning, EventEarning, AgreementRates } from '../lib/earnings'
export type { EarningsResult } from '../lib/earnings'

export interface EarningsData {
  totalConfirmed: number
  totalPending: number
  placementsThisYear: number
  minPlacementsPerYear: number
  placements: import('../lib/earnings').PlacementEarning[]
  events: import('../lib/earnings').EventEarning[]
  rates: import('../lib/earnings').AgreementRates | null
  agreementType: 'regional_licensee' | 'talent_scout' | 'hybrid' | null
  hasEventRights: boolean
  scholarshipAdjustsTdrf: boolean
  currency: 'EUR' | 'USD'
  loading: boolean
  hasAgreement: boolean
}

export function useEarnings(scoutId: string | undefined, players: Player[]): EarningsData {
  const { agreement, loading: agreementLoading, hasAgreement } = useScoutAgreement(scoutId)

  // Fetch completed events hosted by this scout
  const { data: hostedEvents = [], isLoading: eventsLoading } = useQuery({
    queryKey: ['scout-events-earnings', scoutId],
    queryFn: async () => {
      if (!scoutId || !isSupabaseConfigured) return []
      const { data, error } = await supabaseRest.select<ScoutingEvent>(
        'scouting_events',
        `host_scout_id=eq.${scoutId}&status=eq.completed&order=event_date.desc`
      )
      if (error || !data) return []
      return data
    },
    enabled: !!scoutId && isSupabaseConfigured,
    staleTime: 5 * 60 * 1000,
  })

  const loading = agreementLoading || eventsLoading

  const result = useMemo(() => {
    const calc = calculateEarnings(agreement, players, hostedEvents, hasAgreement)
    return { ...calc, loading, hasAgreement }
  }, [agreement, players, hostedEvents, loading, hasAgreement])

  return result
}
