import { supabase } from '../lib/supabase'

export interface PublicSubmissionData {
  name: string
  position: string
  age?: number
  email?: string
  phone?: string
  club?: string
  video_link?: string
  notes?: string
}

export async function lookupScout(scoutId: string): Promise<{ id: string; name: string; lead_magnet_active: boolean } | null> {
  const { data, error } = await supabase
    .from('scouts')
    .select('id, name, lead_magnet_active')
    .eq('id', scoutId)
    .single()
  if (error || !data) return null
  return data as { id: string; name: string; lead_magnet_active: boolean }
}

export async function submitProspect(
  scoutId: string,
  formData: PublicSubmissionData
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.from('scout_prospects').insert({
    scout_id: scoutId,
    name: formData.name,
    position: formData.position,
    age: formData.age || null,
    email: formData.email || null,
    phone: formData.phone || null,
    club: formData.club || null,
    video_link: formData.video_link || null,
    notes: formData.notes || null,
    status: 'lead',
    activity_status: 'undiscovered',
  })
  if (error) return { success: false, error: error.message }
  return { success: true }
}
