-- Supabase Database Schema for Mindful OS
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Journal Entries Table
CREATE TABLE IF NOT EXISTS journal_entries (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  mood TEXT,
  tags TEXT[] DEFAULT '{}',
  is_sensitive BOOLEAN DEFAULT false,
  visibility TEXT DEFAULT 'private' CHECK (visibility IN ('private', 'shared')),
  ai_summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Schedule Commits Table
CREATE TABLE IF NOT EXISTS schedule_commits (
  id TEXT PRIMARY KEY, -- date string (YYYY-MM-DD)
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  blocks JSONB NOT NULL, -- Array of TimeBlock objects
  committed_at TIMESTAMPTZ NOT NULL,
  committed BOOLEAN DEFAULT true,
  finalized_at TIMESTAMPTZ, -- When all blocks have passed (prevents gaming stats)
  UNIQUE(user_id, date)
);

-- User Settings Table
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  ollama_config JSONB,
  personality_preferences JSONB,
  -- User goals and preferences
  user_goals JSONB, -- Contains: northStar, lifestyle, preferences, otherLifestyle, otherPreferences, routineNames
  -- General settings
  theme TEXT DEFAULT 'dark' CHECK (theme IN ('dark', 'light')),
  widget_enabled BOOLEAN DEFAULT true,
  wake_up_time TEXT DEFAULT '07:00',
  wake_up_enabled BOOLEAN DEFAULT false,
  evening_wind_down_time TEXT DEFAULT '22:00',
  evening_wind_down_enabled BOOLEAN DEFAULT true,
  commit_cutoff_time TEXT DEFAULT '22:00',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_journal_entries_user_id ON journal_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_created_at ON journal_entries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_journal_entries_tags ON journal_entries USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_schedule_commits_user_id ON schedule_commits(user_id);
CREATE INDEX IF NOT EXISTS idx_schedule_commits_date ON schedule_commits(date DESC);

-- Row Level Security (RLS) Policies
-- Enable RLS on all tables
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_commits ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Journal Entries Policies
CREATE POLICY "Users can view own journal entries"
  ON journal_entries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own journal entries"
  ON journal_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own journal entries"
  ON journal_entries FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own journal entries"
  ON journal_entries FOR DELETE
  USING (auth.uid() = user_id);

-- Schedule Commits Policies
CREATE POLICY "Users can view own schedule commits"
  ON schedule_commits FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own schedule commits"
  ON schedule_commits FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own schedule commits"
  ON schedule_commits FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own schedule commits"
  ON schedule_commits FOR DELETE
  USING (auth.uid() = user_id);

-- User Settings Policies
CREATE POLICY "Users can view own settings"
  ON user_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings"
  ON user_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings"
  ON user_settings FOR UPDATE
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
CREATE TRIGGER update_journal_entries_updated_at
  BEFORE UPDATE ON journal_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

