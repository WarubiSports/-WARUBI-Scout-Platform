import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useScoutAgreement } from './useScoutAgreement'
import { isSupabaseConfigured, supabaseRest } from '../lib/supabase'
import { Player, PlayerStatus } from '../types'
import type { ScoutAgreement, ScoutingEvent } from '../lib/database.types'

export interface PlacementEarning {
  playerId: string
  playerName: string
  programDuration: string | undefined
  tdrfAmount: number | null // null = needs duration set
  confirmed: boolean
  placedLocation: string | undefined
  submittedAt: string
}

export interface EventEarning {
  eventId: string
  title: string
  eventType: string
  date: string
  fee: number
  attendees: number
  revenue: number
}

export interface EarningsData {
  totalConfirmed: number
  totalPending: number
  placementsThisYear: number
  minPlacementsPerYear: number
  placements: PlacementEarning[]
  eventRevenue: number
  events: EventEarning[]
  rates: { fullSeason: number; sixMonths: number; threeMonths: number; oneMonth: number | null } | null
  currency: 'EUR' | 'USD'
  loading: boolean
  hasAgreement: boolean
}

function getRateForDuration(agreement: ScoutAgreement, duration: string | undefined): number | null {
  if (!duration) return null
  switch (duration) {
    case 'full_season': return agreement.rate_full_season
    case '6_months': return agreement.rate_6_months
    case '3_months': return agreement.rate_3_months
    case '1_month': return agreement.rate_1_month
    default: return null
  }
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
    const emptyRates = agreement ? {
      fullSeason: agreement.rate_full_season,
      sixMonths: agreement.rate_6_months,
      threeMonths: agreement.rate_3_months,
      oneMonth: agreement.rate_1_month,
    } : null

    if (!agreement) {
      return {
        totalConfirmed: 0,
        totalPending: 0,
        placementsThisYear: 0,
        minPlacementsPerYear: 4,
        placements: [],
        eventRevenue: 0,
        events: [],
        rates: emptyRates,
        currency: 'USD' as const,
        loading,
        hasAgreement,
      }
    }

    const placed = players.filter(p => p.status === PlayerStatus.PLACED)
    const currentYear = new Date().getFullYear()

    const placements: PlacementEarning[] = placed.map(p => {
      const amount = getRateForDuration(agreement, p.programDuration)
      return {
        playerId: p.id,
        playerName: p.name,
        programDuration: p.programDuration,
        tdrfAmount: amount,
        confirmed: p.enrollmentConfirmed === true,
        placedLocation: p.placedLocation,
        submittedAt: p.submittedAt,
      }
    })

    const placementsThisYear = placed.filter(p => {
      const year = new Date(p.submittedAt).getFullYear()
      return year === currentYear
    }).length

    let totalConfirmed = 0
    let totalPending = 0

    for (const pl of placements) {
      if (pl.tdrfAmount === null) continue
      if (pl.confirmed) {
        totalConfirmed += pl.tdrfAmount
      } else {
        totalPending += pl.tdrfAmount
      }
    }

    // Calculate event revenue from completed events
    const events: EventEarning[] = hostedEvents.map(e => {
      const fee = parseFloat(e.fee || '0') || 0
      const attendees = e.registered_count || 0
      return {
        eventId: e.id,
        title: e.title,
        eventType: e.event_type,
        date: e.event_date,
        fee,
        attendees,
        revenue: fee * attendees,
      }
    })

    const eventRevenue = events.reduce((sum, e) => sum + e.revenue, 0)

    return {
      totalConfirmed,
      totalPending,
      placementsThisYear,
      minPlacementsPerYear: agreement.min_placements_per_year,
      placements,
      eventRevenue,
      events,
      rates: emptyRates,
      currency: agreement.currency,
      loading,
      hasAgreement,
    }
  }, [agreement, players, hostedEvents, loading, hasAgreement])

  return result
}
