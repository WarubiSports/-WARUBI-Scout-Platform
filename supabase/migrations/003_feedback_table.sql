-- Create feedback table for bug reports and feature requests
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.feedback (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    feedback_type TEXT DEFAULT 'other' CHECK (feedback_type IN ('bug', 'feature', 'idea', 'other')),
    page_url TEXT,
    reporter_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    reporter_name TEXT,
    reporter_email TEXT,
    screenshot_url TEXT,
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    admin_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone authenticated can insert feedback
CREATE POLICY "Users can submit feedback" ON public.feedback
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Policy: Users can view their own feedback
CREATE POLICY "Users can view own feedback" ON public.feedback
    FOR SELECT
    TO authenticated
    USING (reporter_id = auth.uid());

-- Policy: Admins can view all feedback (check if user is admin in scouts table)
CREATE POLICY "Admins can view all feedback" ON public.feedback
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.scouts
            WHERE scouts.user_id = auth.uid()
            AND scouts.is_admin = true
        )
    );

-- Policy: Admins can update feedback
CREATE POLICY "Admins can update feedback" ON public.feedback
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.scouts
            WHERE scouts.user_id = auth.uid()
            AND scouts.is_admin = true
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.scouts
            WHERE scouts.user_id = auth.uid()
            AND scouts.is_admin = true
        )
    );

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_feedback_status ON public.feedback(status);
CREATE INDEX IF NOT EXISTS idx_feedback_reporter ON public.feedback(reporter_id);
CREATE INDEX IF NOT EXISTS idx_feedback_created ON public.feedback(created_at DESC);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_feedback_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER feedback_updated_at
    BEFORE UPDATE ON public.feedback
    FOR EACH ROW
    EXECUTE FUNCTION update_feedback_updated_at();

-- Grant permissions
GRANT ALL ON public.feedback TO authenticated;
GRANT SELECT ON public.feedback TO anon;
