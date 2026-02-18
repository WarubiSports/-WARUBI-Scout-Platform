-- Approved Scouts Table
-- Only emails in this table can sign up/log in to the platform

CREATE TABLE IF NOT EXISTS approved_scouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  region TEXT,
  role TEXT DEFAULT 'scout',
  notes TEXT,
  approved_by TEXT,
  approved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Track if they've actually signed up
  has_registered BOOLEAN DEFAULT FALSE,
  registered_at TIMESTAMP WITH TIME ZONE
);

-- Index for fast email lookups
CREATE INDEX IF NOT EXISTS idx_approved_scouts_email ON approved_scouts(email);

-- Enable RLS
ALTER TABLE approved_scouts ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can check if their email is approved (for login flow)
CREATE POLICY "Anyone can check email approval" ON approved_scouts
  FOR SELECT
  USING (true);

-- Policy: Only admins can insert/update/delete
-- (Admin check via user metadata or separate admin table)
CREATE POLICY "Only admins can manage approved scouts" ON approved_scouts
  FOR ALL
  USING (
    auth.jwt() ->> 'role' = 'admin' OR
    (auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean = true
  );

-- Add some initial approved scouts (replace with actual emails)
-- INSERT INTO approved_scouts (email, name, region, approved_by) VALUES
--   ('admin@warubi.com', 'Admin User', 'Global', 'system'),
--   ('scout1@example.com', 'Test Scout', 'Texas', 'admin');
