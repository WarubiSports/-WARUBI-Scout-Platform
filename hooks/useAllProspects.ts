import { useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { isSupabaseConfigured, supabaseRest } from '../lib/supabase'
import type { ScoutProspect, Scout } from '../lib/database.types'
import { PlayerStatus } from '../types'
import type { Player } from '../types'
import { parseEvaluation } from '../lib/guards'

// Pagination settings - set to 0 for no limit (load all)
const DEFAULT_PAGE_SIZE = 0 // Load all by default for backwards compatibility

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

// Fetch all prospects with pagination (for admin view)
async function fetchAllProspects(
  page: number,
  pageSize: number
): Promise<{ players: PlayerWithScout[]; hasMore: boolean; scoutMap: Record<string, string> }> {
  if (!isSupabaseConfigured) {
    return { players: [], hasMore: false, scoutMap: {} }
  }

  // Fetch all scouts first to get names (cached by React Query)
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

  // Build query - if pageSize is 0, load all (no limit)
  let query = 'order=created_at.desc'
  if (pageSize > 0) {
    const offset = page * pageSize
    query += `&limit=${pageSize + 1}&offset=${offset}`
  }

  // Fetch prospects
  const { data: prospectsData, error: prospectsError } = await supabaseRest.select<ScoutProspect>(
    'scout_prospects',
    query
  )

  if (prospectsError) throw new Error(prospectsError.message)

  const prospects = prospectsData || []

  // Handle pagination only if pageSize > 0
  const hasMore = pageSize > 0 && prospects.length > pageSize
  const paginatedProspects = hasMore ? prospects.slice(0, pageSize) : prospects

  // Convert to PlayerWithScout
  const players = paginatedProspects.map((p) =>
    prospectToPlayerWithScout(p, scoutNameMap[p.scout_id] || 'Unknown')
  )

  return { players, hasMore, scoutMap: scoutNameMap }
}

interface UseAllProspectsReturn {
  prospects: PlayerWithScout[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  // Pagination
  hasMore: boolean
  loadMore: () => void
  page: number
  pageSize: number
}

export function useAllProspects(): UseAllProspectsReturn {
  const [page, setPage] = useState(0)

  // Query key for all prospects
  const queryKey = ['all-prospects', page]

  // Use React Query for data fetching with caching
  const {
    data,
    isLoading: loading,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey,
    queryFn: () => fetchAllProspects(page, DEFAULT_PAGE_SIZE),
    enabled: isSupabaseConfigured,
    staleTime: 30 * 1000, // 30 seconds
  })

  const prospects = data?.players || []
  const hasMore = data?.hasMore || false

  // Load more function for pagination
  const loadMore = useCallback(() => {
    if (hasMore && !loading) {
      setPage((p) => p + 1)
    }
  }, [hasMore, loading])

  return {
    prospects,
    loading,
    error: queryError instanceof Error ? queryError.message : null,
    refresh: async () => { await refetch() },
    // Pagination
    hasMore,
    loadMore,
    page,
    pageSize: DEFAULT_PAGE_SIZE,
  }
}
