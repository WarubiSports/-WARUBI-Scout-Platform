import React, { createContext, useContext, ReactNode } from 'react'
import { useAuth } from '../hooks/useAuth'
import type { User, Session } from '@supabase/supabase-js'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  error: string | null
  isAuthenticated: boolean
  isDemo: boolean
  needsPasswordSetup: boolean
  signInWithMagicLink: (email: string) => Promise<{ success: boolean; error?: string }>
  signInWithPassword: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  signUp: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>
  signOut: () => Promise<void>
  setupPassword: (password: string) => Promise<{ success: boolean; error?: string }>
  dismissPasswordSetup: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuth()

  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuthContext() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider')
  }
  return context
}
