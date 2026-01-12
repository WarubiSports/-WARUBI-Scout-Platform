// Database types matching the scout tables in Supabase
// These correspond to migration 030_add_scout_tables.sql

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      approved_scouts: {
        Row: {
          id: string
          email: string
          name: string | null
          region: string | null
          role: string
          notes: string | null
          approved_by: string | null
          approved_at: string
          created_at: string
          has_registered: boolean
          registered_at: string | null
        }
        Insert: {
          id?: string
          email: string
          name?: string | null
          region?: string | null
          role?: string
          notes?: string | null
          approved_by?: string | null
          approved_at?: string
          created_at?: string
          has_registered?: boolean
          registered_at?: string | null
        }
        Update: {
          id?: string
          email?: string
          name?: string | null
          region?: string | null
          role?: string
          notes?: string | null
          approved_by?: string | null
          approved_at?: string
          has_registered?: boolean
          registered_at?: string | null
        }
      }
      scouts: {
        Row: {
          id: string
          user_id: string | null
          name: string
          email: string | null
          phone: string | null
          region: string
          affiliation: string | null
          bio: string | null
          roles: string[]
          xp_score: number
          level: number
          placements_count: number
          scout_persona: string | null
          lead_magnet_active: boolean
          status: 'active' | 'inactive' | 'pending'
          is_admin: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          name: string
          email?: string | null
          phone?: string | null
          region: string
          affiliation?: string | null
          bio?: string | null
          roles?: string[]
          xp_score?: number
          level?: number
          placements_count?: number
          scout_persona?: string | null
          lead_magnet_active?: boolean
          status?: 'active' | 'inactive' | 'pending'
          is_admin?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          name?: string
          email?: string | null
          phone?: string | null
          region?: string
          affiliation?: string | null
          bio?: string | null
          roles?: string[]
          xp_score?: number
          level?: number
          placements_count?: number
          scout_persona?: string | null
          lead_magnet_active?: boolean
          status?: 'active' | 'inactive' | 'pending'
          is_admin?: boolean
          updated_at?: string
        }
      }
      scout_prospects: {
        Row: {
          id: string
          scout_id: string
          name: string
          email: string | null
          phone: string | null
          age: number | null
          date_of_birth: string | null
          position: string
          height: string | null
          weight: string | null
          dominant_foot: 'Left' | 'Right' | 'Both' | null
          nationality: string | null
          has_eu_passport: boolean | null
          club: string | null
          team_level: string | null
          video_link: string | null
          gpa: string | null
          grad_year: string | null
          sat_act: string | null
          parent_name: string | null
          parent_email: string | null
          parent_phone: string | null
          pace: number | null
          physical: number | null
          technical: number | null
          tactical: number | null
          coachable: number | null
          evaluation: Json | null
          status: 'prospect' | 'lead' | 'interested' | 'final_review' | 'offered' | 'placed' | 'archived'
          activity_status: 'undiscovered' | 'spark' | 'signal' | 'spotlight'
          interested_program: string | null
          placed_location: string | null
          trial_prospect_id: string | null
          notes: string | null
          submitted_at: string
          last_active: string | null
          last_contacted_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          scout_id: string
          name: string
          email?: string | null
          phone?: string | null
          age?: number | null
          date_of_birth?: string | null
          position: string
          height?: string | null
          weight?: string | null
          dominant_foot?: 'Left' | 'Right' | 'Both' | null
          nationality?: string | null
          has_eu_passport?: boolean | null
          club?: string | null
          team_level?: string | null
          video_link?: string | null
          gpa?: string | null
          grad_year?: string | null
          sat_act?: string | null
          parent_name?: string | null
          parent_email?: string | null
          parent_phone?: string | null
          pace?: number | null
          physical?: number | null
          technical?: number | null
          tactical?: number | null
          coachable?: number | null
          evaluation?: Json | null
          status?: 'prospect' | 'lead' | 'interested' | 'final_review' | 'offered' | 'placed' | 'archived'
          activity_status?: 'undiscovered' | 'spark' | 'signal' | 'spotlight'
          interested_program?: string | null
          placed_location?: string | null
          trial_prospect_id?: string | null
          notes?: string | null
          submitted_at?: string
          last_active?: string | null
          last_contacted_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          scout_id?: string
          name?: string
          email?: string | null
          phone?: string | null
          age?: number | null
          date_of_birth?: string | null
          position?: string
          height?: string | null
          weight?: string | null
          dominant_foot?: 'Left' | 'Right' | 'Both' | null
          nationality?: string | null
          has_eu_passport?: boolean | null
          club?: string | null
          team_level?: string | null
          video_link?: string | null
          gpa?: string | null
          grad_year?: string | null
          sat_act?: string | null
          parent_name?: string | null
          parent_email?: string | null
          parent_phone?: string | null
          pace?: number | null
          physical?: number | null
          technical?: number | null
          tactical?: number | null
          coachable?: number | null
          evaluation?: Json | null
          status?: 'prospect' | 'lead' | 'interested' | 'final_review' | 'offered' | 'placed' | 'archived'
          activity_status?: 'undiscovered' | 'spark' | 'signal' | 'spotlight'
          interested_program?: string | null
          placed_location?: string | null
          trial_prospect_id?: string | null
          notes?: string | null
          last_active?: string | null
          last_contacted_at?: string | null
          updated_at?: string
        }
      }
      scout_outreach_logs: {
        Row: {
          id: string
          prospect_id: string
          scout_id: string
          method: 'Email' | 'WhatsApp' | 'Clipboard' | 'Phone' | 'InPerson'
          template_name: string
          message_content: string | null
          response_received: boolean
          response_date: string | null
          response_notes: string | null
          note: string | null
          created_at: string
        }
        Insert: {
          id?: string
          prospect_id: string
          scout_id: string
          method: 'Email' | 'WhatsApp' | 'Clipboard' | 'Phone' | 'InPerson'
          template_name: string
          message_content?: string | null
          response_received?: boolean
          response_date?: string | null
          response_notes?: string | null
          note?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          prospect_id?: string
          scout_id?: string
          method?: 'Email' | 'WhatsApp' | 'Clipboard' | 'Phone' | 'InPerson'
          template_name?: string
          message_content?: string | null
          response_received?: boolean
          response_date?: string | null
          response_notes?: string | null
          note?: string | null
        }
      }
      scouting_events: {
        Row: {
          id: string
          host_scout_id: string | null
          host_name: string | null
          title: string
          event_type: 'ID Day' | 'Showcase' | 'Camp' | 'Tournament' | 'Trial'
          event_date: string
          start_time: string | null
          end_time: string | null
          location: string
          status: 'draft' | 'pending_approval' | 'approved' | 'published' | 'completed' | 'cancelled' | 'rejected'
          fee: string | null
          max_capacity: number | null
          registered_count: number
          description: string | null
          marketing_copy: string | null
          agenda: Json | null
          checklist: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          host_scout_id?: string | null
          host_name?: string | null
          title: string
          event_type: 'ID Day' | 'Showcase' | 'Camp' | 'Tournament' | 'Trial'
          event_date: string
          start_time?: string | null
          end_time?: string | null
          location: string
          status?: 'draft' | 'pending_approval' | 'approved' | 'published' | 'completed' | 'cancelled' | 'rejected'
          fee?: string | null
          max_capacity?: number | null
          registered_count?: number
          description?: string | null
          marketing_copy?: string | null
          agenda?: Json | null
          checklist?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          host_scout_id?: string | null
          host_name?: string | null
          title?: string
          event_type?: 'ID Day' | 'Showcase' | 'Camp' | 'Tournament' | 'Trial'
          event_date?: string
          start_time?: string | null
          end_time?: string | null
          location?: string
          status?: 'draft' | 'pending_approval' | 'approved' | 'published' | 'completed' | 'cancelled' | 'rejected'
          fee?: string | null
          max_capacity?: number | null
          registered_count?: number
          description?: string | null
          marketing_copy?: string | null
          agenda?: Json | null
          checklist?: Json | null
          updated_at?: string
        }
      }
      scout_event_attendees: {
        Row: {
          id: string
          event_id: string
          prospect_id: string | null
          scout_id: string | null
          role: 'player' | 'scout' | 'coach' | 'parent' | 'agent'
          registered_at: string
          attended: boolean
          checked_in_at: string | null
          notes: string | null
        }
        Insert: {
          id?: string
          event_id: string
          prospect_id?: string | null
          scout_id?: string | null
          role: 'player' | 'scout' | 'coach' | 'parent' | 'agent'
          registered_at?: string
          attended?: boolean
          checked_in_at?: string | null
          notes?: string | null
        }
        Update: {
          id?: string
          event_id?: string
          prospect_id?: string | null
          scout_id?: string | null
          role?: 'player' | 'scout' | 'coach' | 'parent' | 'agent'
          registered_at?: string
          attended?: boolean
          checked_in_at?: string | null
          notes?: string | null
        }
      }
      scout_certifications: {
        Row: {
          id: string
          scout_id: string
          name: string
          issuer: string | null
          issued_date: string | null
          expiry_date: string | null
          created_at: string
        }
        Insert: {
          id?: string
          scout_id: string
          name: string
          issuer?: string | null
          issued_date?: string | null
          expiry_date?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          scout_id?: string
          name?: string
          issuer?: string | null
          issued_date?: string | null
          expiry_date?: string | null
        }
      }
      scout_experience: {
        Row: {
          id: string
          scout_id: string
          role: string
          organization: string
          duration: string | null
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          scout_id: string
          role: string
          organization: string
          duration?: string | null
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          scout_id?: string
          role?: string
          organization?: string
          duration?: string | null
          description?: string | null
        }
      }
    }
  }
}

// Helper types for easier access
export type Scout = Database['public']['Tables']['scouts']['Row']
export type ScoutInsert = Database['public']['Tables']['scouts']['Insert']
export type ScoutUpdate = Database['public']['Tables']['scouts']['Update']

export type ScoutProspect = Database['public']['Tables']['scout_prospects']['Row']
export type ScoutProspectInsert = Database['public']['Tables']['scout_prospects']['Insert']
export type ScoutProspectUpdate = Database['public']['Tables']['scout_prospects']['Update']

export type OutreachLog = Database['public']['Tables']['scout_outreach_logs']['Row']
export type OutreachLogInsert = Database['public']['Tables']['scout_outreach_logs']['Insert']

export type ScoutingEvent = Database['public']['Tables']['scouting_events']['Row']
export type ScoutingEventInsert = Database['public']['Tables']['scouting_events']['Insert']
export type ScoutingEventUpdate = Database['public']['Tables']['scouting_events']['Update']
