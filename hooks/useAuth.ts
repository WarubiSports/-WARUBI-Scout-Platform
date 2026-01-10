import { useState, useEffect, useCallback } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import type { User, Session } from '@supabase/supabase-js'

interface AuthState {
  user: User | null
  session: Session | null
  loading: boolean
  error: string | null
}

interface UseAuthReturn extends AuthState {
  signInWithMagicLink: (email: string) => Promise<{ success: boolean; error?: string }>
  signInWithPassword: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  signUp: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  signOut: () => Promise<void>
  isAuthenticated: boolean
  isDemo: boolean
}

export function useAuth(): UseAuthReturn {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
    error: null,
  })

  const isDemo = !isSupabaseConfigured

  // Initialize auth state
  useEffect(() => {
    if (!isSupabaseConfigured) {
      setState(prev => ({ ...prev, loading: false }))
      return
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('Error getting session:', error)
        setState(prev => ({ ...prev, loading: false, error: error.message }))
      } else {
        setState(prev => ({
          ...prev,
          session,
          user: session?.user ?? null,
          loading: false,
        }))
      }
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email)
        setState(prev => ({
          ...prev,
          session,
          user: session?.user ?? null,
          loading: false,
        }))
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const signInWithMagicLink = useCallback(async (email: string) => {
    if (!isSupabaseConfigured) {
      return { success: false, error: 'Supabase not configured' }
    }

    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          // Redirect to the current origin after clicking the magic link
          emailRedirectTo: typeof window !== 'undefined'
            ? `${window.location.origin}/auth/callback`
            : undefined,
        },
      })

      if (error) {
        setState(prev => ({ ...prev, loading: false, error: error.message }))
        return { success: false, error: error.message }
      }

      setState(prev => ({ ...prev, loading: false }))
      return { success: true }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setState(prev => ({ ...prev, loading: false, error: message }))
      return { success: false, error: message }
    }
  }, [])

  const signInWithPassword = useCallback(async (email: string, password: string) => {
    if (!isSupabaseConfigured) {
      return { success: false, error: 'Supabase not configured' }
    }

    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setState(prev => ({ ...prev, loading: false, error: error.message }))
        return { success: false, error: error.message }
      }

      setState(prev => ({ ...prev, loading: false }))
      return { success: true }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setState(prev => ({ ...prev, loading: false, error: message }))
      return { success: false, error: message }
    }
  }, [])

  const signUp = useCallback(async (email: string, password: string) => {
    if (!isSupabaseConfigured) {
      return { success: false, error: 'Supabase not configured' }
    }

    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: typeof window !== 'undefined'
            ? `${window.location.origin}/auth/callback`
            : undefined,
        },
      })

      if (error) {
        setState(prev => ({ ...prev, loading: false, error: error.message }))
        return { success: false, error: error.message }
      }

      setState(prev => ({ ...prev, loading: false }))
      return { success: true }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setState(prev => ({ ...prev, loading: false, error: message }))
      return { success: false, error: message }
    }
  }, [])

  const signOut = useCallback(async () => {
    if (!isSupabaseConfigured) return

    setState(prev => ({ ...prev, loading: true }))

    try {
      await supabase.auth.signOut()
      setState({
        user: null,
        session: null,
        loading: false,
        error: null,
      })
    } catch (err) {
      console.error('Error signing out:', err)
      setState(prev => ({ ...prev, loading: false }))
    }
  }, [])

  return {
    ...state,
    signInWithMagicLink,
    signInWithPassword,
    signUp,
    signOut,
    isAuthenticated: !!state.user,
    isDemo,
  }
}
