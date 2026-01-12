import { useCallback } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import type { OutreachLogInsert } from '../lib/database.types'
import type { OutreachLog } from '../types'

export function useOutreach(scoutId: string | undefined, isDemo: boolean = false) {
  const logOutreach = useCallback(
    async (
      prospectId: string,
      method: 'Email' | 'WhatsApp' | 'Clipboard',
      templateName: string,
      messageContent?: string,
      note?: string
    ): Promise<OutreachLog | null> => {
      if (!scoutId) return null

      const outreachLog: OutreachLog = {
        id: `log-${Date.now()}`,
        date: new Date().toISOString(),
        method,
        templateName,
        note,
      }

      if (isSupabaseConfigured && !isDemo) {
        try {
          const logData: OutreachLogInsert = {
            prospect_id: prospectId,
            scout_id: scoutId,
            method,
            template_name: templateName,
            message_content: messageContent || null,
            note: note || null,
          }

          const { data, error } = await supabase
            .from('scout_outreach_logs')
            .insert(logData as any)
            .select()
            .single()

          if (error) throw error

          // Also update prospect's last_contacted_at
          await (supabase
            .from('scout_prospects') as any)
            .update({ last_contacted_at: new Date().toISOString() })
            .eq('id', prospectId)

          const logRecord = data as any
          return {
            id: logRecord.id,
            date: logRecord.created_at,
            method: logRecord.method as 'Email' | 'WhatsApp' | 'Clipboard',
            templateName: logRecord.template_name,
            note: logRecord.note || undefined,
          }
        } catch (err) {
          console.error('Error logging outreach:', err)
          // Return the local log for demo fallback
          return outreachLog
        }
      }

      // Demo mode - just return the local log
      return outreachLog
    },
    [scoutId, isDemo]
  )

  const getOutreachHistory = useCallback(
    async (prospectId: string): Promise<OutreachLog[]> => {
      if (!scoutId) return []

      if (isSupabaseConfigured && !isDemo) {
        try {
          const { data, error } = await supabase
            .from('scout_outreach_logs')
            .select('*')
            .eq('prospect_id', prospectId)
            .order('created_at', { ascending: false })

          if (error) throw error

          return (data || []).map((log) => ({
            id: log.id,
            date: log.created_at,
            method: log.method as 'Email' | 'WhatsApp' | 'Clipboard',
            templateName: log.template_name,
            note: log.note || undefined,
          }))
        } catch (err) {
          console.error('Error fetching outreach history:', err)
          return []
        }
      }

      // Demo mode - return empty (outreach logs are stored in player object in demo)
      return []
    },
    [scoutId, isDemo]
  )

  const markResponseReceived = useCallback(
    async (logId: string, notes?: string): Promise<void> => {
      if (isSupabaseConfigured && !isDemo) {
        try {
          await (supabase
            .from('scout_outreach_logs') as any)
            .update({
              response_received: true,
              response_date: new Date().toISOString(),
              response_notes: notes || null,
            })
            .eq('id', logId)
        } catch (err) {
          console.error('Error marking response:', err)
        }
      }
    },
    [isDemo]
  )

  return {
    logOutreach,
    getOutreachHistory,
    markResponseReceived,
  }
}
