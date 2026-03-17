import { Player, PlayerStatus } from '../types'
import type { ScoutAgreement, ScoutingEvent } from './database.types'

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
}

export interface AgreementRates {
  fullSeason: number
  sixMonths: number
  threeMonths: number
  oneMonth: number | null
  oneMonthFemale: number | null
  threeMonthsFemale: number | null
  collegeTier1: number | null
  collegeTier2: number | null
  collegeTier3: number | null
  collegeRateCurrency: 'EUR' | 'USD' | null
}

export interface EarningsResult {
  totalConfirmed: number
  totalPending: number
  placementsThisYear: number
  minPlacementsPerYear: number
  placements: PlacementEarning[]
  events: EventEarning[]
  rates: AgreementRates | null
  agreementType: 'regional_licensee' | 'talent_scout' | 'hybrid' | null
  hasEventRights: boolean
  scholarshipAdjustsTdrf: boolean
  currency: 'EUR' | 'USD'
}

export function getRateForDuration(agreement: ScoutAgreement, duration: string | undefined): number | null {
  if (!duration) return null
  switch (duration) {
    case 'full_season': return agreement.rate_full_season
    case '6_months': return agreement.rate_6_months
    case '3_months': return agreement.rate_3_months
    case '1_month': return agreement.rate_1_month
    case '1_month_female': return agreement.rate_1_month_female
    case '3_months_female': return agreement.rate_3_months_female
    default: return null
  }
}

export function buildRates(agreement: ScoutAgreement): AgreementRates {
  return {
    fullSeason: agreement.rate_full_season,
    sixMonths: agreement.rate_6_months,
    threeMonths: agreement.rate_3_months,
    oneMonth: agreement.rate_1_month,
    oneMonthFemale: agreement.rate_1_month_female,
    threeMonthsFemale: agreement.rate_3_months_female,
    collegeTier1: agreement.college_rate_tier_1,
    collegeTier2: agreement.college_rate_tier_2,
    collegeTier3: agreement.college_rate_tier_3,
    collegeRateCurrency: agreement.college_rate_currency,
  }
}

export function calculateEarnings(
  agreement: ScoutAgreement | null,
  players: Player[],
  hostedEvents: ScoutingEvent[],
  hasAgreement: boolean,
): EarningsResult {
  const rates = agreement ? buildRates(agreement) : null

  if (!agreement) {
    return {
      totalConfirmed: 0,
      totalPending: 0,
      placementsThisYear: 0,
      minPlacementsPerYear: 4,
      placements: [],
      events: [],
      rates,
      agreementType: null,
      hasEventRights: false,
      scholarshipAdjustsTdrf: false,
      currency: 'USD' as const,
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

  const events: EventEarning[] = hostedEvents.map(e => {
    const fee = parseFloat(e.fee || '0') || 0
    return {
      eventId: e.id,
      title: e.title,
      eventType: e.event_type,
      date: e.event_date,
      fee,
    }
  })

  return {
    totalConfirmed,
    totalPending,
    placementsThisYear,
    minPlacementsPerYear: agreement.min_placements_per_year,
    placements,
    events,
    rates,
    agreementType: agreement.agreement_type,
    hasEventRights: agreement.has_event_rights,
    scholarshipAdjustsTdrf: agreement.scholarship_adjusts_tdrf,
    currency: agreement.currency,
  }
}
