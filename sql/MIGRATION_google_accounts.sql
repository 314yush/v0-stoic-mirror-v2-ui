-- ============================================
-- MIGRATION: Google Calendar Accounts
-- ============================================
-- Stores connected Google Calendar accounts per user
-- Tokens are encrypted before storage
-- ============================================

CREATE TABLE IF NOT EXISTS google_calendar_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Account Info
  email TEXT NOT NULL,
  name TEXT,
  picture TEXT,
  label TEXT DEFAULT 'Personal',  -- Personal, Work, etc.
  color TEXT DEFAULT '#4285f4',
  
  -- Tokens (encrypted)
  access_token_encrypted TEXT NOT NULL,
  refresh_token_encrypted TEXT NOT NULL,
  expiry_date BIGINT NOT NULL,
  token_type TEXT DEFAULT 'Bearer',
  scope TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint: one account per email per user
  UNIQUE(user_id, email)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_google_accounts_user ON google_calendar_accounts(user_id);

-- RLS
ALTER TABLE google_calendar_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own google accounts" ON google_calendar_accounts;
DROP POLICY IF EXISTS "Users can insert own google accounts" ON google_calendar_accounts;
DROP POLICY IF EXISTS "Users can update own google accounts" ON google_calendar_accounts;
DROP POLICY IF EXISTS "Users can delete own google accounts" ON google_calendar_accounts;

CREATE POLICY "Users can view own google accounts" ON google_calendar_accounts 
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own google accounts" ON google_calendar_accounts 
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own google accounts" ON google_calendar_accounts 
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own google accounts" ON google_calendar_accounts 
  FOR DELETE USING (auth.uid() = user_id);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_google_accounts_updated_at ON google_calendar_accounts;
CREATE TRIGGER update_google_accounts_updated_at
  BEFORE UPDATE ON google_calendar_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

