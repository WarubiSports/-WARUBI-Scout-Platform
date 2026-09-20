import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PlayerStatus, type Player } from '../types'

const mocks = vi.hoisted(() => ({
  select: vi.fn(), insert: vi.fn(), update: vi.fn(), eq: vi.fn(), toast: vi.fn(),
}))
vi.mock('react', () => ({ useCallback: (fn: unknown) => fn }))
vi.mock('sonner', () => ({ toast: { success: mocks.toast } }))
vi.mock('../lib/supabase', () => ({
  isSupabaseConfigured: true,
  supabaseRest: { select: mocks.select, insert: mocks.insert, update: mocks.update },
  supabase: { from: () => ({ update: (payload: unknown) => { mocks.update(payload); return { eq: mocks.eq } } }) },
}))
import { useItpSync } from './useItpSync'
import { sendProspectToTrial } from '../services/trialService'

const player = (changes: Partial<Player> = {}): Player => ({
  id: 'scout-player-1', name: 'TEST Player', age: 18, dateOfBirth: '2008-03-16',
  position: 'MF', nationality: 'US', club: 'TEST Club', email: 'fixture@example.test',
  status: PlayerStatus.LEAD, submittedAt: '2026-09-20', outreachLogs: [],
  notes: 'Original scout observation', technical: 4, ...changes,
} as Player)
const dates = { start: '2026-10-01', end: '2026-10-07', flexible: false }
const notification = vi.fn()
const transition = () => useItpSync({ scoutId: 'scout-1', scoutName: 'TEST Scout',
  updateProspect: vi.fn(), incrementPlacements: vi.fn(), addNotification: notification,
}).handleStatusTransition
let source: { id: string; trial_prospect_id: string | null }
beforeEach(() => {
  vi.clearAllMocks()
  source = { id: 'scout-player-1', trial_prospect_id: null }
  mocks.select.mockImplementation(async () => ({ data: [{ ...source }], error: null }))
  mocks.insert.mockResolvedValue({ data: { id: 'new-trial-1' }, error: null })
  mocks.eq.mockImplementation(async () => {
    source.trial_prospect_id = mocks.update.mock.calls.at(-1)![0].trial_prospect_id
    return { error: null }
  })
})

describe('actual scout transition and trial service', () => {
  it('retains an existing trial and avoids a second insert or new-request notification', async () => {
    source.trial_prospect_id = 'existing-trial'
    const result = await transition()(PlayerStatus.LEAD, PlayerStatus.REQUEST_TRIAL, player({ trialProspectId: 'existing-trial' }), dates)
    expect(result).toBe('existing-trial')
    expect(mocks.select).toHaveBeenCalledWith('scout_prospects', 'id=eq.scout-player-1&select=id,trial_prospect_id')
    expect(mocks.insert).not.toHaveBeenCalled()
    expect(mocks.update).not.toHaveBeenCalled()
    expect(notification).toHaveBeenCalledWith(expect.objectContaining({ title: 'Existing Trial Retained' }))
    expect(mocks.toast).toHaveBeenCalledWith('Existing trial retained — no new request submitted', expect.anything())
  })
  it('uses the exact current source link even when the browser has an older or missing link', async () => {
    source.trial_prospect_id = 'current-trial'
    for (const trialProspectId of [undefined, 'older-trial']) {
      expect(await sendProspectToTrial(player({ trialProspectId }), 'scout-1', 'TEST Scout')).toMatchObject({ success: true, trialProspectId: 'current-trial', reusedExisting: true })
    }
    expect(mocks.insert).not.toHaveBeenCalled()
    expect(mocks.update).not.toHaveBeenCalled()
  })
  it('creates the first request with attribution and dates, then reuses it on a stale-browser retry', async () => {
    const stalePlayer = player()
    const first = await transition()(PlayerStatus.LEAD, PlayerStatus.REQUEST_TRIAL, stalePlayer, dates)
    const again = await transition()(PlayerStatus.LEAD, PlayerStatus.REQUEST_TRIAL, stalePlayer, dates)
    expect([first, again]).toEqual(['new-trial-1', 'new-trial-1'])
    expect(mocks.insert).toHaveBeenCalledTimes(1)
    expect(mocks.insert).toHaveBeenCalledWith('trial_prospects', expect.objectContaining({
      date_of_birth: '2008-03-16', status: 'requested', scout_id: 'scout-1', created_by: 'scout-1',
      recommended_by: 'TEST Scout', requested_start_date: dates.start, requested_end_date: dates.end,
      dates_flexible: false, scouting_notes: 'Scout Notes: Original scout observation', technical_rating: 4,
    }))
    expect(mocks.update).toHaveBeenCalledTimes(1)
    expect(mocks.eq).toHaveBeenCalledWith('id', 'scout-player-1')
  })
  it.each([
    { data: null, error: { message: 'unavailable' } },
    { data: [], error: null },
    { data: [{ id: 'another-player', trial_prospect_id: 'another-trial' }], error: null },
  ])('refuses creation when the exact source cannot be verified: %j', async response => {
    mocks.select.mockResolvedValue(response)
    expect(await sendProspectToTrial(player(), 'scout-1', 'TEST Scout')).toMatchObject({ success: false, trialProspectId: null })
    expect(mocks.insert).not.toHaveBeenCalled()
    expect(mocks.update).not.toHaveBeenCalled()
  })
  it('refuses a stale claimed link when current source has no link', async () => {
    expect(await sendProspectToTrial(player({ trialProspectId: 'removed-link' }), 'scout-1', 'TEST Scout')).toMatchObject({ success: false, trialProspectId: null })
    expect(mocks.insert).not.toHaveBeenCalled()
  })
  it('fails closed if the source read throws instead of returning an error', async () => {
    mocks.select.mockRejectedValue(new Error('network unavailable'))
    expect(await sendProspectToTrial(player(), 'scout-1', 'TEST Scout')).toMatchObject({ success: false, trialProspectId: null })
    expect(mocks.insert).not.toHaveBeenCalled()
  })
  it('preserves the live contact-request flow without reintroducing legacy direct signing', async () => {
    expect(await transition()(PlayerStatus.LEAD, PlayerStatus.CONTACT_REQUESTED, player())).toBeUndefined()
    expect(mocks.select).not.toHaveBeenCalled()
    expect(mocks.insert).not.toHaveBeenCalled()
    expect(notification).not.toHaveBeenCalled()
  })
  it.each([
    { dateOfBirth: undefined, age: 18 },
    { dateOfBirth: '', age: 17 },
    { dateOfBirth: undefined, age: undefined },
  ])('preserves an unknown birth date through the actual trial request: %j', async facts => {
    expect(await transition()(PlayerStatus.LEAD, PlayerStatus.REQUEST_TRIAL, player(facts), dates)).toBe('new-trial-1')
    expect(mocks.insert).toHaveBeenCalledWith('trial_prospects', expect.objectContaining({
      date_of_birth: null, status: 'requested', requested_start_date: dates.start,
      requested_end_date: dates.end, recommended_by: 'TEST Scout',
    }))
    const saved = mocks.insert.mock.calls[0][1]
    expect(saved.scouting_notes).toContain('Scout Notes: Original scout observation')
    if (facts.age) {
      expect(saved.scouting_notes).toContain(`Source-reported age: ${facts.age} (unverified; exact date of birth unknown).`)
    } else {
      expect(saved.scouting_notes).not.toContain('Source-reported age:')
    }
    expect(mocks.eq).toHaveBeenCalledWith('id', 'scout-player-1')
  })
  it('keeps unknown DOB in the retained legacy service without inventing adulthood', async () => {
    expect(await sendProspectToTrial(player({ dateOfBirth: undefined, age: 17 }), 'scout-1', 'TEST Scout', true)).toMatchObject({ success: true, trialProspectId: 'new-trial-1' })
    expect(mocks.insert).toHaveBeenCalledWith('trial_prospects', expect.objectContaining({ date_of_birth: null, status: 'accepted' }))
  })
  it.each(['2008-01-01', '2008-02-29'])('retains an actual recorded birth date exactly: %s', async dateOfBirth => {
    expect(await sendProspectToTrial(player({ dateOfBirth }), 'scout-1', 'TEST Scout')).toMatchObject({ success: true })
    expect(mocks.insert).toHaveBeenCalledWith('trial_prospects', expect.objectContaining({ date_of_birth: dateOfBirth }))
    expect(mocks.insert.mock.calls[0][1].scouting_notes).not.toContain('exact date of birth unknown')
  })
  it('does not rewrite an existing linked trial when the source DOB is unknown', async () => {
    source.trial_prospect_id = 'staff-reviewed-trial'
    expect(await sendProspectToTrial(player({ dateOfBirth: undefined, age: 17 }), 'scout-1', 'TEST Scout')).toMatchObject({ success: true, trialProspectId: 'staff-reviewed-trial', reusedExisting: true })
    expect(mocks.insert).not.toHaveBeenCalled()
    expect(mocks.update).not.toHaveBeenCalled()
  })
  it('does not merge separate scout players by the same name or email', async () => {
    source.id = 'scout-player-2'
    expect(await sendProspectToTrial(player({ id: 'scout-player-2' }), 'scout-1', 'TEST Scout')).toMatchObject({ success: true, trialProspectId: 'new-trial-1' })
    expect(mocks.select).toHaveBeenCalledWith('scout_prospects', 'id=eq.scout-player-2&select=id,trial_prospect_id')
    expect(mocks.insert).toHaveBeenCalledTimes(1)
  })
  it('preserves existing trial state on a contact request without announcing a new signing', async () => {
    source.trial_prospect_id = 'staff-reviewed-trial'
    expect(await transition()(PlayerStatus.LEAD, PlayerStatus.CONTACT_REQUESTED, player())).toBeUndefined()
    expect(mocks.insert).not.toHaveBeenCalled()
    expect(mocks.update).not.toHaveBeenCalled()
    expect(notification).not.toHaveBeenCalled()
    expect(notification).not.toHaveBeenCalledWith(expect.objectContaining({ title: 'Direct Sign Sent' }))
  })
})
