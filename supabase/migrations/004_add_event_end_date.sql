-- Add event_end_date column for multi-day events
ALTER TABLE scouting_events
ADD COLUMN IF NOT EXISTS event_end_date DATE;

-- Add comment for documentation
COMMENT ON COLUMN scouting_events.event_end_date IS 'Optional end date for multi-day events';
