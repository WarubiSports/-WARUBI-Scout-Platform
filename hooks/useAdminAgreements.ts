import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { isSupabaseConfigured, supabaseRest } from '../lib/supabase'
import type { ScoutAgreement, ScoutAgreementInsert, ScoutAgreementUpdate } from '../lib/database.types'

export function useAdminAgreements() {
  const queryClient = useQueryClient()

  const { data: agreements = [], isLoading } = useQuery({
    queryKey: ['admin-agreements'],
    queryFn: async () => {
      if (!isSupabaseConfigured) return []
      const { data, error } = await supabaseRest.select<ScoutAgreement>(
        'scout_agreements',
        'order=created_at.desc'
      )
      if (error) throw new Error(error.message)
      return data || []
    },
    enabled: isSupabaseConfigured,
    staleTime: 30 * 1000,
  })

  const upsertMutation = useMutation({
    mutationFn: async ({ scoutId, data }: { scoutId: string; data: Partial<ScoutAgreementInsert> }) => {
      if (!isSupabaseConfigured) throw new Error('Not configured')

      // Check if agreement exists for this scout
      const existing = agreements.find(a => a.scout_id === scoutId)

      if (existing) {
        const updateData: ScoutAgreementUpdate = {
          ...data,
          updated_at: new Date().toISOString(),
        }
        const { error } = await supabaseRest.update('scout_agreements', `id=eq.${existing.id}`, updateData)
        if (error) throw new Error(error.message)
      } else {
        const insertData: ScoutAgreementInsert = {
          scout_id: scoutId,
          agreement_start: data.agreement_start || new Date().toISOString().split('T')[0],
          currency: data.currency || 'EUR',
          rate_full_season: data.rate_full_season ?? 5000,
          rate_6_months: data.rate_6_months ?? 3000,
          rate_3_months: data.rate_3_months ?? 2000,
          rate_1_month: data.rate_1_month,
          min_placements_per_year: data.min_placements_per_year ?? 4,
          is_active: data.is_active ?? true,
          notes: data.notes,
          agreement_pdf_url: data.agreement_pdf_url,
        }
        const { error } = await supabaseRest.insert('scout_agreements', insertData)
        if (error) throw new Error(error.message)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-agreements'] })
    },
  })

  const deactivateMutation = useMutation({
    mutationFn: async (agreementId: string) => {
      if (!isSupabaseConfigured) throw new Error('Not configured')
      const { error } = await supabaseRest.update('scout_agreements', `id=eq.${agreementId}`, {
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-agreements'] })
    },
  })

  const confirmEnrollmentMutation = useMutation({
    mutationFn: async (prospectId: string) => {
      if (!isSupabaseConfigured) throw new Error('Not configured')
      const { error } = await supabaseRest.update('scout_prospects', `id=eq.${prospectId}`, {
        enrollment_confirmed: true,
        enrollment_confirmed_at: new Date().toISOString(),
      })
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-prospects'] })
    },
  })

  const getAgreementForScout = useCallback((scoutId: string) => {
    return agreements.find(a => a.scout_id === scoutId && a.is_active) || null
  }, [agreements])

  return {
    agreements,
    loading: isLoading,
    upsertAgreement: upsertMutation.mutateAsync,
    deactivateAgreement: deactivateMutation.mutateAsync,
    confirmEnrollment: confirmEnrollmentMutation.mutateAsync,
    getAgreementForScout,
    saving: upsertMutation.isPending || deactivateMutation.isPending,
  }
}
