-- Add offered_pathway column to track which Warubi pathway a player was offered
-- Values: 'europe', 'college', 'events', 'coaching'

ALTER TABLE scout_prospects ADD COLUMN IF NOT EXISTS offered_pathway TEXT;

-- Add comment for documentation
COMMENT ON COLUMN scout_prospects.offered_pathway IS 'Warubi pathway offered to player: europe, college, events, or coaching';
