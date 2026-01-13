-- Update status constraint to support 5-stage pipeline
-- Old values: prospect, interested, final_review, offered, placed, archived
-- New values: lead, contacted, interested, offered, placed, archived

-- First, update existing data to new status values
UPDATE scout_prospects SET status = 'lead' WHERE status = 'prospect';
UPDATE scout_prospects SET status = 'offered' WHERE status = 'final_review';

-- Drop old constraint
ALTER TABLE scout_prospects DROP CONSTRAINT IF EXISTS scout_prospects_status_check;

-- Add new constraint with updated values
ALTER TABLE scout_prospects
ADD CONSTRAINT scout_prospects_status_check
CHECK (status IN ('lead', 'contacted', 'interested', 'offered', 'placed', 'archived'));

-- Update the default value to 'lead'
ALTER TABLE scout_prospects ALTER COLUMN status SET DEFAULT 'lead';
