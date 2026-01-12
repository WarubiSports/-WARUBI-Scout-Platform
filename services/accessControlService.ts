import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface ApprovedScout {
  id: string;
  email: string;
  name: string | null;
  region: string | null;
  role: string;
  notes: string | null;
  approved_by: string | null;
  approved_at: string;
  has_registered: boolean;
  registered_at: string | null;
}

/**
 * Check if an email is in the approved scouts list
 * Uses RPC function to bypass table-level REST API access issues
 */
export async function isEmailApproved(email: string): Promise<{
  approved: boolean;
  scout?: Partial<ApprovedScout>;
  error?: string;
}> {
  if (!isSupabaseConfigured) {
    // In demo mode, allow all emails
    return { approved: true };
  }

  try {
    // Use RPC function instead of direct table query
    const { data, error } = await (supabase.rpc as any)('check_email_approved', {
      email_to_check: email.toLowerCase().trim()
    });

    if (error) {
      console.error('Error checking approved scouts via RPC:', error);
      return { approved: false, error: error.message };
    }

    // RPC returns array with single row: { is_approved, scout_role, scout_name, scout_region }
    const result = (data as any[])?.[0];

    if (!result || !result.is_approved) {
      return { approved: false };
    }

    return {
      approved: true,
      scout: {
        email: email.toLowerCase().trim(),
        name: result.scout_name,
        region: result.scout_region,
        role: result.scout_role
      }
    };
  } catch (err) {
    console.error('Error in isEmailApproved:', err);
    return { approved: false, error: 'Failed to check approval status' };
  }
}

/**
 * Mark a scout as registered (after they complete signup)
 * Uses RPC function to bypass table-level access issues
 */
export async function markScoutRegistered(email: string): Promise<boolean> {
  if (!isSupabaseConfigured) return true;

  try {
    const { data, error } = await (supabase.rpc as any)('mark_scout_registered', {
      p_email: email.toLowerCase().trim()
    });

    if (error) {
      console.error('Error marking scout registered via RPC:', error);
      return false;
    }
    return data === true;
  } catch (err) {
    console.error('Error in markScoutRegistered:', err);
    return false;
  }
}

/**
 * Check if user needs to set up a password
 * (They logged in via magic link but haven't set a password yet)
 */
export async function needsPasswordSetup(): Promise<boolean> {
  if (!isSupabaseConfigured) return false;

  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return false;

    // Check user metadata for password setup status
    const hasSetPassword = user.user_metadata?.has_set_password === true;

    // Also check if user has any password identities
    const hasPasswordIdentity = user.identities?.some(
      (identity) => identity.provider === 'email'
    );

    // User needs password setup if they logged in via magic link
    // but haven't explicitly set a password
    return !hasSetPassword && !hasPasswordIdentity;
  } catch (err) {
    console.error('Error checking password setup:', err);
    return false;
  }
}

/**
 * Set password for current user and update metadata
 */
export async function setUserPassword(password: string): Promise<{
  success: boolean;
  error?: string;
}> {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'Not configured' };
  }

  try {
    // Update password
    const { error: passwordError } = await supabase.auth.updateUser({
      password,
    });

    if (passwordError) {
      return { success: false, error: passwordError.message };
    }

    // Update metadata to mark password as set
    const { error: metaError } = await supabase.auth.updateUser({
      data: { has_set_password: true },
    });

    if (metaError) {
      console.warn('Failed to update metadata:', metaError);
      // Password was still set successfully
    }

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: message };
  }
}

// ============ ADMIN FUNCTIONS ============

/**
 * Get all approved scouts (admin only)
 * Uses RPC function to bypass table-level access issues
 */
export async function getAllApprovedScouts(): Promise<{
  scouts: ApprovedScout[];
  error?: string;
}> {
  if (!isSupabaseConfigured) {
    return { scouts: [] };
  }

  try {
    const { data, error } = await supabase.rpc('get_all_approved_scouts');

    if (error) {
      console.error('Error fetching approved scouts via RPC:', error);
      return { scouts: [], error: error.message };
    }

    return { scouts: data || [] };
  } catch (err) {
    return { scouts: [], error: 'Failed to fetch approved scouts' };
  }
}

/**
 * Add a scout to the approved list (admin only)
 * Uses RPC function to bypass table-level access issues
 */
export async function addApprovedScout(
  email: string,
  name?: string,
  region?: string,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'Not configured' };
  }

  try {
    // Get user with timeout to prevent hanging
    let approvedBy = 'admin';
    try {
      const userPromise = supabase.auth.getUser();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('getUser timeout')), 3000)
      );
      const { data: { user } } = await Promise.race([userPromise, timeoutPromise]) as any;
      approvedBy = user?.email || 'admin';
    } catch (e) {
      console.warn('Could not get user for approved_by, using default');
    }

    const { data, error } = await (supabase.rpc as any)('add_approved_scout', {
      p_email: email.toLowerCase().trim(),
      p_name: name || null,
      p_region: region || null,
      p_notes: notes || null,
      p_approved_by: approvedBy
    });

    if (error) {
      if (error.code === '23505') {
        return { success: false, error: 'This email is already approved' };
      }
      console.error('Error adding approved scout via RPC:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: 'Failed to add scout' };
  }
}

/**
 * Remove a scout from the approved list (admin only)
 * Uses RPC function to bypass table-level access issues
 */
export async function removeApprovedScout(id: string): Promise<{
  success: boolean;
  error?: string;
}> {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'Not configured' };
  }

  try {
    const { data, error } = await (supabase.rpc as any)('remove_approved_scout', {
      p_id: id
    });

    if (error) {
      console.error('Error removing approved scout via RPC:', error);
      return { success: false, error: error.message };
    }

    return { success: data === true };
  } catch (err) {
    return { success: false, error: 'Failed to remove scout' };
  }
}

/**
 * Update an approved scout's details (admin only)
 * Uses RPC function to bypass table-level access issues
 */
export async function updateApprovedScout(
  id: string,
  updates: Partial<Pick<ApprovedScout, 'name' | 'region' | 'notes' | 'role'>>
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'Not configured' };
  }

  try {
    const { data, error } = await (supabase.rpc as any)('update_approved_scout', {
      p_id: id,
      p_name: updates.name || null,
      p_region: updates.region || null,
      p_notes: updates.notes || null,
      p_role: updates.role || null
    });

    if (error) {
      console.error('Error updating approved scout via RPC:', error);
      return { success: false, error: error.message };
    }

    return { success: data === true };
  } catch (err) {
    return { success: false, error: 'Failed to update scout' };
  }
}

/**
 * Send a magic link invitation to an approved scout
 * This sends an email with a login link directly to the scout
 */
export async function sendScoutInvite(email: string): Promise<{
  success: boolean;
  error?: string;
}> {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'Not configured' };
  }

  try {
    const { error } = await supabase.auth.signInWithOtp({
      email: email.toLowerCase().trim(),
      options: {
        emailRedirectTo: typeof window !== 'undefined'
          ? `${window.location.origin}/auth/callback`
          : undefined,
      },
    });

    if (error) {
      console.error('Error sending invite:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: 'Failed to send invitation' };
  }
}
