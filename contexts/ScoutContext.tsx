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
    let isMounted = true

    // Only set timeout if we actually need to load (have a userId)
    if (!userId) {
      setLoading(false)
      return
    }

    // Timeout as fallback - 5 seconds should be enough
    const timeoutId = setTimeout(() => {
      if (isMounted) {
        console.warn('Scout loading timed out, proceeding without scout data')
        setLoading(false)
      }
    }, 5000)

    loadScout().finally(() => {
      if (isMounted) {
        clearTimeout(timeoutId)
      }
    })

    return () => {
      isMounted = false
      clearTimeout(timeoutId)
    }
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
        console.log('ScoutContext: No userId, skipping load')
        setLoading(false)
        return
      }

      console.log('ScoutContext: Loading scout for userId:', userId)

      // Try fetch with user's session token
      let data = null
      let error = null

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

      // Get the session token directly from localStorage (Supabase stores it there)
      let accessToken = null
      try {
        const storageKey = `sb-${supabaseUrl?.split('//')[1]?.split('.')[0]}-auth-token`
        const storedSession = localStorage.getItem(storageKey)
        if (storedSession) {
          const parsed = JSON.parse(storedSession)
          accessToken = parsed?.access_token
          console.log('ScoutContext: Got token from localStorage')
        }
      } catch (e) {
        console.warn('ScoutContext: Failed to get token from localStorage')
      }

      if (supabaseUrl && supabaseKey && accessToken) {
        try {
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), 4000)

          const response = await fetch(
            `${supabaseUrl}/rest/v1/scouts?user_id=eq.${userId}&limit=1`,
            {
              headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
              },
              signal: controller.signal
            }
          )
          clearTimeout(timeoutId)

          if (response.ok) {
            const results = await response.json()
            data = results[0] || null
            console.log('ScoutContext: Fetch succeeded, data:', data ? 'found' : 'none')
          } else {
            error = { message: `HTTP ${response.status}` }
          }
        } catch (e) {
          console.warn('ScoutContext: Fetch failed:', e)
          error = { message: e instanceof Error ? e.message : 'Fetch error' }
        }
      } else {
        console.warn('ScoutContext: Missing credentials or session')
      }

      console.log('ScoutContext: Query result:', { data: data ? 'found' : 'null', error: error?.message })

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
