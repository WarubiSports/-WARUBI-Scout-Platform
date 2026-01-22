import { useState, useEffect, useCallback } from 'react'
import { supabase, isSupabaseConfigured, supabaseRest } from '../lib/supabase'
import type { ScoutingEvent as DbEvent, ScoutingEventInsert, ScoutingEventUpdate } from '../lib/database.types'
import type { ScoutingEvent, EventStatus } from '../types'
import { parseAgenda, parseChecklist, agendaToJson, checklistToJson } from '../lib/guards'

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
    host_scout_id: event.isMine && scoutId ? scoutId : null,
    host_name: event.hostName || null,
    title: event.title,
    event_type: event.type,
    event_date: event.date,
    event_end_date: event.endDate || null,
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
    endDate: dbEvent.event_end_date || undefined,
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

export function useEvents(scoutId: string | undefined) {
  const [events, setEvents] = useState<ScoutingEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load events on mount or when scoutId changes
  useEffect(() => {
    if (scoutId) {
      loadEvents()
    }
  }, [scoutId])

  const loadEvents = async () => {
    if (!scoutId || !isSupabaseConfigured) {
      setLoading(false)
      return
    }

    setLoading(true)

    try {
      // Load all events (scout's own + published events)
      const { data, error } = await supabase
        .from('scouting_events')
        .select('*')
        .or(`host_scout_id.eq.${scoutId},status.eq.published`)
        .order('event_date', { ascending: true })

      if (error) throw error

      const mappedEvents = (data || []).map((e) => eventFromDb(e, scoutId))
      setEvents(mappedEvents)
    } catch (err) {
      console.error('Error loading events:', err)
      setError(err instanceof Error ? err.message : 'Failed to load events')
    } finally {
      setLoading(false)
    }
  }

  const addEvent = useCallback(
    async (event: ScoutingEvent): Promise<ScoutingEvent | null> => {
      console.log('[addEvent] Starting with scoutId:', scoutId, 'isSupabaseConfigured:', isSupabaseConfigured, 'isGlobal:', (event as any).isGlobal)

      if (!isSupabaseConfigured) {
        console.error('[addEvent] Supabase not configured')
        return null
      }

      // Allow global events to be created without a scoutId (admin creating for all scouts)
      const isGlobalEvent = (event as any).isGlobal === true
      if (!scoutId && !isGlobalEvent) {
        console.error('[addEvent] Missing scoutId for non-global event')
        return null
      }

      try {
        const eventData = eventToDb(event, scoutId || '')
        console.log('[addEvent] Inserting:', eventData)

        // Use REST API to avoid Supabase JS client hanging issues
        const { data, error } = await supabaseRest.insert<DbEvent>('scouting_events', eventData)

        console.log('[addEvent] Result:', { data, error })

        if (error) {
          throw new Error(error.message)
        }

        if (!data) {
          throw new Error('No data returned from insert')
        }

        const newEvent = eventFromDb(data, scoutId)
        setEvents((prev) => [newEvent, ...prev])
        return newEvent
      } catch (err) {
        console.error('[addEvent] Error:', err)
        setError(err instanceof Error ? err.message : 'Failed to add event')
        return null
      }
    },
    [scoutId]
  )

  const updateEvent = useCallback(
    async (eventId: string, updates: Partial<ScoutingEvent>): Promise<void> => {
      if (!isSupabaseConfigured) return

      try {
        const dbUpdates: ScoutingEventUpdate = {}

        if (updates.title !== undefined) dbUpdates.title = updates.title
        if (updates.date !== undefined) dbUpdates.event_date = updates.date
        if (updates.endDate !== undefined) dbUpdates.event_end_date = updates.endDate || null
        if (updates.location !== undefined) dbUpdates.location = updates.location
        if (updates.type !== undefined) dbUpdates.event_type = updates.type
        if (updates.status !== undefined) dbUpdates.status = statusToDb(updates.status)
        if (updates.fee !== undefined) dbUpdates.fee = updates.fee
        if (updates.marketingCopy !== undefined) dbUpdates.marketing_copy = updates.marketingCopy
        if (updates.agenda !== undefined) dbUpdates.agenda = agendaToJson(updates.agenda)
        if (updates.checklist !== undefined) dbUpdates.checklist = checklistToJson(updates.checklist)
        if (updates.registeredCount !== undefined) dbUpdates.registered_count = updates.registeredCount
        if (updates.hostName !== undefined) dbUpdates.host_name = updates.hostName

        // Use REST API to bypass Supabase JS client AbortError issues
        const { error } = await supabaseRest.update('scouting_events', `id=eq.${eventId}`, dbUpdates)

        if (error) throw new Error(error.message)

        setEvents((prev) =>
          prev.map((e) => (e.id === eventId ? { ...e, ...updates } : e))
        )
      } catch (err) {
        console.error('Error updating event:', err)
        setError(err instanceof Error ? err.message : 'Failed to update event')
      }
    },
    [events]
  )

  const deleteEvent = useCallback(
    async (eventId: string): Promise<void> => {
      if (!isSupabaseConfigured) return

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
    },
    [events]
  )

  return {
    events,
    loading,
    error,
    addEvent,
    updateEvent,
    deleteEvent,
    refreshEvents: loadEvents,
  }
}
