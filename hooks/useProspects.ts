import { useState, useEffect, useCallback } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import type { ScoutProspect, ScoutProspectInsert, ScoutProspectUpdate } from '../lib/database.types'
import { PlayerStatus } from '../types'
import type { Player, PlayerEvaluation, OutreachLog } from '../types'
import { parseEvaluation, evaluationToJson } from '../lib/guards'

// Local storage key for demo mode
const DEMO_PROSPECTS_KEY = 'warubi_demo_prospects'

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
function statusToDb(status: PlayerStatus): ScoutProspect['status'] {
  const mapping: Record<PlayerStatus, ScoutProspect['status']> = {
    [PlayerStatus.PROSPECT]: 'prospect',
    [PlayerStatus.LEAD]: 'lead',
    [PlayerStatus.INTERESTED]: 'interested',
    [PlayerStatus.FINAL_REVIEW]: 'final_review',
    [PlayerStatus.OFFERED]: 'offered',
    [PlayerStatus.PLACED]: 'placed',
    [PlayerStatus.ARCHIVED]: 'archived',
  }
  return mapping[status]
}

// Map database status to frontend enum
function statusFromDb(status: ScoutProspect['status']): PlayerStatus {
  const mapping: Record<ScoutProspect['status'], PlayerStatus> = {
    'prospect': PlayerStatus.PROSPECT,
    'lead': PlayerStatus.LEAD,
    'interested': PlayerStatus.INTERESTED,
    'final_review': PlayerStatus.FINAL_REVIEW,
    'offered': PlayerStatus.OFFERED,
    'placed': PlayerStatus.PLACED,
    'archived': PlayerStatus.ARCHIVED,
  }
  return mapping[status]
}

export function useProspects(scoutId: string | undefined, forceDemoMode: boolean = false) {
  const [prospects, setProspects] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Check if this is a demo scout ID (starts with "demo-") or demo mode is forced
  const isDemoScout = scoutId?.startsWith('demo-') ?? false
  const [isDemo, setIsDemo] = useState(!isSupabaseConfigured || isDemoScout || forceDemoMode)

  // Load prospects on mount or when scoutId/forceDemoMode changes
  useEffect(() => {
    if (scoutId || forceDemoMode) {
      loadProspects()
    }
  }, [scoutId, forceDemoMode])

  // Set up real-time subscription (skip in demo mode)
  useEffect(() => {
    if (!scoutId || !isSupabaseConfigured || isDemo || forceDemoMode) return

    const subscription = supabase
      .channel('prospect-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'scout_prospects',
          filter: `scout_id=eq.${scoutId}`,
        },
        (payload) => {
          handleRealtimeChange(payload)
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [scoutId, isDemo])

  const handleRealtimeChange = (payload: any) => {
    if (payload.eventType === 'INSERT') {
      const newPlayer = prospectToPlayer(payload.new)
      setProspects((prev) => [newPlayer, ...prev])
    } else if (payload.eventType === 'UPDATE') {
      setProspects((prev) =>
        prev.map((p) =>
          p.id === payload.new.id ? { ...p, ...prospectToPlayer(payload.new, p.outreachLogs) } : p
        )
      )
    } else if (payload.eventType === 'DELETE') {
      setProspects((prev) => prev.filter((p) => p.id !== payload.old.id))
    }
  }

  const loadProspects = async () => {
    setLoading(true)

    // If demo mode is forced or it's a demo scout, use localStorage only
    if (forceDemoMode || isDemoScout) {
      const stored = localStorage.getItem(DEMO_PROSPECTS_KEY)
      if (stored) {
        setProspects(JSON.parse(stored))
      }
      setIsDemo(true)
      setLoading(false)
      return
    }

    // For Supabase mode, we need a scoutId
    if (!scoutId) {
      setLoading(false)
      return
    }

    try {
      if (isSupabaseConfigured) {
        // Load from Supabase
        const { data: prospectsData, error: prospectsError } = await supabase
          .from('scout_prospects')
          .select('*')
          .eq('scout_id', scoutId)
          .order('created_at', { ascending: false })

        if (prospectsError) throw prospectsError

        // Load outreach logs for each prospect
        const { data: logsData, error: logsError } = await supabase
          .from('scout_outreach_logs')
          .select('*')
          .eq('scout_id', scoutId)
          .order('created_at', { ascending: false })

        if (logsError) throw logsError

        // Group logs by prospect
        const logsByProspect: Record<string, OutreachLog[]> = {}
        logsData?.forEach((log) => {
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

        const players = prospectsData?.map((p) =>
          prospectToPlayer(p, logsByProspect[p.id] || [])
        ) || []

        setProspects(players)
        setIsDemo(false)
      } else {
        // Demo mode - load from localStorage
        const stored = localStorage.getItem(DEMO_PROSPECTS_KEY)
        if (stored) {
          setProspects(JSON.parse(stored))
        }
        setIsDemo(true)
      }
    } catch (err) {
      console.error('Error loading prospects:', err)
      setError(err instanceof Error ? err.message : 'Failed to load prospects')
      // Fall back to demo mode
      setIsDemo(true)
    } finally {
      setLoading(false)
    }
  }

  const saveDemoProspects = (players: Player[]) => {
    localStorage.setItem(DEMO_PROSPECTS_KEY, JSON.stringify(players))
  }

  const addProspect = useCallback(
    async (player: Player): Promise<Player | null> => {
      if (!scoutId) return null

      if (isSupabaseConfigured && !isDemo) {
        try {
          const prospectData = playerToProspect(player, scoutId)
          const { data, error } = await supabase
            .from('scout_prospects')
            .insert(prospectData)
            .select()
            .single()

          if (error) throw error

          const newPlayer = prospectToPlayer(data)
          // Real-time will handle the update, but update locally too for immediate UI feedback
          setProspects((prev) => [newPlayer, ...prev])
          return newPlayer
        } catch (err) {
          console.error('Error adding prospect:', err)
          setError(err instanceof Error ? err.message : 'Failed to add prospect')
          // Fall back to demo mode for this operation
          return addDemoProspect(player)
        }
      } else {
        return addDemoProspect(player)
      }
    },
    [scoutId, isDemo]
  )

  const addDemoProspect = (player: Player): Player => {
    const newPlayer = { ...player, id: player.id || `demo-${Date.now()}` }
    const updated = [newPlayer, ...prospects]
    setProspects(updated)
    saveDemoProspects(updated)
    return newPlayer
  }

  const updateProspect = useCallback(
    async (playerId: string, updates: Partial<Player>): Promise<void> => {
      if (isSupabaseConfigured && !isDemo) {
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

          const { error } = await supabase
            .from('scout_prospects')
            .update(dbUpdates)
            .eq('id', playerId)

          if (error) throw error

          // Update local state (real-time will also update)
          setProspects((prev) =>
            prev.map((p) => (p.id === playerId ? { ...p, ...updates } : p))
          )
        } catch (err) {
          console.error('Error updating prospect:', err)
          setError(err instanceof Error ? err.message : 'Failed to update prospect')
          // Fall back to demo mode
          updateDemoProspect(playerId, updates)
        }
      } else {
        updateDemoProspect(playerId, updates)
      }
    },
    [isDemo, prospects]
  )

  const updateDemoProspect = (playerId: string, updates: Partial<Player>) => {
    const updated = prospects.map((p) => (p.id === playerId ? { ...p, ...updates } : p))
    setProspects(updated)
    saveDemoProspects(updated)
  }

  const deleteProspect = useCallback(
    async (playerId: string): Promise<void> => {
      if (isSupabaseConfigured && !isDemo) {
        try {
          const { error } = await supabase
            .from('scout_prospects')
            .delete()
            .eq('id', playerId)

          if (error) throw error

          setProspects((prev) => prev.filter((p) => p.id !== playerId))
        } catch (err) {
          console.error('Error deleting prospect:', err)
          setError(err instanceof Error ? err.message : 'Failed to delete prospect')
        }
      } else {
        const updated = prospects.filter((p) => p.id !== playerId)
        setProspects(updated)
        saveDemoProspects(updated)
      }
    },
    [isDemo, prospects]
  )

  return {
    prospects,
    loading,
    error,
    isDemo,
    addProspect,
    updateProspect,
    deleteProspect,
    refreshProspects: loadProspects,
  }
}
