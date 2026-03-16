import { useMemo } from 'react'
import { useScoutAgreement } from './useScoutAgreement'
import { Player, PlayerStatus } from '../types'
import type { ScoutAgreement } from '../lib/database.types'

export interface PlacementEarning {
  playerId: string
  playerName: string
  programDuration: string | undefined
  tdrfAmount: number | null // null = needs duration set
  confirmed: boolean
  placedLocation: string | undefined
  submittedAt: string
}

export interface EarningsData {
  totalConfirmed: number
  totalPending: number
  placementsThisYear: number
  minPlacementsPerYear: number
  placements: PlacementEarning[]
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
  const { agreement, loading, hasAgreement } = useScoutAgreement(scoutId)

  const result = useMemo(() => {
    if (!agreement) {
      return {
        totalConfirmed: 0,
        totalPending: 0,
        placementsThisYear: 0,
        minPlacementsPerYear: 4,
        placements: [],
        currency: 'EUR' as const,
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

    // Count placements this year (by submittedAt date)
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

    return {
      totalConfirmed,
      totalPending,
      placementsThisYear,
      minPlacementsPerYear: agreement.min_placements_per_year,
      placements,
      currency: agreement.currency,
      loading,
      hasAgreement,
    }
  }, [agreement, players, loading, hasAgreement])

  return result
}
