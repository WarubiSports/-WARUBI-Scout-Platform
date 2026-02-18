-- Create scout_event_attendees table for tracking event attendance
CREATE TABLE IF NOT EXISTS scout_event_attendees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES scouting_events(id) ON DELETE CASCADE,
    prospect_id UUID REFERENCES scout_prospects(id) ON DELETE SET NULL,
    scout_id UUID REFERENCES scouts(id) ON DELETE SET NULL,
    role TEXT NOT NULL CHECK (role IN ('player', 'scout', 'coach', 'parent', 'agent')),
    registered_at TIMESTAMPTZ DEFAULT NOW(),
    attended BOOLEAN DEFAULT FALSE,
    checked_in_at TIMESTAMPTZ,
    notes TEXT,

    -- Prevent duplicate registrations
    UNIQUE(event_id, scout_id),
    UNIQUE(event_id, prospect_id)
);

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_event_attendees_event ON scout_event_attendees(event_id);
CREATE INDEX IF NOT EXISTS idx_event_attendees_scout ON scout_event_attendees(scout_id);

-- Enable RLS
ALTER TABLE scout_event_attendees ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist, then recreate
DROP POLICY IF EXISTS "Scouts can view event attendees" ON scout_event_attendees;
DROP POLICY IF EXISTS "Scouts can register for events" ON scout_event_attendees;
DROP POLICY IF EXISTS "Scouts can update own attendance" ON scout_event_attendees;
DROP POLICY IF EXISTS "Scouts can cancel own attendance" ON scout_event_attendees;

-- Scouts can view all attendees for any event
CREATE POLICY "Scouts can view event attendees" ON scout_event_attendees
    FOR SELECT USING (true);

-- Scouts can register themselves for events
CREATE POLICY "Scouts can register for events" ON scout_event_attendees
    FOR INSERT WITH CHECK (
        scout_id = (SELECT id FROM scouts WHERE user_id = auth.uid())
    );

-- Scouts can update their own attendance
CREATE POLICY "Scouts can update own attendance" ON scout_event_attendees
    FOR UPDATE USING (
        scout_id = (SELECT id FROM scouts WHERE user_id = auth.uid())
    );

-- Scouts can cancel their own attendance
CREATE POLICY "Scouts can cancel own attendance" ON scout_event_attendees
    FOR DELETE USING (
        scout_id = (SELECT id FROM scouts WHERE user_id = auth.uid())
    );

-- Add comment
COMMENT ON TABLE scout_event_attendees IS 'Tracks scout and prospect attendance/registration for scouting events';
