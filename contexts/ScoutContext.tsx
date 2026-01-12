import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import type { Scout, ScoutInsert, ScoutUpdate } from '../lib/database.types'
import type { UserProfile } from '../types'

interface ScoutContextType {
  scout: Scout | null
  loading: boolean
  error: string | null
  xpScore: number
  placementsCount: number
  initializeScout: (profile: UserProfile, userId?: string) => Promise<Scout | null>
  updateScout: (updates: Partial<ScoutUpdate>) => Promise<void>
  addXP: (points: number) => Promise<void>
  incrementPlacements: () => Promise<void>
  refreshScout: () => Promise<void>
  clearScout: () => void
}

const ScoutContext = createContext<ScoutContextType | undefined>(undefined)

interface ScoutProviderProps {
  children: ReactNode
  userId?: string | null
}

export function ScoutProvider({ children, userId }: ScoutProviderProps) {
  const [scout, setScout] = useState<Scout | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load scout on mount or when userId changes
  useEffect(() => {
    // Add timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      console.warn('Scout loading timed out, proceeding without scout data')
      setLoading(false)
    }, 5000)

    loadScout().finally(() => {
      clearTimeout(timeoutId)
    })

    return () => clearTimeout(timeoutId)
  }, [userId])

  const loadScout = async () => {
    setLoading(true)
    try {
      if (!isSupabaseConfigured) {
        console.warn('Supabase not configured')
        setLoading(false)
        return
      }

      // Only query if we have a userId (authenticated user)
      if (!userId) {
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('scouts')
        .select('*')
        .eq('user_id', userId)
        .limit(1)
        .maybeSingle()

      if (error) {
        console.warn('Supabase error:', error.message)
        setError(error.message)
      } else if (data) {
        setScout(data)
      }
    } catch (err) {
      console.error('Error loading scout:', err)
      setError(err instanceof Error ? err.message : 'Failed to load scout')
    } finally {
      setLoading(false)
    }
  }

  const refreshScout = useCallback(async () => {
    if (!scout?.id) return

    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('scouts')
        .select('*')
        .eq('id', scout.id)
        .single()

      if (!error && data) {
        setScout(data)
      }
    }
  }, [scout?.id])

  const clearScout = useCallback(() => {
    setScout(null)
  }, [])

  const initializeScout = async (profile: UserProfile, authUserId?: string): Promise<Scout | null> => {
    const scoutData: ScoutInsert = {
      user_id: authUserId || userId || null,
      name: profile.name,
      region: profile.region,
      roles: profile.roles,
      affiliation: profile.affiliation || null,
      bio: profile.bio || null,
      scout_persona: profile.scoutPersona || null,
      lead_magnet_active: profile.leadMagnetActive || false,
      is_admin: profile.isAdmin || false,
      xp_score: 0,
      level: 1,
      placements_count: 0,
      status: 'active',
    }

    if (!isSupabaseConfigured) {
      console.error('Supabase not configured - cannot create scout')
      setError('Database not configured')
      return null
    }

    try {
      const { data, error } = await supabase
        .from('scouts')
        .insert(scoutData as any)
        .select()
        .single()

      if (error) throw error
      setScout(data)
      return data
    } catch (err) {
      console.error('Error creating scout:', err)
      setError(err instanceof Error ? err.message : 'Failed to create scout')
      return null
    }
  }

  const updateScout = async (updates: Partial<ScoutUpdate>) => {
    if (!scout) return

    const updatedScout = { ...scout, ...updates, updated_at: new Date().toISOString() }

    if (isSupabaseConfigured) {
      try {
        const { error } = await (supabase
          .from('scouts') as any)
          .update(updates)
          .eq('id', scout.id)

        if (error) throw error
        setScout(updatedScout as Scout)
      } catch (err) {
        console.error('Error updating scout:', err)
        setError(err instanceof Error ? err.message : 'Failed to update scout')
      }
    }
  }

  const addXP = async (points: number) => {
    if (!scout) return

    const newXP = (scout.xp_score || 0) + points
    const newLevel = Math.floor(newXP / 100) + 1

    await updateScout({ xp_score: newXP, level: newLevel })
  }

  const incrementPlacements = async () => {
    if (!scout) return

    const newCount = (scout.placements_count || 0) + 1
    await updateScout({ placements_count: newCount })
  }

  return (
    <ScoutContext.Provider
      value={{
        scout,
        loading,
        error,
        xpScore: scout?.xp_score || 0,
        placementsCount: scout?.placements_count || 0,
        initializeScout,
        updateScout,
        addXP,
        incrementPlacements,
        refreshScout,
        clearScout,
      }}
    >
      {children}
    </ScoutContext.Provider>
  )
}

export function useScoutContext() {
  const context = useContext(ScoutContext)
  if (context === undefined) {
    throw new Error('useScoutContext must be used within a ScoutProvider')
  }
  return context
}
