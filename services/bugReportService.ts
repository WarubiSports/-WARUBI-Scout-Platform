import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { BugReport, BugReportStatus, BugReportPriority } from '../types';

// const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL; // Unused

/**
 * Upload a screenshot to Supabase Storage
 */
export async function uploadScreenshot(file: File): Promise<string | null> {
  if (!isSupabaseConfigured) return null;

  try {
    const fileName = `bug-${Date.now()}-${Math.random().toString(36).substring(7)}.${file.name.split('.').pop()}`;
    const filePath = `bug-screenshots/${fileName}`;

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
 * Create a new bug report using RPC function
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
    // Get current user info
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await (supabase.rpc as any)('create_bug_report', {
      p_title: title,
      p_description: description || null,
      p_page_url: pageUrl || null,
      p_reporter_id: user?.id || null,
      p_reporter_name: user?.email || 'Anonymous',
      p_screenshot_url: screenshotUrl || null,
      p_priority: priority || 'medium'
    });

    if (error) {
      console.error('Error creating bug report:', error);
      return { success: false, error: error.message };
    }

    return { success: true, id: data };
  } catch (err) {
    console.error('Error in createBugReport:', err);
    return { success: false, error: 'Failed to submit bug report' };
  }
}

/**
 * Get all bug reports (admin only)
 */
export async function getAllBugReports(): Promise<{
  reports: BugReport[];
  error?: string;
}> {
  if (!isSupabaseConfigured) {
    return { reports: [] };
  }

  try {
    const { data, error } = await (supabase.rpc as any)('get_all_bug_reports');

    if (error) {
      console.error('Error fetching bug reports:', error);
      return { reports: [], error: error.message };
    }

    // Transform snake_case to camelCase
    const reports: BugReport[] = (data || []).map((r: any) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      pageUrl: r.page_url,
      reporterId: r.reporter_id,
      reporterName: r.reporter_name,
      screenshotUrl: r.screenshot_url,
      status: r.status,
      priority: r.priority,
      adminNotes: r.admin_notes,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }));

    return { reports };
  } catch (err) {
    console.error('Error in getAllBugReports:', err);
    return { reports: [], error: 'Failed to fetch bug reports' };
  }
}

/**
 * Update bug report status (admin only)
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
    const { data, error } = await (supabase.rpc as any)('update_bug_report_status', {
      p_id: id,
      p_status: status,
      p_admin_notes: adminNotes || null
    });

    if (error) {
      console.error('Error updating bug report:', error);
      return { success: false, error: error.message };
    }

    return { success: data === true };
  } catch (err) {
    console.error('Error in updateBugReportStatus:', err);
    return { success: false, error: 'Failed to update bug report' };
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
