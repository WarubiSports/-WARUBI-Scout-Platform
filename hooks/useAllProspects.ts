import { useState, useEffect, useCallback } from 'react'
import { isSupabaseConfigured, supabaseRest } from '../lib/supabase'
import type { ScoutProspect, Scout } from '../lib/database.types'
import { PlayerStatus } from '../types'
import type { Player } from '../types'
import { parseEvaluation } from '../lib/guards'

// Extended Player type with scout info
export interface PlayerWithScout extends Player {
  scoutId: string
  scoutName: string
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
    'prospect': PlayerStatus.LEAD,
    'final_review': PlayerStatus.OFFERED,
  }
  return mapping[status] || PlayerStatus.LEAD
}

// Map database scout_prospects to frontend Player type with scout info
function prospectToPlayerWithScout(prospect: ScoutProspect, scoutName: string): PlayerWithScout {
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
    outreachLogs: [],
    notes: prospect.notes || undefined,
    submittedAt: prospect.submitted_at,
    lastActive: prospect.last_active || undefined,
    lastContactedAt: prospect.last_contacted_at || undefined,
    activityStatus: prospect.activity_status || 'undiscovered',
    isRecalibrating: false,
    previousScore: undefined,
    // Scout info
    scoutId: prospect.scout_id,
    scoutName: scoutName,
  }
}

interface UseAllProspectsReturn {
  prospects: PlayerWithScout[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

export function useAllProspects(): UseAllProspectsReturn {
  const [prospects, setProspects] = useState<PlayerWithScout[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadAllProspects = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Fetch all scouts first to get names
      const { data: scoutsData, error: scoutsError } = await supabaseRest.select<Scout>(
        'scouts',
        'select=id,name'
      )

      if (scoutsError) throw new Error(scoutsError.message)

      // Create a map of scout_id -> scout_name
      const scoutNameMap: Record<string, string> = {}
      ;(scoutsData || []).forEach((scout) => {
        scoutNameMap[scout.id] = scout.name
      })

      // Fetch all prospects (no scout_id filter)
      const { data: prospectsData, error: prospectsError } = await supabaseRest.select<ScoutProspect>(
        'scout_prospects',
        'order=created_at.desc'
      )

      if (prospectsError) throw new Error(prospectsError.message)

      // Convert to PlayerWithScout
      const players = (prospectsData || []).map((p) =>
        prospectToPlayerWithScout(p, scoutNameMap[p.scout_id] || 'Unknown')
      )

      setProspects(players)
    } catch (err) {
      console.error('Error loading all prospects:', err)
      setError(err instanceof Error ? err.message : 'Failed to load prospects')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAllProspects()
  }, [loadAllProspects])

  return {
    prospects,
    loading,
    error,
    refresh: loadAllProspects,
  }
}
