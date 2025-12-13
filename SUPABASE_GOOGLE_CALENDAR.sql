-- Google Calendar Integration Schema
-- Run this in your Supabase SQL Editor after SUPABASE_SETUP.sql

-- Google Calendar OAuth tokens (encrypted)
CREATE TABLE IF NOT EXISTS google_calendar_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL, -- Encrypted in application layer
  refresh_token TEXT NOT NULL, -- Encrypted in application layer
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Imported Google Calendar events (for reference/display)
CREATE TABLE IF NOT EXISTS imported_calendar_events (
  id TEXT PRIMARY KEY, -- Google Calendar event ID
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  google_event_id TEXT NOT NULL,
  summary TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  date DATE NOT NULL, -- YYYY-MM-DD for quick lookup
  description TEXT,
  location TEXT,
  color_id TEXT,
  imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, google_event_id)
);

-- Mapping between Stoic Mirror blocks and Google Calendar events (for two-way sync)
CREATE TABLE IF NOT EXISTS calendar_event_mappings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  block_id TEXT NOT NULL, -- Stoic Mirror block ID
  google_event_id TEXT NOT NULL, -- Google Calendar event ID
  date DATE NOT NULL, -- YYYY-MM-DD
  sync_direction TEXT DEFAULT 'export' CHECK (sync_direction IN ('export', 'import', 'bidirectional')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, block_id, date),
  UNIQUE(user_id, google_event_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_google_calendar_connections_user_id ON google_calendar_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_imported_calendar_events_user_id ON imported_calendar_events(user_id);
CREATE INDEX IF NOT EXISTS idx_imported_calendar_events_date ON imported_calendar_events(date);
CREATE INDEX IF NOT EXISTS idx_calendar_event_mappings_user_id ON calendar_event_mappings(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_event_mappings_block_id ON calendar_event_mappings(block_id);
CREATE INDEX IF NOT EXISTS idx_calendar_event_mappings_date ON calendar_event_mappings(date);

-- Row Level Security (RLS) Policies
ALTER TABLE google_calendar_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE imported_calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_event_mappings ENABLE ROW LEVEL SECURITY;

-- Google Calendar Connections Policies
CREATE POLICY "Users can view own calendar connections"
  ON google_calendar_connections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own calendar connections"
  ON google_calendar_connections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own calendar connections"
  ON google_calendar_connections FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own calendar connections"
  ON google_calendar_connections FOR DELETE
  USING (auth.uid() = user_id);

-- Imported Calendar Events Policies
CREATE POLICY "Users can view own imported events"
  ON imported_calendar_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own imported events"
  ON imported_calendar_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own imported events"
  ON imported_calendar_events FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own imported events"
  ON imported_calendar_events FOR DELETE
  USING (auth.uid() = user_id);

-- Calendar Event Mappings Policies
CREATE POLICY "Users can view own event mappings"
  ON calendar_event_mappings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own event mappings"
  ON calendar_event_mappings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own event mappings"
  ON calendar_event_mappings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own event mappings"
  ON calendar_event_mappings FOR DELETE
  USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_google_calendar_connections_updated_at
  BEFORE UPDATE ON google_calendar_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_imported_calendar_events_updated_at
  BEFORE UPDATE ON imported_calendar_events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_calendar_event_mappings_updated_at
  BEFORE UPDATE ON calendar_event_mappings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();




