import { supabase, isSupabaseConfigured, supabaseRest } from '../lib/supabase';
import type { Player } from '../types';
import type { TrialDates } from '../components/TrialRequestModal';

interface TrialProspect {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string | null;
  position: string | null;
  nationality: string | null;
  current_club: string | null;
  email: string | null;
  phone: string | null;
  parent_name: string | null;
  parent_contact: string | null;
  video_url: string | null;
  scouting_notes: string | null;
  recommended_by: string | null;
  status: string;
  created_by: string | null;
}

/**
 * Creates a trial prospect record from a scout prospect
 * Called when a scout changes prospect status to "Offered"
 */
export async function createTrialFromProspect(
  prospect: Player,
  scoutId: string,
  scoutName: string,
  directSign: boolean = false,
  trialDates?: TrialDates
): Promise<{ trialProspectId: string | null; error: string | null }> {
  if (!isSupabaseConfigured) {
    return { trialProspectId: `demo-trial-${Date.now()}`, error: null };
  }

  try {
    // Parse name into first/last
    const nameParts = prospect.name.trim().split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    // Calculate date of birth from age if not provided
    let dateOfBirth = prospect.dateOfBirth;
    if (!dateOfBirth && prospect.age) {
      const today = new Date();
      const birthYear = today.getFullYear() - prospect.age;
      dateOfBirth = `${birthYear}-01-01`; // Default to Jan 1 of calculated year
    }

    // Validate required fields before inserting
    if (!prospect.nationality) {
      return { trialProspectId: null, error: 'Nationality is required to create a trial request. Please add it to the player profile first.' };
    }

    // Build trial prospect data from scout prospect
    // Required fields: first_name, last_name, date_of_birth, position, nationality
    const trialData = {
      first_name: firstName || 'Unknown',
      last_name: lastName || 'Prospect',
      date_of_birth: dateOfBirth || '2000-01-01', // Fallback date
      position: prospect.position || 'Unknown',
      nationality: prospect.nationality,
      current_club: prospect.club || null,
      email: prospect.email || null,
      phone: prospect.phone || null,
      parent_name: prospect.parentName || null,
      parent_contact: prospect.parentPhone || prospect.parentEmail || null,
      video_url: prospect.videoLink || null,
      scouting_notes: buildScoutingNotes(prospect),
      recommended_by: scoutName,
      status: directSign ? 'accepted' : (trialDates ? 'requested' : 'scheduled'),
      created_by: scoutId || null,
      // Scout reference for trial requests
      scout_id: scoutId || null,
      // Requested dates (staff confirms actual trial_start_date/trial_end_date on approval)
      ...(trialDates && {
        requested_start_date: trialDates.start || null,
        requested_end_date: trialDates.end || null,
        dates_flexible: trialDates.flexible,
      }),
      // Ratings from scout evaluation
      technical_rating: prospect.technical || null,
      tactical_rating: prospect.tactical || null,
      physical_rating: prospect.physical || null,
      overall_rating: prospect.evaluation?.score || null,
    };

    // Use REST API to avoid Supabase JS client hanging issues
    const { data, error } = await supabaseRest.insert<any>('trial_prospects', trialData);

    if (error) {
      console.error('Error creating trial prospect:', error);
      return { trialProspectId: null, error: error.message };
    }

    if (!data) {
      return { trialProspectId: null, error: 'No data returned' };
    }

    return { trialProspectId: data.id, error: null };
  } catch (err) {
    console.error('Error in createTrialFromProspect:', err);
    return {
      trialProspectId: null,
      error: err instanceof Error ? err.message : 'Failed to create trial prospect'
    };
  }
}

/**
 * Links a scout prospect to an existing trial prospect
 */
export async function linkProspectToTrial(
  prospectId: string,
  trialProspectId: string
): Promise<{ success: boolean; error: string | null }> {
  if (!isSupabaseConfigured) {
    return { success: true, error: null };
  }

  try {
    const { error } = await (supabase
      .from('scout_prospects') as any)
      .update({ trial_prospect_id: trialProspectId })
      .eq('id', prospectId);

    if (error) {
      console.error('Error linking prospect to trial:', error);
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (err) {
    console.error('Error in linkProspectToTrial:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to link prospect to trial'
    };
  }
}

/**
 * Full workflow: Create trial prospect and link it to scout prospect
 */
export async function sendProspectToTrial(
  prospect: Player,
  scoutId: string,
  scoutName: string,
  directSign: boolean = false,
  trialDates?: TrialDates
): Promise<{ success: boolean; trialProspectId: string | null; error: string | null }> {
  // Step 1: Create trial prospect
  const { trialProspectId, error: createError } = await createTrialFromProspect(
    prospect,
    scoutId,
    scoutName,
    directSign,
    trialDates
  );

  if (createError || !trialProspectId) {
    return { success: false, trialProspectId: null, error: createError };
  }

  // Step 2: Link scout prospect to trial
  const { success, error: linkError } = await linkProspectToTrial(
    prospect.id,
    trialProspectId
  );

  if (!success) {
    return { success: false, trialProspectId, error: linkError };
  }

  return { success: true, trialProspectId, error: null };
}

/**
 * Stamp a trial prospect with contract_requested_at/by when scout moves to Send Contract
 */
export async function markContractRequested(
  trialProspectId: string,
  scoutName: string
): Promise<void> {
  if (!isSupabaseConfigured || !trialProspectId) return;
  try {
    await supabaseRest.update('trial_prospects', `id=eq.${trialProspectId}`, {
      contract_requested_at: new Date().toISOString(),
      contract_requested_by: scoutName,
    });
  } catch (err) {
    console.error('Error marking contract requested:', err);
  }
}

/**
 * Build scouting notes from prospect data for trial staff
 */
function buildScoutingNotes(prospect: Player): string {
  const notes: string[] = [];

  if (prospect.evaluation?.summary) {
    notes.push(`AI Evaluation: ${prospect.evaluation.summary}`);
  }

  if (prospect.evaluation?.strengths?.length) {
    notes.push(`Strengths: ${prospect.evaluation.strengths.join(', ')}`);
  }

  if (prospect.evaluation?.weaknesses?.length) {
    notes.push(`Areas to develop: ${prospect.evaluation.weaknesses.join(', ')}`);
  }

  if (prospect.gpa) {
    notes.push(`GPA: ${prospect.gpa}`);
  }

  if (prospect.gradYear) {
    notes.push(`Graduation: ${prospect.gradYear}`);
  }

  if (prospect.teamLevel) {
    notes.push(`Team Level: ${prospect.teamLevel}`);
  }

  if (prospect.notes) {
    notes.push(`Scout Notes: ${prospect.notes}`);
  }

  return notes.join('\n\n') || 'No additional notes from scout.';
}
