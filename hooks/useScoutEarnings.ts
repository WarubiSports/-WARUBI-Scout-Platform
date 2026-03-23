import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { isSupabaseConfigured, supabaseRest } from '../lib/supabase'
import type { ScoutAgreement } from '../lib/database.types'
import type { Player } from '../types'
import { PlayerStatus } from '../types'

export interface EarningsBreakdown {
  placed: number      // confirmed earnings
  pipeline: number    // projected from active players
  total: number       // placed + pipeline
  currency: string
  perPlayerRate: number // default full-season rate
  placedCount: number
  pipelineCount: number
  hasAgreement: boolean
}

// Estimate per-player value based on program duration and agreement rates
function getPlayerRate(player: Player, agreement: ScoutAgreement): number {
  const duration = player.programDuration
  switch (duration) {
    case '1_month': return agreement.rate_1_month || agreement.rate_3_months
    case '3_months': return agreement.rate_3_months
    case '6_months': return agreement.rate_6_months
    case 'full_season': return agreement.rate_full_season
    default: return agreement.rate_full_season // assume full season if unknown
  }
}

// Pipeline weight by stage — how likely is this player to convert?
function getStageWeight(status: PlayerStatus): number {
  switch (status) {
    case PlayerStatus.LEAD: return 0.1
    case PlayerStatus.CONTACT_REQUESTED: return 0.2
    case PlayerStatus.REQUEST_TRIAL: return 0.4
    case PlayerStatus.OFFERED: return 0.85
    case PlayerStatus.PLACED: return 1
    default: return 0
  }
}

export function useScoutEarnings(scoutId: string | undefined, players: Player[]) {
  const { data: agreement } = useQuery({
    queryKey: ['scout-agreement', scoutId],
    queryFn: async () => {
      if (!isSupabaseConfigured || !scoutId) return null
      const { data, error } = await supabaseRest.select<ScoutAgreement>(
        'scout_agreements',
        `scout_id=eq.${scoutId}&is_active=eq.true&limit=1`
      )
      if (error || !data?.length) return null
      return data[0]
    },
    enabled: !!scoutId && isSupabaseConfigured,
    staleTime: 60 * 1000,
  })

  const earnings = useMemo((): EarningsBreakdown => {
    if (!agreement) {
      return { placed: 0, pipeline: 0, total: 0, currency: 'EUR', perPlayerRate: 0, placedCount: 0, pipelineCount: 0, hasAgreement: false }
    }

    const activePlayers = players.filter(p => p.status !== PlayerStatus.ARCHIVED)
    const placedPlayers = players.filter(p => p.status === PlayerStatus.PLACED)
    const pipelinePlayers = activePlayers.filter(p => p.status !== PlayerStatus.PLACED)

    const placed = placedPlayers.reduce((sum, p) => sum + getPlayerRate(p, agreement), 0)
    const pipeline = pipelinePlayers.reduce((sum, p) => {
      const rate = getPlayerRate(p, agreement)
      const weight = getStageWeight(p.status)
      return sum + (rate * weight)
    }, 0)

    return {
      placed,
      pipeline: Math.round(pipeline),
      total: placed + Math.round(pipeline),
      currency: agreement.currency,
      perPlayerRate: agreement.rate_full_season,
      placedCount: placedPlayers.length,
      pipelineCount: pipelinePlayers.length,
      hasAgreement: true,
    }
  }, [agreement, players])

  return earnings
}
