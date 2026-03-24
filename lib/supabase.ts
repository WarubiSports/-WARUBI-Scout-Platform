import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials not found. Running in demo mode.')
}

// Use a global variable to ensure only one Supabase client instance exists
// This prevents issues with HMR (Hot Module Replacement) in development
// and React StrictMode double-mounting
declare global {
  var __supabaseClient: SupabaseClient<Database> | undefined
}

function getSupabaseClient(): SupabaseClient<Database> {
  if (globalThis.__supabaseClient) {
    return globalThis.__supabaseClient
  }

  const client = createClient<Database>(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'placeholder-key',
    {
      realtime: {
        params: {
          eventsPerSecond: 0 // Disable realtime
        }
      },
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
        // Bypass navigator.locks which causes AbortError in Safari
        lock: async (name: string, acquireTimeout: number, fn: () => Promise<any>) => {
          return await fn()
        },
      },
      global: {
        headers: {
          'x-client-info': 'scout-buddy',
        },
      },
    }
  )

  globalThis.__supabaseClient = client
  return client
}

export const supabase = getSupabaseClient()

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

// Direct REST API helpers to bypass Supabase JS client issues
// The JS client has AbortError issues in development with React StrictMode + HMR
function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const storageKey = `sb-${supabaseUrl?.split('//')[1]?.split('.')[0]}-auth-token`
    const storedSession = localStorage.getItem(storageKey)
    if (storedSession) {
      const parsed = JSON.parse(storedSession)
      const token = parsed?.access_token
      return token || null
    }
  } catch (e) {
    console.warn('[getAccessToken] Failed to get access token from localStorage:', e)
  }
  return null
}

interface RestResponse<T> {
  data: T | null
  error: { message: string } | null
}

export const supabaseRest = {
  async select<T>(table: string, query: string = ''): Promise<RestResponse<T[]>> {
    if (!isSupabaseConfigured) return { data: null, error: { message: 'Not configured' } }

    const token = getAccessToken()
    if (!token) return { data: null, error: { message: 'No auth token' } }

    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/${table}${query ? '?' + query : ''}`, {
        headers: {
          'apikey': supabaseAnonKey!,
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        return { data: null, error: { message: errorData.message || `HTTP ${response.status}` } }
      }

      const data = await response.json()
      return { data, error: null }
    } catch (e) {
      return { data: null, error: { message: e instanceof Error ? e.message : 'Unknown error' } }
    }
  },

  async insert<T>(table: string, data: Record<string, any>): Promise<RestResponse<T>> {
    if (!isSupabaseConfigured) {
      return { data: null, error: { message: 'Not configured' } }
    }

    const token = getAccessToken()

    if (!token) {
      return { data: null, error: { message: 'No auth token - please sign in again' } }
    }

    try {
      // Add timeout to prevent hanging
      const controller = new AbortController()
      const timeoutId = setTimeout(() => {
        controller.abort()
      }, 20000)

      const response = await fetch(`${supabaseUrl}/rest/v1/${table}`, {
        method: 'POST',
        headers: {
          'apikey': supabaseAnonKey!,
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation',
        },
        body: JSON.stringify(data),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        return { data: null, error: { message: errorData.message || `HTTP ${response.status}` } }
      }

      const result = await response.json()
      // REST API returns array, get first item
      return { data: Array.isArray(result) ? result[0] : result, error: null }
    } catch (e) {
      return { data: null, error: { message: e instanceof Error ? e.message : 'Unknown error' } }
    }
  },

  async update<T>(table: string, query: string, data: Record<string, any>): Promise<RestResponse<T>> {
    if (!isSupabaseConfigured) return { data: null, error: { message: 'Not configured' } }

    const token = getAccessToken()
    if (!token) return { data: null, error: { message: 'No auth token' } }

    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/${table}?${query}`, {
        method: 'PATCH',
        headers: {
          'apikey': supabaseAnonKey!,
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        return { data: null, error: { message: errorData.message || `HTTP ${response.status}` } }
      }

      const result = await response.json()
      return { data: Array.isArray(result) ? result[0] : result, error: null }
    } catch (e) {
      return { data: null, error: { message: e instanceof Error ? e.message : 'Unknown error' } }
    }
  },

  async insertBatch<T>(table: string, rows: Record<string, any>[]): Promise<RestResponse<T[]>> {
    if (!isSupabaseConfigured) return { data: null, error: { message: 'Not configured' } }
    const token = getAccessToken()
    if (!token) return { data: null, error: { message: 'No auth token' } }
    try {
      const CHUNK_SIZE = 500
      const allResults: T[] = []
      for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
        const chunk = rows.slice(i, i + CHUNK_SIZE)
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 30000)
        const response = await fetch(`${supabaseUrl}/rest/v1/${table}`, {
          method: 'POST',
          headers: {
            'apikey': supabaseAnonKey!,
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation',
          },
          body: JSON.stringify(chunk),
          signal: controller.signal,
        })
        clearTimeout(timeoutId)
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          return { data: null, error: { message: errorData.message || `HTTP ${response.status}` } }
        }
        const result = await response.json()
        const arr = Array.isArray(result) ? result : [result]
        allResults.push(...(arr as T[]))
      }
      return { data: allResults, error: null }
    } catch (e) {
      return { data: null, error: { message: e instanceof Error ? e.message : 'Unknown error' } }
    }
  },

  async delete(table: string, query: string): Promise<RestResponse<null>> {
    if (!isSupabaseConfigured) return { data: null, error: { message: 'Not configured' } }

    const token = getAccessToken()
    if (!token) return { data: null, error: { message: 'No auth token' } }

    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/${table}?${query}`, {
        method: 'DELETE',
        headers: {
          'apikey': supabaseAnonKey!,
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        return { data: null, error: { message: errorData.message || `HTTP ${response.status}` } }
      }

      return { data: null, error: null }
    } catch (e) {
      return { data: null, error: { message: e instanceof Error ? e.message : 'Unknown error' } }
    }
  },
}
