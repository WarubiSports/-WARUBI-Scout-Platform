import { describe, it, expect } from 'vitest'
import { getRateForDuration, calculateEarnings, buildRates } from './earnings'
import { PlayerStatus } from '../types'
import type { ScoutAgreement, ScoutingEvent } from './database.types'
import type { Player } from '../types'

// --- Fixtures ---

const BASE_AGREEMENT: ScoutAgreement = {
  id: 'agr-1',
  scout_id: 'scout-1',
  agreement_type: 'regional_licensee',
  currency: 'USD',
  rate_full_season: 5000,
  rate_6_months: 3000,
  rate_3_months: 2000,
  rate_1_month: null,
  rate_1_month_female: null,
  rate_3_months_female: null,
  college_rate_tier_1: null,
  college_rate_tier_2: null,
  college_rate_tier_3: null,
  college_rate_currency: null,
  scholarship_adjusts_tdrf: false,
  has_event_rights: true,
  min_placements_per_year: 4,
  agreement_start: '2025-01-01',
  agreement_end: null,
  is_active: true,
  notes: null,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
} as ScoutAgreement

function makeAgreement(overrides: Record<string, unknown> = {}): ScoutAgreement {
  return Object.assign({}, BASE_AGREEMENT, overrides) as ScoutAgreement
}

function makePlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: `p-${Math.random().toString(36).slice(2, 8)}`,
    name: 'Test Player',
    age: 18,
    position: 'MF',
    nationality: 'US',
    status: PlayerStatus.PLACED,
    submittedAt: new Date().toISOString(),
    outreachLogs: [],
    ...overrides,
  } as Player
}

function makeEvent(overrides: Partial<ScoutingEvent> = {}): ScoutingEvent {
  return {
    id: `evt-${Math.random().toString(36).slice(2, 8)}`,
    host_scout_id: 'scout-1',
    host_name: 'Test Scout',
    title: 'Test Showcase',
    event_type: 'Showcase',
    event_date: '2026-03-01',
    event_end_date: null,
    start_time: '10:00',
    end_time: '14:00',
    location: 'Test Field',
    status: 'completed',
    fee: '200',
    max_capacity: null,
    description: null,
    marketing_copy: null,
    agenda: null,
    checklist: null,
    event_link: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  } as ScoutingEvent
}

// --- getRateForDuration ---

describe('getRateForDuration', () => {
  const agreement = makeAgreement()

  it('returns full_season rate', () => {
    expect(getRateForDuration(agreement, 'full_season')).toBe(5000)
  })

  it('returns 6_months rate', () => {
    expect(getRateForDuration(agreement, '6_months')).toBe(3000)
  })

  it('returns 3_months rate', () => {
    expect(getRateForDuration(agreement, '3_months')).toBe(2000)
  })

  it('returns 1_month rate when set', () => {
    const agr = makeAgreement({ rate_1_month: 1000 })
    expect(getRateForDuration(agr, '1_month')).toBe(1000)
  })

  it('returns null for 1_month when not set', () => {
    expect(getRateForDuration(agreement, '1_month')).toBeNull()
  })

  it('returns female rates when set', () => {
    const agr = makeAgreement({ rate_1_month_female: 800, rate_3_months_female: 1800 })
    expect(getRateForDuration(agr, '1_month_female')).toBe(800)
    expect(getRateForDuration(agr, '3_months_female')).toBe(1800)
  })

  it('returns null for undefined duration', () => {
    expect(getRateForDuration(agreement, undefined)).toBeNull()
  })

  it('returns null for unknown duration', () => {
    expect(getRateForDuration(agreement, 'weekly')).toBeNull()
  })
})

// --- buildRates ---

describe('buildRates', () => {
  it('maps all agreement fields to rates object', () => {
    const agr = makeAgreement({
      rate_1_month_female: 800,
      college_rate_tier_1: 400,
      college_rate_tier_2: 600,
      college_rate_tier_3: 800,
      college_rate_currency: 'EUR',
    })
    const rates = buildRates(agr)
    expect(rates.fullSeason).toBe(5000)
    expect(rates.sixMonths).toBe(3000)
    expect(rates.threeMonths).toBe(2000)
    expect(rates.oneMonthFemale).toBe(800)
    expect(rates.collegeTier1).toBe(400)
    expect(rates.collegeTier2).toBe(600)
    expect(rates.collegeTier3).toBe(800)
    expect(rates.collegeRateCurrency).toBe('EUR')
  })
})

// --- calculateEarnings ---

describe('calculateEarnings', () => {
  it('returns defaults when no agreement', () => {
    const result = calculateEarnings(null, [], [], false)
    expect(result.totalConfirmed).toBe(0)
    expect(result.totalPending).toBe(0)
    expect(result.placementsThisYear).toBe(0)
    expect(result.minPlacementsPerYear).toBe(4)
    expect(result.placements).toEqual([])
    expect(result.events).toEqual([])
    expect(result.rates).toBeNull()
    expect(result.agreementType).toBeNull()
    expect(result.hasEventRights).toBe(false)
    expect(result.currency).toBe('USD')
  })

  it('calculates confirmed earnings from placed + confirmed players', () => {
    const agr = makeAgreement()
    const players = [
      makePlayer({ programDuration: 'full_season', enrollmentConfirmed: true }),
      makePlayer({ programDuration: '6_months', enrollmentConfirmed: true }),
    ]
    const result = calculateEarnings(agr, players, [], true)
    expect(result.totalConfirmed).toBe(8000) // 5000 + 3000
    expect(result.totalPending).toBe(0)
  })

  it('calculates pending earnings from placed + unconfirmed players', () => {
    const agr = makeAgreement()
    const players = [
      makePlayer({ programDuration: 'full_season', enrollmentConfirmed: false }),
      makePlayer({ programDuration: '3_months' }), // undefined = not confirmed
    ]
    const result = calculateEarnings(agr, players, [], true)
    expect(result.totalConfirmed).toBe(0)
    expect(result.totalPending).toBe(7000) // 5000 + 2000
  })

  it('splits confirmed and pending correctly', () => {
    const agr = makeAgreement()
    const players = [
      makePlayer({ programDuration: 'full_season', enrollmentConfirmed: true }),
      makePlayer({ programDuration: '6_months', enrollmentConfirmed: false }),
      makePlayer({ programDuration: '3_months', enrollmentConfirmed: true }),
    ]
    const result = calculateEarnings(agr, players, [], true)
    expect(result.totalConfirmed).toBe(7000) // 5000 + 2000
    expect(result.totalPending).toBe(3000) // 6_months
  })

  it('skips players without duration (tdrfAmount = null)', () => {
    const agr = makeAgreement()
    const players = [
      makePlayer({ programDuration: undefined, enrollmentConfirmed: true }),
      makePlayer({ programDuration: 'full_season', enrollmentConfirmed: true }),
    ]
    const result = calculateEarnings(agr, players, [], true)
    expect(result.totalConfirmed).toBe(5000) // only the one with duration
    expect(result.placements[0].tdrfAmount).toBeNull()
    expect(result.placements[1].tdrfAmount).toBe(5000)
  })

  it('only counts PLACED players', () => {
    const agr = makeAgreement()
    const players = [
      makePlayer({ status: PlayerStatus.LEAD, programDuration: 'full_season', enrollmentConfirmed: true }),
      makePlayer({ status: PlayerStatus.OFFERED, programDuration: '6_months', enrollmentConfirmed: true }),
      makePlayer({ status: PlayerStatus.PLACED, programDuration: '3_months', enrollmentConfirmed: true }),
    ]
    const result = calculateEarnings(agr, players, [], true)
    expect(result.placements).toHaveLength(1)
    expect(result.totalConfirmed).toBe(2000)
  })

  it('counts placements this year correctly', () => {
    const agr = makeAgreement()
    const thisYear = new Date().getFullYear()
    const players = [
      makePlayer({ submittedAt: `${thisYear}-03-15T00:00:00Z` }),
      makePlayer({ submittedAt: `${thisYear}-06-01T00:00:00Z` }),
      makePlayer({ submittedAt: `${thisYear - 1}-11-01T00:00:00Z` }),
    ]
    const result = calculateEarnings(agr, players, [], true)
    expect(result.placementsThisYear).toBe(2)
  })

  it('maps event fees correctly', () => {
    const agr = makeAgreement()
    const events = [
      makeEvent({ fee: '175' }),
      makeEvent({ fee: '200' }),
    ]
    const result = calculateEarnings(agr, [], events, true)
    expect(result.events).toHaveLength(2)
    expect(result.events[0].fee).toBe(175)
    expect(result.events[1].fee).toBe(200)
  })

  it('handles null/empty event fees gracefully', () => {
    const agr = makeAgreement()
    const events = [
      makeEvent({ fee: null }),
      makeEvent({ fee: '' }),
    ]
    const result = calculateEarnings(agr, [], events, true)
    expect(result.events[0].fee).toBe(0)
    expect(result.events[1].fee).toBe(0)
  })

  it('returns agreement metadata correctly', () => {
    const agr = makeAgreement({
      agreement_type: 'hybrid',
      has_event_rights: false,
      scholarship_adjusts_tdrf: true,
      currency: 'EUR',
      min_placements_per_year: 2,
    })
    const result = calculateEarnings(agr, [], [], true)
    expect(result.agreementType).toBe('hybrid')
    expect(result.hasEventRights).toBe(false)
    expect(result.scholarshipAdjustsTdrf).toBe(true)
    expect(result.currency).toBe('EUR')
    expect(result.minPlacementsPerYear).toBe(2)
  })

  // Real-world scenario: Alfonso's agreement
  it('Alfonso scenario: regional licensee, USD, 2 placed players', () => {
    const agr = makeAgreement({
      agreement_type: 'regional_licensee',
      currency: 'USD',
      rate_full_season: 5000,
      rate_6_months: 3000,
      rate_3_months: 2000,
      has_event_rights: true,
      min_placements_per_year: 4,
    })
    const players = [
      makePlayer({ name: 'Player A', programDuration: 'full_season', enrollmentConfirmed: true }),
      makePlayer({ name: 'Player B', programDuration: '6_months', enrollmentConfirmed: false }),
    ]
    const result = calculateEarnings(agr, players, [], true)
    expect(result.totalConfirmed).toBe(5000)
    expect(result.totalPending).toBe(3000)
    expect(result.placements).toHaveLength(2)
    expect(result.hasEventRights).toBe(true)
  })

  // Real-world scenario: Brendan's hybrid agreement
  it('Brendan scenario: hybrid, EUR, college tiers', () => {
    const agr = makeAgreement({
      agreement_type: 'hybrid',
      currency: 'EUR',
      rate_full_season: 3500,
      rate_6_months: 2500,
      rate_3_months: 1500,
      college_rate_tier_1: 400,
      college_rate_tier_2: 600,
      college_rate_tier_3: 800,
      college_rate_currency: 'EUR',
      has_event_rights: false,
      min_placements_per_year: 2,
    })
    const players = [
      makePlayer({ programDuration: 'full_season', enrollmentConfirmed: true }),
    ]
    const result = calculateEarnings(agr, players, [], true)
    expect(result.totalConfirmed).toBe(3500)
    expect(result.rates?.collegeTier1).toBe(400)
    expect(result.rates?.collegeTier2).toBe(600)
    expect(result.rates?.collegeTier3).toBe(800)
    expect(result.hasEventRights).toBe(false)
  })

  // Real-world: Ricardo talent scout with female rates
  it('Ricardo scenario: talent scout, EUR, female rates', () => {
    const agr = makeAgreement({
      agreement_type: 'talent_scout',
      currency: 'EUR',
      rate_full_season: 4400,
      rate_6_months: 2500,
      rate_3_months: 1500,
      rate_1_month_female: 1000,
      rate_3_months_female: 2500,
      has_event_rights: false,
      min_placements_per_year: 2,
    })
    const players = [
      makePlayer({ programDuration: '1_month_female', enrollmentConfirmed: true }),
      makePlayer({ programDuration: '3_months_female', enrollmentConfirmed: false }),
    ]
    const result = calculateEarnings(agr, players, [], true)
    expect(result.totalConfirmed).toBe(1000)
    expect(result.totalPending).toBe(2500)
    expect(result.agreementType).toBe('talent_scout')
  })
})
