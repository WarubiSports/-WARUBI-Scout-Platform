import { useState, useEffect, useCallback } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import type { ScoutingEvent as DbEvent, ScoutingEventInsert, ScoutingEventUpdate } from '../lib/database.types'
import type { ScoutingEvent, EventStatus } from '../types'
import { parseAgenda, parseChecklist, agendaToJson, checklistToJson } from '../lib/guards'

// Local storage key for demo mode
const DEMO_EVENTS_KEY = 'warubi_demo_events'

// Map frontend EventStatus to database status
function statusToDb(status: EventStatus): DbEvent['status'] {
  const mapping: Record<EventStatus, DbEvent['status']> = {
    'Draft': 'draft',
    'Pending Approval': 'pending_approval',
    'Approved': 'approved',
    'Published': 'published',
    'Completed': 'completed',
    'Rejected': 'rejected',
  }
  return mapping[status]
}

// Map database status to frontend EventStatus
function statusFromDb(status: DbEvent['status']): EventStatus {
  const mapping: Record<DbEvent['status'], EventStatus> = {
    'draft': 'Draft',
    'pending_approval': 'Pending Approval',
    'approved': 'Approved',
    'published': 'Published',
    'completed': 'Completed',
    'cancelled': 'Completed', // Map cancelled to Completed for frontend
    'rejected': 'Rejected',
  }
  return mapping[status]
}

// Map frontend event to database format
function eventToDb(event: ScoutingEvent, scoutId: string): ScoutingEventInsert {
  return {
    host_scout_id: event.isMine ? scoutId : null,
    host_name: event.hostName || null,
    title: event.title,
    event_type: event.type,
    event_date: event.date,
    location: event.location,
    status: statusToDb(event.status),
    fee: event.fee || null,
    registered_count: event.registeredCount || 0,
    marketing_copy: event.marketingCopy || null,
    agenda: agendaToJson(event.agenda),
    checklist: checklistToJson(event.checklist),
  }
}

// Map database event to frontend format
function eventFromDb(dbEvent: DbEvent, scoutId?: string): ScoutingEvent {
  return {
    id: dbEvent.id,
    isMine: dbEvent.host_scout_id === scoutId,
    role: dbEvent.host_scout_id === scoutId ? 'HOST' : 'ATTENDEE',
    status: statusFromDb(dbEvent.status),
    title: dbEvent.title,
    date: dbEvent.event_date,
    location: dbEvent.location,
    type: dbEvent.event_type as ScoutingEvent['type'],
    fee: dbEvent.fee || '',
    marketingCopy: dbEvent.marketing_copy || undefined,
    agenda: parseAgenda(dbEvent.agenda) ?? undefined,
    checklist: parseChecklist(dbEvent.checklist) ?? undefined,
    registeredCount: dbEvent.registered_count || 0,
    hostName: dbEvent.host_name || undefined,
  }
}

export function useEvents(scoutId: string | undefined, forceDemoMode: boolean = false) {
  const [events, setEvents] = useState<ScoutingEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Check if this is a demo scout ID (starts with "demo-") or demo mode is forced
  const isDemoScout = scoutId?.startsWith('demo-') ?? false
  const [isDemo, setIsDemo] = useState(!isSupabaseConfigured || isDemoScout || forceDemoMode)

  // Load events on mount or when scoutId/forceDemoMode changes
  useEffect(() => {
    if (scoutId || forceDemoMode) {
      loadEvents()
    }
  }, [scoutId, forceDemoMode])

  // Set up real-time subscription (skip in demo mode)
  useEffect(() => {
    if (!scoutId || !isSupabaseConfigured || isDemo || forceDemoMode) return

    const subscription = supabase
      .channel('event-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'scouting_events',
        },
        (payload) => {
          handleRealtimeChange(payload)
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [scoutId, isDemo])

  const handleRealtimeChange = (payload: any) => {
    if (payload.eventType === 'INSERT') {
      const newEvent = eventFromDb(payload.new, scoutId)
      setEvents((prev) => [newEvent, ...prev])
    } else if (payload.eventType === 'UPDATE') {
      setEvents((prev) =>
        prev.map((e) =>
          e.id === payload.new.id ? eventFromDb(payload.new, scoutId) : e
        )
      )
    } else if (payload.eventType === 'DELETE') {
      setEvents((prev) => prev.filter((e) => e.id !== payload.old.id))
    }
  }

  const loadEvents = async () => {
    if (!scoutId) return

    setLoading(true)

    // If demo mode is forced or it's a demo scout, use localStorage only
    if (forceDemoMode || isDemoScout) {
      const stored = localStorage.getItem(DEMO_EVENTS_KEY)
      if (stored) {
        setEvents(JSON.parse(stored))
      }
      setIsDemo(true)
      setLoading(false)
      return
    }

    try {
      if (isSupabaseConfigured) {
        // Load all events (scout's own + published events)
        const { data, error } = await supabase
          .from('scouting_events')
          .select('*')
          .or(`host_scout_id.eq.${scoutId},status.eq.published`)
          .order('event_date', { ascending: true })

        if (error) throw error

        const mappedEvents = (data || []).map((e) => eventFromDb(e, scoutId))
        setEvents(mappedEvents)
        setIsDemo(false)
      } else {
        // Demo mode - load from localStorage
        const stored = localStorage.getItem(DEMO_EVENTS_KEY)
        if (stored) {
          setEvents(JSON.parse(stored))
        }
        setIsDemo(true)
      }
    } catch (err) {
      console.error('Error loading events:', err)
      setError(err instanceof Error ? err.message : 'Failed to load events')
      setIsDemo(true)
    } finally {
      setLoading(false)
    }
  }

  const saveDemoEvents = (eventList: ScoutingEvent[]) => {
    localStorage.setItem(DEMO_EVENTS_KEY, JSON.stringify(eventList))
  }

  const addEvent = useCallback(
    async (event: ScoutingEvent): Promise<ScoutingEvent | null> => {
      if (!scoutId) return null

      if (isSupabaseConfigured && !isDemo) {
        try {
          const eventData = eventToDb(event, scoutId)
          const { data, error } = await supabase
            .from('scouting_events')
            .insert(eventData)
            .select()
            .single()

          if (error) throw error

          const newEvent = eventFromDb(data, scoutId)
          setEvents((prev) => [newEvent, ...prev])
          return newEvent
        } catch (err) {
          console.error('Error adding event:', err)
          setError(err instanceof Error ? err.message : 'Failed to add event')
          // Fall back to demo mode
          return addDemoEvent(event)
        }
      } else {
        return addDemoEvent(event)
      }
    },
    [scoutId, isDemo]
  )

  const addDemoEvent = (event: ScoutingEvent): ScoutingEvent => {
    const newEvent = { ...event, id: event.id || `demo-${Date.now()}` }
    const updated = [newEvent, ...events]
    setEvents(updated)
    saveDemoEvents(updated)
    return newEvent
  }

  const updateEvent = useCallback(
    async (eventId: string, updates: Partial<ScoutingEvent>): Promise<void> => {
      if (isSupabaseConfigured && !isDemo) {
        try {
          const dbUpdates: ScoutingEventUpdate = {}

          if (updates.title !== undefined) dbUpdates.title = updates.title
          if (updates.date !== undefined) dbUpdates.event_date = updates.date
          if (updates.location !== undefined) dbUpdates.location = updates.location
          if (updates.type !== undefined) dbUpdates.event_type = updates.type
          if (updates.status !== undefined) dbUpdates.status = statusToDb(updates.status)
          if (updates.fee !== undefined) dbUpdates.fee = updates.fee
          if (updates.marketingCopy !== undefined) dbUpdates.marketing_copy = updates.marketingCopy
          if (updates.agenda !== undefined) dbUpdates.agenda = agendaToJson(updates.agenda)
          if (updates.checklist !== undefined) dbUpdates.checklist = checklistToJson(updates.checklist)
          if (updates.registeredCount !== undefined) dbUpdates.registered_count = updates.registeredCount
          if (updates.hostName !== undefined) dbUpdates.host_name = updates.hostName

          const { error } = await supabase
            .from('scouting_events')
            .update(dbUpdates)
            .eq('id', eventId)

          if (error) throw error

          setEvents((prev) =>
            prev.map((e) => (e.id === eventId ? { ...e, ...updates } : e))
          )
        } catch (err) {
          console.error('Error updating event:', err)
          setError(err instanceof Error ? err.message : 'Failed to update event')
          updateDemoEvent(eventId, updates)
        }
      } else {
        updateDemoEvent(eventId, updates)
      }
    },
    [isDemo, events]
  )

  const updateDemoEvent = (eventId: string, updates: Partial<ScoutingEvent>) => {
    const updated = events.map((e) => (e.id === eventId ? { ...e, ...updates } : e))
    setEvents(updated)
    saveDemoEvents(updated)
  }

  const deleteEvent = useCallback(
    async (eventId: string): Promise<void> => {
      if (isSupabaseConfigured && !isDemo) {
        try {
          const { error } = await supabase
            .from('scouting_events')
            .delete()
            .eq('id', eventId)

          if (error) throw error

          setEvents((prev) => prev.filter((e) => e.id !== eventId))
        } catch (err) {
          console.error('Error deleting event:', err)
          setError(err instanceof Error ? err.message : 'Failed to delete event')
        }
      } else {
        const updated = events.filter((e) => e.id !== eventId)
        setEvents(updated)
        saveDemoEvents(updated)
      }
    },
    [isDemo, events]
  )

  return {
    events,
    loading,
    error,
    isDemo,
    addEvent,
    updateEvent,
    deleteEvent,
    refreshEvents: loadEvents,
  }
}
