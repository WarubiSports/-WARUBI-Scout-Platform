import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react'

interface DemoModeContextType {
  isDemoMode: boolean
  setDemoMode: (value: boolean) => void
  enableDemoMode: () => void
  disableDemoMode: () => void
}

const DemoModeContext = createContext<DemoModeContextType | undefined>(undefined)

const DEMO_MODE_KEY = 'warubi_demo_mode'

export function DemoModeProvider({ children }: { children: ReactNode }) {
  const [isDemoMode, setIsDemoMode] = useState<boolean>(() => {
    // Check if we have a demo scout in localStorage on initial load
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(DEMO_MODE_KEY)
      return stored !== null
    }
    return false
  })

  const setDemoMode = useCallback((value: boolean) => {
    setIsDemoMode(value)
    if (!value) {
      localStorage.removeItem(DEMO_MODE_KEY)
    }
  }, [])

  const enableDemoMode = useCallback(() => {
    setIsDemoMode(true)
    // Save demo mode flag to localStorage so it persists across refreshes
    localStorage.setItem(DEMO_MODE_KEY, 'true')
  }, [])

  const disableDemoMode = useCallback(() => {
    setIsDemoMode(false)
    localStorage.removeItem(DEMO_MODE_KEY)
  }, [])

  return (
    <DemoModeContext.Provider value={{ isDemoMode, setDemoMode, enableDemoMode, disableDemoMode }}>
      {children}
    </DemoModeContext.Provider>
  )
}

export function useDemoMode() {
  const context = useContext(DemoModeContext)
  if (context === undefined) {
    throw new Error('useDemoMode must be used within a DemoModeProvider')
  }
  return context
}
