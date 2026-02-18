import { supabase, isSupabaseConfigured, supabaseRest } from '../lib/supabase';
import type { BugReport, BugReportStatus, BugReportPriority } from '../types';
import type { Feedback, FeedbackInsert } from '../lib/database.types';

/**
 * Upload a screenshot to Supabase Storage
 */
export async function uploadScreenshot(file: File): Promise<string | null> {
  if (!isSupabaseConfigured) return null;

  try {
    const fileName = `feedback-${Date.now()}-${Math.random().toString(36).substring(7)}.${file.name.split('.').pop()}`;
    const filePath = `feedback-screenshots/${fileName}`;

    const { error } = await supabase.storage
      .from('uploads')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Error uploading screenshot:', error);
      return null;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('uploads')
      .getPublicUrl(filePath);

    return urlData?.publicUrl || null;
  } catch (err) {
    console.error('Error in uploadScreenshot:', err);
    return null;
  }
}

/**
 * Create a new feedback/bug report using direct REST API
 */
export async function createBugReport(
  title: string,
  description?: string,
  pageUrl?: string,
  screenshotUrl?: string,
  priority?: BugReportPriority
): Promise<{ success: boolean; id?: string; error?: string }> {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'Supabase not configured' };
  }

  try {
    console.log('[createBugReport] Starting submission...');

    // Get current user info - use a timeout to prevent hanging
    console.log('[createBugReport] Getting user info...');
    let user = null;
    try {
      const userPromise = supabase.auth.getUser();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('getUser timeout')), 3000)
      );
      const { data: { user: fetchedUser } } = await Promise.race([userPromise, timeoutPromise]) as any;
      user = fetchedUser;
      console.log('[createBugReport] Got user:', user?.email);
    } catch (userError) {
      console.warn('[createBugReport] Could not get user, continuing without:', userError);
    }

    // Extract feedback type from title prefix (e.g., "[Feature] Title" -> "feature")
    let feedbackType: 'bug' | 'feature' | 'idea' | 'other' = 'other';
    let cleanTitle = title;

    const typeMatch = title.match(/^\[(Bug|Feature|Idea|Other)\]\s*/i);
    if (typeMatch) {
      const type = typeMatch[1].toLowerCase();
      if (type === 'bug' || type === 'feature' || type === 'idea' || type === 'other') {
        feedbackType = type;
      }
      cleanTitle = title.replace(typeMatch[0], '');
    }

    const feedbackData: FeedbackInsert = {
      title: cleanTitle,
      description: description || null,
      feedback_type: feedbackType,
      page_url: pageUrl || null,
      reporter_id: user?.id || null,
      reporter_name: user?.user_metadata?.name || user?.email?.split('@')[0] || 'Anonymous',
      reporter_email: user?.email || null,
      screenshot_url: screenshotUrl || null,
      status: 'open',
      priority: priority || 'medium'
    };

    console.log('[createBugReport] Submitting feedback:', feedbackData);

    const { data, error } = await supabaseRest.insert<Feedback>('feedback', feedbackData);

    if (error) {
      console.error('Error creating feedback:', error);

      // Check if it's a table not found error
      if (error.message.includes('does not exist') || error.message.includes('404')) {
        return {
          success: false,
          error: 'Feedback table not set up. Please contact admin to create the feedback table in Supabase.'
        };
      }

      return { success: false, error: error.message };
    }

    console.log('[createBugReport] Success! Feedback ID:', data?.id);
    return { success: true, id: data?.id };
  } catch (err) {
    console.error('Error in createBugReport:', err);
    return { success: false, error: 'Failed to submit feedback' };
  }
}

/**
 * Get all feedback/bug reports (admin only)
 */
export async function getAllBugReports(): Promise<{
  reports: BugReport[];
  error?: string;
}> {
  if (!isSupabaseConfigured) {
    return { reports: [] };
  }

  try {
    const { data, error } = await supabaseRest.select<Feedback>(
      'feedback',
      'order=created_at.desc'
    );

    if (error) {
      console.error('Error fetching feedback:', error);
      return { reports: [], error: error.message };
    }

    // Transform to BugReport type
    const reports: BugReport[] = ((data as Feedback[]) || []).map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description || undefined,
      pageUrl: r.page_url || undefined,
      reporterId: r.reporter_id || undefined,
      reporterName: r.reporter_name || undefined,
      screenshotUrl: r.screenshot_url || undefined,
      status: r.status,
      priority: r.priority,
      adminNotes: r.admin_notes || undefined,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }));

    return { reports };
  } catch (err) {
    console.error('Error in getAllBugReports:', err);
    return { reports: [], error: 'Failed to fetch feedback' };
  }
}

/**
 * Update feedback status (admin only)
 */
export async function updateBugReportStatus(
  id: string,
  status: BugReportStatus,
  adminNotes?: string
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'Supabase not configured' };
  }

  try {
    const { error } = await supabaseRest.update('feedback', `id=eq.${id}`, {
      status,
      admin_notes: adminNotes || null,
      updated_at: new Date().toISOString()
    });

    if (error) {
      console.error('Error updating feedback:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('Error in updateBugReportStatus:', err);
    return { success: false, error: 'Failed to update feedback' };
  }
}

/**
 * Generate a Claude Code prompt for fixing a bug
 */
export function generateClaudePrompt(report: BugReport): string {
  const parts = [
    `# Bug Fix Request`,
    ``,
    `## Title`,
    report.title,
    ``,
    `## Description`,
    report.description || 'No description provided',
    ``
  ];

  if (report.pageUrl) {
    parts.push(`## Page/Location`);
    parts.push(report.pageUrl);
    parts.push(``);
  }

  if (report.screenshotUrl) {
    parts.push(`## Screenshot`);
    parts.push(`View the screenshot at: ${report.screenshotUrl}`);
    parts.push(``);
  }

  parts.push(`## Priority`);
  parts.push(report.priority.toUpperCase());
  parts.push(``);
  parts.push(`## Task`);
  parts.push(`Please investigate this bug and provide a fix. Start by understanding the issue, then locate the relevant code, and implement a solution.`);

  return parts.join('\n');
}
