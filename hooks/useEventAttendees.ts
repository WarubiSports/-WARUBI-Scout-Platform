import { useState, useCallback } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import type { EventAttendee, EventAttendeeInsert } from '../lib/database.types'

// Attendee with scout info for display
export interface AttendeeWithScout extends EventAttendee {
  scout?: {
    id: string
    name: string
    region: string
  }
}

export function useEventAttendees(scoutId: string | undefined) {
  const [attendeesByEvent, setAttendeesByEvent] = useState<Record<string, AttendeeWithScout[]>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load attendees for a specific event
  const loadEventAttendees = useCallback(async (eventId: string): Promise<AttendeeWithScout[]> => {
    if (!isSupabaseConfigured) return []

    try {
      const { data, error } = await supabase
        .from('scout_event_attendees')
        .select(`
          *,
          scout:scouts!scout_id (
            id,
            name,
            region
          )
        `)
        .eq('event_id', eventId)
        .eq('role', 'scout')
        .order('registered_at', { ascending: true })

      if (error) throw error

      const attendees = (data || []) as AttendeeWithScout[]
      setAttendeesByEvent(prev => ({ ...prev, [eventId]: attendees }))
      return attendees
    } catch (err) {
      console.error('Error loading event attendees:', err)
      setError(err instanceof Error ? err.message : 'Failed to load attendees')
      return []
    }
  }, [])

  // Check if current scout is attending an event
  const isAttending = useCallback((eventId: string): boolean => {
    if (!scoutId) return false
    const attendees = attendeesByEvent[eventId] || []
    return attendees.some(a => a.scout_id === scoutId)
  }, [scoutId, attendeesByEvent])

  // Get attendee count for an event
  const getAttendeeCount = useCallback((eventId: string): number => {
    return (attendeesByEvent[eventId] || []).length
  }, [attendeesByEvent])

  // Get attendees for an event
  const getAttendees = useCallback((eventId: string): AttendeeWithScout[] => {
    return attendeesByEvent[eventId] || []
  }, [attendeesByEvent])

  // Register attendance (RSVP)
  const registerAttendance = useCallback(async (eventId: string): Promise<boolean> => {
    if (!scoutId || !isSupabaseConfigured) return false

    // Check if already attending
    if (isAttending(eventId)) {
      console.log('[registerAttendance] Already attending')
      return true
    }

    try {
      const attendeeData: EventAttendeeInsert = {
        event_id: eventId,
        scout_id: scoutId,
        role: 'scout',
        attended: false,
      }

      const { data, error } = await supabase
        .from('scout_event_attendees')
        .insert(attendeeData)
        .select(`
          *,
          scout:scouts!scout_id (
            id,
            name,
            region
          )
        `)
        .single()

      if (error) throw error

      // Update local state
      const newAttendee = data as AttendeeWithScout
      setAttendeesByEvent(prev => ({
        ...prev,
        [eventId]: [...(prev[eventId] || []), newAttendee]
      }))

      return true
    } catch (err) {
      console.error('Error registering attendance:', err)
      setError(err instanceof Error ? err.message : 'Failed to register attendance')
      return false
    }
  }, [scoutId, isAttending])

  // Cancel attendance
  const cancelAttendance = useCallback(async (eventId: string): Promise<boolean> => {
    if (!scoutId || !isSupabaseConfigured) return false

    try {
      const { error } = await supabase
        .from('scout_event_attendees')
        .delete()
        .eq('event_id', eventId)
        .eq('scout_id', scoutId)

      if (error) throw error

      // Update local state
      setAttendeesByEvent(prev => ({
        ...prev,
        [eventId]: (prev[eventId] || []).filter(a => a.scout_id !== scoutId)
      }))

      return true
    } catch (err) {
      console.error('Error canceling attendance:', err)
      setError(err instanceof Error ? err.message : 'Failed to cancel attendance')
      return false
    }
  }, [scoutId])

  return {
    attendeesByEvent,
    loading,
    error,
    loadEventAttendees,
    isAttending,
    getAttendeeCount,
    getAttendees,
    registerAttendance,
    cancelAttendance,
  }
}
