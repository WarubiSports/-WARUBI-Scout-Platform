-- WARUBI Scout Platform - Enable Authenticated RLS
-- Run this in Supabase SQL Editor to enforce user data isolation
-- ================================================================

-- Step 1: Create helper function (if not exists)
CREATE OR REPLACE FUNCTION get_my_scout_id()
RETURNS UUID AS $$
  SELECT id FROM scouts WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- Step 2: Drop permissive policies
DROP POLICY IF EXISTS "Allow anonymous scout operations" ON scouts;
DROP POLICY IF EXISTS "Allow anonymous prospect operations" ON scout_prospects;
DROP POLICY IF EXISTS "Allow anonymous outreach operations" ON scout_outreach_logs;
DROP POLICY IF EXISTS "Allow anonymous event operations" ON scouting_events;
DROP POLICY IF EXISTS "Allow anonymous attendee operations" ON scout_event_attendees;

-- Step 3: Create authenticated policies for scouts
CREATE POLICY "Users can view own scout profile" ON scouts
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own scout profile" ON scouts
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can insert own scout profile" ON scouts
  FOR INSERT WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- Step 4: Create authenticated policies for prospects
CREATE POLICY "Scouts can view own prospects" ON scout_prospects
  FOR SELECT USING (scout_id = get_my_scout_id());

CREATE POLICY "Scouts can insert own prospects" ON scout_prospects
  FOR INSERT WITH CHECK (scout_id = get_my_scout_id());

CREATE POLICY "Scouts can update own prospects" ON scout_prospects
  FOR UPDATE USING (scout_id = get_my_scout_id());

CREATE POLICY "Scouts can delete own prospects" ON scout_prospects
  FOR DELETE USING (scout_id = get_my_scout_id());

-- Step 5: Create authenticated policies for outreach logs
CREATE POLICY "Scouts can view own outreach logs" ON scout_outreach_logs
  FOR SELECT USING (scout_id = get_my_scout_id());

CREATE POLICY "Scouts can insert own outreach logs" ON scout_outreach_logs
  FOR INSERT WITH CHECK (scout_id = get_my_scout_id());

-- Step 6: Create authenticated policies for events
-- Scouts can see published events OR their own
CREATE POLICY "Scouts can view events" ON scouting_events
  FOR SELECT USING (status = 'published' OR host_scout_id = get_my_scout_id());

CREATE POLICY "Scouts can insert own events" ON scouting_events
  FOR INSERT WITH CHECK (host_scout_id = get_my_scout_id());

CREATE POLICY "Scouts can update own events" ON scouting_events
  FOR UPDATE USING (host_scout_id = get_my_scout_id());

CREATE POLICY "Scouts can delete own events" ON scouting_events
  FOR DELETE USING (host_scout_id = get_my_scout_id());

-- Step 7: Create authenticated policies for event attendees
CREATE POLICY "Scouts can view event attendance" ON scout_event_attendees
  FOR SELECT USING (scout_id = get_my_scout_id());

CREATE POLICY "Scouts can register for events" ON scout_event_attendees
  FOR INSERT WITH CHECK (scout_id = get_my_scout_id());

CREATE POLICY "Scouts can cancel own registration" ON scout_event_attendees
  FOR DELETE USING (scout_id = get_my_scout_id());

-- Done! Now:
-- - Authenticated users only see their own data
-- - New signups start with empty pipeline
-- - Demo mode in the app still works (uses localStorage, not Supabase)
