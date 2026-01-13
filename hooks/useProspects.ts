import { useState, useEffect, useCallback } from 'react'
import { supabase, isSupabaseConfigured, supabaseRest } from '../lib/supabase'
import type { ScoutProspect, ScoutProspectInsert, ScoutProspectUpdate } from '../lib/database.types'
import { PlayerStatus } from '../types'
import type { Player, PlayerEvaluation, OutreachLog } from '../types'
import { parseEvaluation, evaluationToJson } from '../lib/guards'

// Map frontend Player type to database scout_prospects
function playerToProspect(player: Player, scoutId: string): ScoutProspectInsert {
  return {
    scout_id: scoutId,
    name: player.name,
    age: player.age,
    position: player.position,
    email: player.email || null,
    phone: player.phone || null,
    height: player.height || null,
    weight: player.weight || null,
    dominant_foot: player.dominantFoot || null,
    nationality: player.nationality || null,
    has_eu_passport: player.hasEuPassport || null,
    club: player.club || null,
    team_level: player.teamLevel || null,
    video_link: player.videoLink || null,
    gpa: player.gpa || null,
    grad_year: player.gradYear || null,
    sat_act: player.satAct || null,
    parent_name: player.parentName || null,
    parent_email: player.parentEmail || null,
    parent_phone: player.parentPhone || null,
    pace: player.pace || null,
    physical: player.physical || null,
    technical: player.technical || null,
    tactical: player.tactical || null,
    coachable: player.coachable || null,
    evaluation: evaluationToJson(player.evaluation),
    status: statusToDb(player.status),
    activity_status: player.activityStatus || 'undiscovered',
    interested_program: player.interestedProgram || null,
    placed_location: player.placedLocation || null,
    notes: player.notes || null,
    last_contacted_at: player.lastContactedAt || null,
  }
}

// Map database scout_prospects to frontend Player type
function prospectToPlayer(prospect: ScoutProspect, outreachLogs: OutreachLog[] = []): Player {
  return {
    id: prospect.id,
    name: prospect.name,
    age: prospect.age || 0,
    position: prospect.position,
    secondaryPosition: undefined,
    dominantFoot: prospect.dominant_foot || undefined,
    nationality: prospect.nationality || undefined,
    hasEuPassport: prospect.has_eu_passport || undefined,
    height: prospect.height || undefined,
    weight: prospect.weight || undefined,
    pace: prospect.pace || undefined,
    physical: prospect.physical || undefined,
    technical: prospect.technical || undefined,
    tactical: prospect.tactical || undefined,
    coachable: prospect.coachable || undefined,
    status: statusFromDb(prospect.status),
    email: prospect.email || undefined,
    phone: prospect.phone || undefined,
    parentEmail: prospect.parent_email || undefined,
    parentPhone: prospect.parent_phone || undefined,
    parentName: prospect.parent_name || undefined,
    gpa: prospect.gpa || undefined,
    gradYear: prospect.grad_year || undefined,
    satAct: prospect.sat_act || undefined,
    videoLink: prospect.video_link || undefined,
    club: prospect.club || undefined,
    teamLevel: prospect.team_level || undefined,
    interestedProgram: prospect.interested_program || undefined,
    placedLocation: prospect.placed_location || undefined,
    evaluation: parseEvaluation(prospect.evaluation),
    outreachLogs: outreachLogs,
    notes: prospect.notes || undefined,
    submittedAt: prospect.submitted_at,
    lastActive: prospect.last_active || undefined,
    lastContactedAt: prospect.last_contacted_at || undefined,
    activityStatus: prospect.activity_status || 'undiscovered',
    isRecalibrating: false,
    previousScore: undefined,
  }
}

// Map frontend status enum to database lowercase string
// Using 5-stage pipeline: Lead → Contacted → Interested → Offered → Placed
function statusToDb(status: PlayerStatus): ScoutProspect['status'] {
  const mapping: Record<PlayerStatus, ScoutProspect['status']> = {
    [PlayerStatus.LEAD]: 'lead',
    [PlayerStatus.CONTACTED]: 'contacted',
    [PlayerStatus.INTERESTED]: 'interested',
    [PlayerStatus.OFFERED]: 'offered',
    [PlayerStatus.PLACED]: 'placed',
    [PlayerStatus.ARCHIVED]: 'archived',
  }
  return mapping[status] || 'lead'
}

// Map database status to frontend enum
function statusFromDb(status: ScoutProspect['status']): PlayerStatus {
  const mapping: Record<string, PlayerStatus> = {
    'lead': PlayerStatus.LEAD,
    'contacted': PlayerStatus.CONTACTED,
    'interested': PlayerStatus.INTERESTED,
    'offered': PlayerStatus.OFFERED,
    'placed': PlayerStatus.PLACED,
    'archived': PlayerStatus.ARCHIVED,
    // Legacy mappings for old data
    'prospect': PlayerStatus.LEAD,
    'final_review': PlayerStatus.OFFERED,
  }
  return mapping[status] || PlayerStatus.LEAD
}

export function useProspects(scoutId: string | undefined) {
  const [prospects, setProspects] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load prospects on mount or when scoutId changes
  useEffect(() => {
    if (scoutId) {
      loadProspects()
    }
  }, [scoutId])

  // Real-time subscription disabled - using REST API only
  // The WebSocket connection was failing repeatedly with "bad response from server"
  // Local state updates are handled directly in addProspect/updateProspect/deleteProspect

  const loadProspects = async () => {
    setLoading(true)

    if (!scoutId || !isSupabaseConfigured) {
      setLoading(false)
      return
    }

    try {
      // Load from Supabase using REST API
      const { data: prospectsData, error: prospectsError } = await supabaseRest.select<ScoutProspect>(
        'scout_prospects',
        `scout_id=eq.${scoutId}&order=created_at.desc`
      )

      if (prospectsError) throw new Error(prospectsError.message)

      // Load outreach logs for each prospect
      const { data: logsData, error: logsError } = await supabaseRest.select<any>(
        'scout_outreach_logs',
        `scout_id=eq.${scoutId}&order=created_at.desc`
      )

      if (logsError) throw new Error(logsError.message)

      // Group logs by prospect
      const logsByProspect: Record<string, OutreachLog[]> = {}
      ;(logsData as any[] || []).forEach((log: any) => {
        if (!logsByProspect[log.prospect_id]) {
          logsByProspect[log.prospect_id] = []
        }
        logsByProspect[log.prospect_id].push({
          id: log.id,
          date: log.created_at,
          method: log.method as 'Email' | 'WhatsApp' | 'Clipboard',
          templateName: log.template_name,
          note: log.note || undefined,
        })
      })

      const players = (prospectsData as any[] || []).map((p: any) =>
        prospectToPlayer(p, logsByProspect[p.id] || [])
      ) || []

      console.log('[loadProspects] Loaded', players.length, 'prospects for scoutId:', scoutId)
      setProspects(players)
    } catch (err) {
      console.error('Error loading prospects:', err)
      setError(err instanceof Error ? err.message : 'Failed to load prospects')
    } finally {
      setLoading(false)
    }
  }

  const addProspect = useCallback(
    async (player: Player): Promise<Player | null> => {
      console.log('========== ADD PROSPECT START ==========')
      console.log('[addProspect] scoutId:', scoutId)
      console.log('[addProspect] isSupabaseConfigured:', isSupabaseConfigured)
      console.log('[addProspect] player:', player.name)

      if (!scoutId) {
        console.error('[addProspect] ERROR: scoutId is undefined!')
        return null
      }

      if (!isSupabaseConfigured) {
        console.error('[addProspect] ERROR: Supabase not configured!')
        return null
      }

      try {
        const prospectData = playerToProspect(player, scoutId)
        console.log('[addProspect] player.status:', player.status)
        console.log('[addProspect] prospectData.status:', prospectData.status)
        console.log('[addProspect] Calling supabaseRest.insert...')

        // Use direct REST API to bypass Supabase JS client issues
        const { data, error } = await supabaseRest.insert<ScoutProspect>('scout_prospects', prospectData)

        console.log('[addProspect] Insert completed. data:', data ? 'yes' : 'no', 'error:', error?.message || 'none')

        if (error) throw new Error(error.message)
        if (!data) throw new Error('No data returned from insert')

        const newPlayer = prospectToPlayer(data)
        console.log('[addProspect] SUCCESS! New player ID:', newPlayer.id)
        console.log('[addProspect] Returned data.status:', data.status)
        console.log('[addProspect] newPlayer.status:', newPlayer.status)
        // Real-time will handle the update, but update locally too for immediate UI feedback
        setProspects((prev) => [newPlayer, ...prev])
        return newPlayer
      } catch (err) {
        console.error('[addProspect] CATCH ERROR:', err)
        setError(err instanceof Error ? err.message : 'Failed to add prospect')
        return null
      }
    },
    [scoutId]
  )

  const updateProspect = useCallback(
    async (playerId: string, updates: Partial<Player>): Promise<void> => {
      console.log('[updateProspect] Updating player:', playerId, 'with:', updates)

      if (!isSupabaseConfigured) {
        console.error('[updateProspect] Supabase not configured')
        return
      }

      try {
        const dbUpdates: ScoutProspectUpdate = {}

        // Map frontend fields to database fields
        if (updates.name !== undefined) dbUpdates.name = updates.name
        if (updates.age !== undefined) dbUpdates.age = updates.age
        if (updates.position !== undefined) dbUpdates.position = updates.position
        if (updates.email !== undefined) dbUpdates.email = updates.email
        if (updates.phone !== undefined) dbUpdates.phone = updates.phone
        if (updates.height !== undefined) dbUpdates.height = updates.height
        if (updates.weight !== undefined) dbUpdates.weight = updates.weight
        if (updates.dominantFoot !== undefined) dbUpdates.dominant_foot = updates.dominantFoot
        if (updates.nationality !== undefined) dbUpdates.nationality = updates.nationality
        if (updates.hasEuPassport !== undefined) dbUpdates.has_eu_passport = updates.hasEuPassport
        if (updates.club !== undefined) dbUpdates.club = updates.club
        if (updates.teamLevel !== undefined) dbUpdates.team_level = updates.teamLevel
        if (updates.videoLink !== undefined) dbUpdates.video_link = updates.videoLink
        if (updates.gpa !== undefined) dbUpdates.gpa = updates.gpa
        if (updates.gradYear !== undefined) dbUpdates.grad_year = updates.gradYear
        if (updates.satAct !== undefined) dbUpdates.sat_act = updates.satAct
        if (updates.parentName !== undefined) dbUpdates.parent_name = updates.parentName
        if (updates.parentEmail !== undefined) dbUpdates.parent_email = updates.parentEmail
        if (updates.parentPhone !== undefined) dbUpdates.parent_phone = updates.parentPhone
        if (updates.pace !== undefined) dbUpdates.pace = updates.pace
        if (updates.physical !== undefined) dbUpdates.physical = updates.physical
        if (updates.technical !== undefined) dbUpdates.technical = updates.technical
        if (updates.tactical !== undefined) dbUpdates.tactical = updates.tactical
        if (updates.coachable !== undefined) dbUpdates.coachable = updates.coachable
        if (updates.evaluation !== undefined) dbUpdates.evaluation = evaluationToJson(updates.evaluation)
        if (updates.status !== undefined) dbUpdates.status = statusToDb(updates.status)
        if (updates.activityStatus !== undefined) dbUpdates.activity_status = updates.activityStatus
        if (updates.interestedProgram !== undefined) dbUpdates.interested_program = updates.interestedProgram
        if (updates.placedLocation !== undefined) dbUpdates.placed_location = updates.placedLocation
        if (updates.notes !== undefined) dbUpdates.notes = updates.notes
        if (updates.lastContactedAt !== undefined) dbUpdates.last_contacted_at = updates.lastContactedAt

        // Use direct REST API to bypass Supabase JS client issues
        const { error, data } = await supabaseRest.update('scout_prospects', `id=eq.${playerId}`, dbUpdates)

        if (error) {
          console.error('[updateProspect] REST API error:', error.message)
          throw new Error(error.message)
        }

        console.log('[updateProspect] Success! Response:', data)

        // Update local state (real-time will also update)
        setProspects((prev) =>
          prev.map((p) => (p.id === playerId ? { ...p, ...updates } : p))
        )
      } catch (err) {
        console.error('[updateProspect] Exception:', err)
        setError(err instanceof Error ? err.message : 'Failed to update prospect')
      }
    },
    [] // No dependencies needed - uses only parameters and setProspects
  )

  const deleteProspect = useCallback(
    async (playerId: string): Promise<void> => {
      if (!isSupabaseConfigured) return

      try {
        // Use direct REST API to bypass Supabase JS client issues
        const { error } = await supabaseRest.delete('scout_prospects', `id=eq.${playerId}`)

        if (error) throw new Error(error.message)

        setProspects((prev) => prev.filter((p) => p.id !== playerId))
      } catch (err) {
        console.error('Error deleting prospect:', err)
        setError(err instanceof Error ? err.message : 'Failed to delete prospect')
      }
    },
    [] // No dependencies needed
  )

  return {
    prospects,
    loading,
    error,
    addProspect,
    updateProspect,
    deleteProspect,
    refreshProspects: loadProspects,
  }
}
