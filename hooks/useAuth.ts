import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { isEmailApproved, markScoutRegistered, needsPasswordSetup, setUserPassword } from '../services/accessControlService'
import type { User, Session } from '@supabase/supabase-js'

interface AuthState {
  user: User | null
  session: Session | null
  loading: boolean
  error: string | null
  needsPasswordSetup: boolean
}

interface UseAuthReturn extends AuthState {
  signInWithMagicLink: (email: string) => Promise<{ success: boolean; error?: string }>
  signInWithPassword: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  signUp: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>
  signOut: () => Promise<void>
  setupPassword: (password: string) => Promise<{ success: boolean; error?: string }>
  dismissPasswordSetup: () => void
  isAuthenticated: boolean
  isDemo: boolean
}

// Module-level promise to track getSession() completion across StrictMode remounts.
// This ensures signInWithPassword waits for the navigator lock to be released.
let sessionInitPromise: Promise<void> | null = null

export function useAuth(): UseAuthReturn {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
    error: null,
    needsPasswordSetup: false,
  })

  const isDemo = !isSupabaseConfigured

  // Check if user needs to set up password
  const checkPasswordSetup = useCallback(async () => {
    if (!isSupabaseConfigured) return

    const needsSetup = await needsPasswordSetup()
    setState(prev => ({ ...prev, needsPasswordSetup: needsSetup }))
  }, [])

  // Initialize auth state
  useEffect(() => {
    if (!isSupabaseConfigured) {
      setState(prev => ({ ...prev, loading: false }))
      return
    }

    let isMounted = true

    // Show login form after 3s regardless, but don't cancel getSession() —
    // it must finish to release the navigator lock before sign-in can work.
    const timeoutId = setTimeout(() => {
      if (isMounted) {
        setState(prev => {
          if (prev.loading) {
            console.warn('Auth session check slow, showing login form')
            return { ...prev, loading: false }
          }
          return prev
        })
      }
    }, 3000)

    // Track getSession() so sign-in methods can wait for the lock to release
    sessionInitPromise = supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      if (!isMounted) return
      clearTimeout(timeoutId)

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

        if (session?.user) {
          checkPasswordSetup()
        }
      }
    }).catch(err => {
      if (!isMounted) return
      clearTimeout(timeoutId)
      console.error('Error in getSession:', err)
      setState(prev => ({ ...prev, loading: false, error: 'Failed to check authentication' }))
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email)
        clearTimeout(timeoutId)

        setState(prev => ({
          ...prev,
          session,
          user: session?.user ?? null,
          loading: false,
        }))

        if (event === 'SIGNED_IN' && session?.user) {
          await markScoutRegistered(session.user.email || '')
          checkPasswordSetup()
        }
      }
    )

    return () => {
      isMounted = false
      clearTimeout(timeoutId)
      subscription.unsubscribe()
    }
  }, [checkPasswordSetup])

  // Wait for any pending getSession() to finish (releases navigator lock)
  const waitForSessionInit = async () => {
    if (sessionInitPromise) {
      try { await sessionInitPromise } catch { /* already handled */ }
    }
  }

  const signInWithMagicLink = useCallback(async (email: string) => {
    if (!isSupabaseConfigured) {
      return { success: false, error: 'Supabase not configured' }
    }

    try {
      await waitForSessionInit()

      const { approved, error: approvalError } = await isEmailApproved(email)

      if (!approved) {
        return {
          success: false,
          error: approvalError || 'Access restricted. Contact your administrator to request access.'
        }
      }

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: typeof window !== 'undefined'
            ? `${window.location.origin}/auth/callback`
            : undefined,
        },
      })

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      return { success: false, error: message }
    }
  }, [])

  const signInWithPassword = useCallback(async (email: string, password: string) => {
    if (!isSupabaseConfigured) {
      return { success: false, error: 'Supabase not configured' }
    }

    try {
      // Wait for getSession() to release the navigator lock
      await waitForSessionInit()

      const { approved, error: approvalError } = await isEmailApproved(email)

      if (!approved) {
        return {
          success: false,
          error: approvalError || 'Access restricted. Contact your administrator to request access.'
        }
      }

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      return { success: false, error: message }
    }
  }, [])

  const signUp = useCallback(async (email: string, password: string) => {
    if (!isSupabaseConfigured) {
      return { success: false, error: 'Supabase not configured' }
    }

    try {
      await waitForSessionInit()

      const { approved, error: approvalError } = await isEmailApproved(email)

      if (!approved) {
        return {
          success: false,
          error: approvalError || 'Access restricted. Contact your administrator to request access.'
        }
      }

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: typeof window !== 'undefined'
            ? `${window.location.origin}/auth/callback`
            : undefined,
          data: {
            has_set_password: true,
          },
        },
      })

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      return { success: false, error: message }
    }
  }, [])

  const resetPassword = useCallback(async (email: string) => {
    if (!isSupabaseConfigured) {
      return { success: false, error: 'Supabase not configured' }
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: typeof window !== 'undefined'
          ? `${window.location.origin}/auth/callback`
          : undefined,
      })

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      return { success: false, error: message }
    }
  }, [])

  const setupPassword = useCallback(async (password: string) => {
    const result = await setUserPassword(password)
    if (result.success) {
      setState(prev => ({ ...prev, needsPasswordSetup: false }))
    }
    return result
  }, [])

  const dismissPasswordSetup = useCallback(() => {
    setState(prev => ({ ...prev, needsPasswordSetup: false }))
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
        needsPasswordSetup: false,
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
    resetPassword,
    signOut,
    setupPassword,
    dismissPasswordSetup,
    isAuthenticated: !!state.user,
    isDemo,
  }
}
