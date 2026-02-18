-- WARUBI Scout Platform - Row Level Security Policies
-- Run these in Supabase SQL Editor to set up proper authenticated access
-- =====================================================================

-- IMPORTANT: Currently using permissive anonymous policies for demo mode.
-- When ready to enforce authentication, run the "Enable Auth Enforcement" section.

-- =====================================================================
-- CURRENT STATE: Permissive policies (already applied)
-- These allow anonymous access for demo mode
-- =====================================================================

-- If not already applied, these create permissive policies:
/*
CREATE POLICY "Allow anonymous scout operations" ON scouts
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow anonymous prospect operations" ON scout_prospects
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow anonymous outreach operations" ON scout_outreach_logs
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow anonymous event operations" ON scouting_events
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow anonymous attendee operations" ON scout_event_attendees
  FOR ALL USING (true) WITH CHECK (true);
*/

-- =====================================================================
-- AUTHENTICATED POLICIES
-- These restrict access to own data when authenticated
-- =====================================================================

-- First, create helper function to get user's scout_id
CREATE OR REPLACE FUNCTION get_my_scout_id()
RETURNS UUID AS $$
  SELECT id FROM scouts WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- =====================================================================
-- Enable Auth Enforcement (Run when ready to require login)
-- =====================================================================
-- Step 1: Drop permissive policies
/*
DROP POLICY IF EXISTS "Allow anonymous scout operations" ON scouts;
DROP POLICY IF EXISTS "Allow anonymous prospect operations" ON scout_prospects;
DROP POLICY IF EXISTS "Allow anonymous outreach operations" ON scout_outreach_logs;
DROP POLICY IF EXISTS "Allow anonymous event operations" ON scouting_events;
DROP POLICY IF EXISTS "Allow anonymous attendee operations" ON scout_event_attendees;
*/

-- Step 2: Create authenticated policies

-- Scouts: Users can only see/edit their own scout profile
/*
CREATE POLICY "Users can view own scout profile" ON scouts
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own scout profile" ON scouts
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can insert own scout profile" ON scouts
  FOR INSERT WITH CHECK (user_id = auth.uid());
*/

-- Prospects: Scouts can only see/edit their own prospects
/*
CREATE POLICY "Scouts can view own prospects" ON scout_prospects
  FOR SELECT USING (scout_id = get_my_scout_id());

CREATE POLICY "Scouts can insert own prospects" ON scout_prospects
  FOR INSERT WITH CHECK (scout_id = get_my_scout_id());

CREATE POLICY "Scouts can update own prospects" ON scout_prospects
  FOR UPDATE USING (scout_id = get_my_scout_id());

CREATE POLICY "Scouts can delete own prospects" ON scout_prospects
  FOR DELETE USING (scout_id = get_my_scout_id());
*/

-- Outreach Logs: Scouts can only see/edit their own logs
/*
CREATE POLICY "Scouts can view own outreach logs" ON scout_outreach_logs
  FOR SELECT USING (scout_id = get_my_scout_id());

CREATE POLICY "Scouts can insert own outreach logs" ON scout_outreach_logs
  FOR INSERT WITH CHECK (scout_id = get_my_scout_id());
*/

-- Events: Scouts can see all published events + their own
/*
CREATE POLICY "Scouts can view published events" ON scouting_events
  FOR SELECT USING (status = 'published' OR host_scout_id = get_my_scout_id());

CREATE POLICY "Scouts can insert own events" ON scouting_events
  FOR INSERT WITH CHECK (host_scout_id = get_my_scout_id());

CREATE POLICY "Scouts can update own events" ON scouting_events
  FOR UPDATE USING (host_scout_id = get_my_scout_id());

CREATE POLICY "Scouts can delete own events" ON scouting_events
  FOR DELETE USING (host_scout_id = get_my_scout_id());
*/

-- Event Attendees: Scouts can manage their own attendance
/*
CREATE POLICY "Scouts can view event attendance" ON scout_event_attendees
  FOR SELECT USING (scout_id = get_my_scout_id());

CREATE POLICY "Scouts can register for events" ON scout_event_attendees
  FOR INSERT WITH CHECK (scout_id = get_my_scout_id());

CREATE POLICY "Scouts can cancel own registration" ON scout_event_attendees
  FOR DELETE USING (scout_id = get_my_scout_id());
*/

-- =====================================================================
-- ADMIN POLICIES (for future admin features)
-- =====================================================================
/*
-- Admins can see all scouts
CREATE POLICY "Admins can view all scouts" ON scouts
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM scouts WHERE user_id = auth.uid() AND is_admin = true)
  );

-- Admins can update all scouts
CREATE POLICY "Admins can update all scouts" ON scouts
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM scouts WHERE user_id = auth.uid() AND is_admin = true)
  );
*/
