import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import type { Scout, ScoutInsert, ScoutUpdate } from '../lib/database.types'
import type { UserProfile } from '../types'

interface ScoutContextType {
  scout: Scout | null
  loading: boolean
  error: string | null
  isDemo: boolean
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

// Local storage key for demo mode
const DEMO_SCOUT_KEY = 'warubi_demo_scout'

interface ScoutProviderProps {
  children: ReactNode
  userId?: string | null
  forceDemoMode?: boolean
}

export function ScoutProvider({ children, userId, forceDemoMode = false }: ScoutProviderProps) {
  const [scout, setScout] = useState<Scout | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDemo, setIsDemo] = useState(!isSupabaseConfigured || forceDemoMode)

  // Load scout on mount or when userId/forceDemoMode changes
  useEffect(() => {
    loadScout()
  }, [userId, forceDemoMode])

  const loadScout = async () => {
    setLoading(true)
    try {
      // First, always check localStorage for a demo scout
      const stored = localStorage.getItem(DEMO_SCOUT_KEY)
      const demoScout = stored ? JSON.parse(stored) : null

      // If demo mode is forced, use localStorage only
      if (forceDemoMode) {
        if (demoScout) {
          setScout(demoScout)
        }
        setIsDemo(true)
        setLoading(false)
        return
      }

      if (isSupabaseConfigured) {
        let query = supabase.from('scouts').select('*')

        // If authenticated, load scout by user_id
        if (userId) {
          query = query.eq('user_id', userId)
        }

        const { data, error } = await query.limit(1).maybeSingle()

        if (error) {
          console.warn('Supabase error, falling back to demo:', error.message)
          // Fall back to demo mode if Supabase fails
          if (demoScout) {
            setScout(demoScout)
            setIsDemo(true)
          }
        } else if (data) {
          setScout(data)
          setIsDemo(false)
        } else if (demoScout) {
          // No Supabase data, but we have a demo scout in localStorage
          setScout(demoScout)
          setIsDemo(true)
        }
      } else {
        // Demo mode - use localStorage
        if (demoScout) {
          setScout(demoScout)
        }
        setIsDemo(true)
      }
    } catch (err) {
      console.error('Error loading scout:', err)
      setError(err instanceof Error ? err.message : 'Failed to load scout')
      // Try demo scout as last resort
      const stored = localStorage.getItem(DEMO_SCOUT_KEY)
      if (stored) {
        setScout(JSON.parse(stored))
        setIsDemo(true)
      }
    } finally {
      setLoading(false)
    }
  }

  const refreshScout = useCallback(async () => {
    if (!scout?.id) return

    if (isSupabaseConfigured && !isDemo) {
      const { data, error } = await supabase
        .from('scouts')
        .select('*')
        .eq('id', scout.id)
        .single()

      if (!error && data) {
        setScout(data)
      }
    }
  }, [scout?.id, isDemo])

  const clearScout = useCallback(() => {
    setScout(null)
    localStorage.removeItem(DEMO_SCOUT_KEY)
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

    // If in demo mode, always use localStorage
    if (forceDemoMode || isDemo) {
      return createDemoScout(scoutData)
    }

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('scouts')
          .insert(scoutData)
          .select()
          .single()

        if (error) throw error
        setScout(data)
        setIsDemo(false)
        return data
      } catch (err) {
        console.error('Error creating scout:', err)
        setError(err instanceof Error ? err.message : 'Failed to create scout')
        // Fall back to demo mode
        return createDemoScout(scoutData)
      }
    } else {
      return createDemoScout(scoutData)
    }
  }

  const createDemoScout = (data: ScoutInsert): Scout => {
    const demoScout: Scout = {
      id: `demo-${Date.now()}`,
      user_id: null,
      name: data.name,
      email: data.email || null,
      phone: data.phone || null,
      region: data.region,
      affiliation: data.affiliation || null,
      bio: data.bio || null,
      roles: data.roles || ['Regional Scout'],
      xp_score: 0,
      level: 1,
      placements_count: 0,
      scout_persona: data.scout_persona || null,
      lead_magnet_active: data.lead_magnet_active || false,
      status: 'active',
      is_admin: data.is_admin || false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    localStorage.setItem(DEMO_SCOUT_KEY, JSON.stringify(demoScout))
    setScout(demoScout)
    setIsDemo(true)
    return demoScout
  }

  const updateScout = async (updates: Partial<ScoutUpdate>) => {
    if (!scout) return

    const updatedScout = { ...scout, ...updates, updated_at: new Date().toISOString() }

    if (isSupabaseConfigured && !isDemo) {
      try {
        const { error } = await supabase
          .from('scouts')
          .update(updates)
          .eq('id', scout.id)

        if (error) throw error
        setScout(updatedScout as Scout)
      } catch (err) {
        console.error('Error updating scout:', err)
        setError(err instanceof Error ? err.message : 'Failed to update scout')
      }
    } else {
      // Demo mode - update localStorage
      localStorage.setItem(DEMO_SCOUT_KEY, JSON.stringify(updatedScout))
      setScout(updatedScout as Scout)
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
        isDemo,
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
