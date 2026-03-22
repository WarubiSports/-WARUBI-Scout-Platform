import { useState, useEffect, useCallback } from 'react'
import { supabase, isSupabaseConfigured, supabaseRest } from '../lib/supabase'
import type { ScoutingEvent as DbEvent, ScoutingEventInsert, ScoutingEventUpdate } from '../lib/database.types'
import type { ScoutingEvent, EventStatus } from '../types'
import { parseAgenda, parseChecklist, agendaToJson, checklistToJson } from '../lib/guards'

// Showcase Coordinator public page base URL
const SHOWCASE_BASE_URL = 'https://showcase-coordinator.vercel.app/event'

// Generate a URL-safe slug from event title + year
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

// Map scout event types to showcase_event_type enum
type ShowcaseEventType = 'showcase' | 'id_camp' | 'futures'
function mapEventType(type: ScoutingEvent['type']): ShowcaseEventType {
  switch (type) {
    case 'ID Day':
    case 'ID Camp':
    case 'Tryout':
      return 'id_camp'
    case 'Showcase':
    case 'Tournament':
      return 'showcase'
    case 'Camp':
    case 'Training':
      return 'futures'
    default:
      return 'showcase'
  }
}

// Parse fee string to numeric price
function parseFee(fee?: string | number): number | null {
  if (!fee) return null
  if (typeof fee === 'number') return fee
  const match = fee.replace(/[^0-9.]/g, '')
  const num = parseFloat(match)
  return isNaN(num) ? null : num
}

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
    host_scout_id: scoutId || null, // Always set — RLS requires host_scout_id = get_my_scout_id()
    host_name: event.hostName || null,
    title: event.title,
    event_type: event.type as ScoutingEventInsert['event_type'],
    event_date: event.date,
    event_end_date: event.endDate || null,
    location: event.location,
    status: statusToDb(event.status),
    fee: event.fee != null ? String(event.fee) : null,

    marketing_copy: event.marketingCopy || null,
    agenda: agendaToJson(event.agenda),
    checklist: checklistToJson(event.checklist),
    event_link: event.link || null,
    description: event.notes || null,
  }
}

// Map database event to frontend format
function eventFromDb(dbEvent: DbEvent, scoutId?: string): ScoutingEvent {
  const slug = slugify(dbEvent.title + (dbEvent.event_date ? `-${dbEvent.event_date.slice(0, 4)}` : ''))
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

    hostName: dbEvent.host_name || undefined,
    link: dbEvent.event_link || undefined,
    notes: dbEvent.description || undefined,
    showcaseEventId: dbEvent.showcase_event_id || undefined,
    showcaseSlug: dbEvent.showcase_event_id ? slug : undefined,
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
      // Use REST API to avoid Supabase JS client hanging issues
      const { data, error } = await supabaseRest.select<DbEvent>(
        'scouting_events',
        `or=(host_scout_id.eq.${scoutId},status.eq.published)&order=event_date.asc`
      )

      if (error) throw new Error(error.message)

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

        // Use REST API to avoid Supabase JS client hanging issues
        const { data, error } = await supabaseRest.insert<DbEvent>('scouting_events', eventData)

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

  // Sync a scouting event to showcase_events for public registration
  const syncToShowcase = async (event: ScoutingEvent): Promise<string | null> => {
    const slug = slugify(event.title + (event.date ? `-${event.date.slice(0, 4)}` : ''))
    const showcaseData = {
      name: event.title,
      slug,
      location: event.location,
      start_date: event.date,
      end_date: event.endDate || event.date,
      description: event.notes || event.marketingCopy || null,
      type: mapEventType(event.type),
      price: parseFee(event.fee),
      currency: 'EUR',
      registration_open: true,
      registration_details: event.marketingCopy || null,
    }

    try {
      if (event.showcaseEventId) {
        // Update existing showcase event
        await supabaseRest.update('showcase_events', `id=eq.${event.showcaseEventId}`, showcaseData)
        return event.showcaseEventId
      } else {
        // Create new showcase event
        const { data, error } = await supabaseRest.insert<{ id: string }>('showcase_events', showcaseData)
        if (error) throw new Error(error.message)
        if (!data) throw new Error('No data returned from showcase insert')

        // Link back to scouting event
        await supabaseRest.update('scouting_events', `id=eq.${event.id}`, {
          showcase_event_id: data.id,
        })

        return data.id
      }
    } catch (err) {
      console.error('[syncToShowcase] Error:', err)
      return null
    }
  }

  const updateEvent = useCallback(
    async (eventId: string, updates: Partial<ScoutingEvent>): Promise<void> => {
      if (!isSupabaseConfigured) return

      try {
        const dbUpdates: ScoutingEventUpdate = {}

        if (updates.title !== undefined) dbUpdates.title = updates.title
        if (updates.date !== undefined) dbUpdates.event_date = updates.date
        if (updates.endDate !== undefined) dbUpdates.event_end_date = updates.endDate || null
        if (updates.location !== undefined) dbUpdates.location = updates.location
        if (updates.type !== undefined) dbUpdates.event_type = updates.type as ScoutingEventUpdate['event_type']
        if (updates.status !== undefined) dbUpdates.status = statusToDb(updates.status)
        if (updates.fee !== undefined) dbUpdates.fee = updates.fee != null ? String(updates.fee) : null
        if (updates.marketingCopy !== undefined) dbUpdates.marketing_copy = updates.marketingCopy
        if (updates.agenda !== undefined) dbUpdates.agenda = agendaToJson(updates.agenda)
        if (updates.checklist !== undefined) dbUpdates.checklist = checklistToJson(updates.checklist)

        if (updates.hostName !== undefined) dbUpdates.host_name = updates.hostName
        if (updates.link !== undefined) dbUpdates.event_link = updates.link || null
        if (updates.notes !== undefined) dbUpdates.description = updates.notes || null

        // Use REST API to bypass Supabase JS client AbortError issues
        const { error } = await supabaseRest.update('scouting_events', `id=eq.${eventId}`, dbUpdates)

        if (error) throw new Error(error.message)

        // Find the current event to check if we need to sync
        const currentEvent = events.find((e) => e.id === eventId)
        const mergedEvent = currentEvent ? { ...currentEvent, ...updates } : null

        // Sync to showcase when publishing or when already published and updating
        if (mergedEvent) {
          const isBecomingPublished = updates.status === 'Published'
          const isAlreadyPublished = currentEvent?.status === 'Published' && updates.status === undefined

          if (isBecomingPublished || isAlreadyPublished) {
            const showcaseEventId = await syncToShowcase(mergedEvent)
            if (showcaseEventId) {
              const slug = slugify(mergedEvent.title + (mergedEvent.date ? `-${mergedEvent.date.slice(0, 4)}` : ''))
              updates.showcaseEventId = showcaseEventId
              updates.showcaseSlug = slug
            }
          }

          // If unpublishing, close registration
          if (currentEvent?.status === 'Published' && updates.status && updates.status !== 'Published' && currentEvent.showcaseEventId) {
            await supabaseRest.update('showcase_events', `id=eq.${currentEvent.showcaseEventId}`, {
              registration_open: false,
            })
          }
        }

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
        // Use REST API to avoid Supabase JS client hanging issues
        const { error } = await supabaseRest.delete('scouting_events', `id=eq.${eventId}`)

        if (error) throw new Error(error.message)

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
