import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { isSupabaseConfigured, supabaseRest } from '../lib/supabase'
import type { ScoutProspect, ScoutProspectInsert, ScoutProspectUpdate } from '../lib/database.types'
import { PlayerStatus } from '../types'
import type { Player, OutreachLog } from '../types'
import { parseEvaluation, evaluationToJson } from '../lib/guards'

// Pagination settings - set to 0 for no limit (load all)
const DEFAULT_PAGE_SIZE = 0 // Load all by default for backwards compatibility

// Map frontend Player type to database scout_prospects
export function playerToProspect(player: Player, scoutId: string): ScoutProspectInsert {
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
    offered_pathway: player.offeredPathway || null,
    placed_location: player.placedLocation || null,
    notes: player.notes || null,
    last_contacted_at: player.lastContactedAt || null,
    date_of_birth: player.dateOfBirth || null,
  }
}

// Map database scout_prospects to frontend Player type
export function prospectToPlayer(prospect: ScoutProspect, outreachLogs: OutreachLog[] = []): Player {
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
    dateOfBirth: prospect.date_of_birth || undefined,
    club: prospect.club || undefined,
    teamLevel: prospect.team_level || undefined,
    interestedProgram: prospect.interested_program || undefined,
    offeredPathway: prospect.offered_pathway || undefined,
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
export function statusToDb(status: PlayerStatus): ScoutProspect['status'] {
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
export function statusFromDb(status: ScoutProspect['status']): PlayerStatus {
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

// Fetch prospects with optional pagination
async function fetchProspects(
  scoutId: string,
  page: number,
  pageSize: number
): Promise<{ players: Player[]; hasMore: boolean; total: number }> {
  if (!isSupabaseConfigured) {
    return { players: [], hasMore: false, total: 0 }
  }

  // Build query - if pageSize is 0, load all (no limit)
  let query = `scout_id=eq.${scoutId}&order=created_at.desc`
  let offset = 0
  if (pageSize > 0) {
    offset = page * pageSize
    query += `&limit=${pageSize + 1}&offset=${offset}`
  }

  // Load prospects
  const { data: prospectsData, error: prospectsError } = await supabaseRest.select<ScoutProspect>(
    'scout_prospects',
    query
  )

  if (prospectsError) throw new Error(prospectsError.message)

  const prospects = prospectsData || []

  // Handle pagination only if pageSize > 0
  const hasMore = pageSize > 0 && prospects.length > pageSize
  const paginatedProspects = hasMore ? prospects.slice(0, pageSize) : prospects

  // Get prospect IDs for fetching logs
  const prospectIds = paginatedProspects.map((p) => p.id)

  // Load outreach logs only for fetched prospects (batch query)
  let logsByProspect: Record<string, OutreachLog[]> = {}
  if (prospectIds.length > 0) {
    const { data: logsData, error: logsError } = await supabaseRest.select<any>(
      'scout_outreach_logs',
      `prospect_id=in.(${prospectIds.join(',')})&order=created_at.desc`
    )

    if (!logsError && logsData) {
      ;(logsData as any[]).forEach((log: any) => {
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
    }
  }

  const players = paginatedProspects.map((p) =>
    prospectToPlayer(p, logsByProspect[p.id] || [])
  )

  return {
    players,
    hasMore,
    total: players.length + offset + (hasMore ? 1 : 0),
  }
}

export function useProspects(scoutId: string | undefined) {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(0)
  const [allProspects, setAllProspects] = useState<Player[]>([])

  // Query key for this scout's prospects
  const queryKey = ['prospects', scoutId, page]

  // Use React Query for data fetching with caching
  const {
    data,
    isLoading: loading,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey,
    queryFn: () => fetchProspects(scoutId!, page, DEFAULT_PAGE_SIZE),
    enabled: !!scoutId && isSupabaseConfigured,
    staleTime: 30 * 1000, // 30 seconds
  })

  // Accumulate prospects for infinite scroll
  const prospects = data?.players || []
  const hasMore = data?.hasMore || false

  // Add mutation for adding prospects
  const addMutation = useMutation({
    mutationFn: async (player: Player) => {
      if (!scoutId) throw new Error('No scout ID')
      if (!isSupabaseConfigured) throw new Error('Supabase not configured')

      const prospectData = playerToProspect(player, scoutId)
      const { data, error } = await supabaseRest.insert<ScoutProspect>('scout_prospects', prospectData)

      if (error) throw new Error(error.message)
      if (!data) throw new Error('No data returned from insert')

      return prospectToPlayer(data)
    },
    onSuccess: (newPlayer) => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['prospects', scoutId] })
    },
  })

  // Add mutation for updating prospects
  const updateMutation = useMutation({
    mutationFn: async ({ playerId, updates }: { playerId: string; updates: Partial<Player> }) => {
      if (!isSupabaseConfigured) throw new Error('Supabase not configured')

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
      if (updates.offeredPathway !== undefined) dbUpdates.offered_pathway = updates.offeredPathway
      if (updates.placedLocation !== undefined) dbUpdates.placed_location = updates.placedLocation
      if (updates.notes !== undefined) dbUpdates.notes = updates.notes
      if (updates.lastContactedAt !== undefined) dbUpdates.last_contacted_at = updates.lastContactedAt

      const { error } = await supabaseRest.update('scout_prospects', `id=eq.${playerId}`, dbUpdates)

      if (error) throw new Error(error.message)

      return { playerId, updates }
    },
    onSuccess: ({ playerId, updates }) => {
      // Optimistic update - update cache directly
      queryClient.setQueryData(queryKey, (old: any) => {
        if (!old) return old
        return {
          ...old,
          players: old.players.map((p: Player) =>
            p.id === playerId ? { ...p, ...updates } : p
          ),
        }
      })
    },
  })

  // Add mutation for deleting prospects
  const deleteMutation = useMutation({
    mutationFn: async (playerId: string) => {
      if (!isSupabaseConfigured) throw new Error('Supabase not configured')

      const { error } = await supabaseRest.delete('scout_prospects', `id=eq.${playerId}`)

      if (error) throw new Error(error.message)

      return playerId
    },
    onSuccess: (playerId) => {
      // Optimistic update - remove from cache
      queryClient.setQueryData(queryKey, (old: any) => {
        if (!old) return old
        return {
          ...old,
          players: old.players.filter((p: Player) => p.id !== playerId),
        }
      })
    },
  })

  // Wrapper functions for backwards compatibility
  const addProspect = useCallback(
    async (player: Player): Promise<Player | null> => {
      try {
        return await addMutation.mutateAsync(player)
      } catch (err) {
        console.error('[addProspect] Error:', err)
        return null
      }
    },
    [addMutation]
  )

  const updateProspect = useCallback(
    async (playerId: string, updates: Partial<Player>): Promise<void> => {
      try {
        await updateMutation.mutateAsync({ playerId, updates })
      } catch (err) {
        console.error('[updateProspect] Error:', err)
      }
    },
    [updateMutation]
  )

  const deleteProspect = useCallback(
    async (playerId: string): Promise<void> => {
      try {
        await deleteMutation.mutateAsync(playerId)
      } catch (err) {
        console.error('[deleteProspect] Error:', err)
      }
    },
    [deleteMutation]
  )

  // Load more function for pagination
  const loadMore = useCallback(() => {
    if (hasMore && !loading) {
      setPage((p) => p + 1)
    }
  }, [hasMore, loading])

  return {
    prospects,
    loading,
    error: queryError?.message || null,
    addProspect,
    updateProspect,
    deleteProspect,
    refreshProspects: () => refetch(),
    // Pagination
    hasMore,
    loadMore,
    page,
    pageSize: DEFAULT_PAGE_SIZE,
  }
}
