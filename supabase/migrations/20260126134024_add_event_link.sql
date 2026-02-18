-- Add event_link column to scouting_events table
-- This allows storing external URLs (e.g., registration pages) for events

ALTER TABLE scouting_events
ADD COLUMN IF NOT EXISTS event_link VARCHAR(500);
