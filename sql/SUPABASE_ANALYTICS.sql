-- ============================================
-- STOIC MIRROR: Analytics & Identity Tracking
-- "Fitbit for Calendar Apps"
-- ============================================

-- 1. IDENTITY ANALYTICS
-- Tracks each identity/habit and its stats over time
-- This is the "Fitbit data" for each habit
CREATE TABLE IF NOT EXISTS identity_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Identity Info
  identity TEXT NOT NULL, -- Normalized name (e.g., "Morning Routine", "Deep Work")
  
  -- Lifetime Stats
  total_occurrences INTEGER DEFAULT 0,
  total_completed INTEGER DEFAULT 0,
  total_minutes INTEGER DEFAULT 0,
  
  -- Weekly Stats (rolling 7 days)
  weekly_occurrences INTEGER DEFAULT 0,
  weekly_completed INTEGER DEFAULT 0,
  weekly_minutes INTEGER DEFAULT 0,
  
  -- Streak Data
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_completed_date DATE,
  
  -- Pattern Data
  avg_start_time TIME, -- Average time user does this activity
  avg_duration_minutes INTEGER,
  preferred_days INTEGER[], -- [0,1,2,3,4,5,6] = Sunday to Saturday
  
  -- Confidence / Habit Strength (0-100)
  habit_strength INTEGER DEFAULT 0,
  
  -- North Star Alignment
  serves_identity TEXT[], -- Which north star identities this serves
  
  -- Timestamps
  first_seen TIMESTAMPTZ,
  last_seen TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, identity)
);

-- 2. DAILY SNAPSHOTS
-- Captures daily analytics for historical trending
-- Like Fitbit's daily step count
CREATE TABLE IF NOT EXISTS daily_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  
  -- Daily Stats
  total_blocks INTEGER DEFAULT 0,
  completed_blocks INTEGER DEFAULT 0,
  adherence_rate NUMERIC(5,2), -- 0.00 to 100.00
  
  -- Time Stats
  total_planned_minutes INTEGER DEFAULT 0,
  total_completed_minutes INTEGER DEFAULT 0,
  
  -- Identity Breakdown (JSONB for flexibility)
  identity_breakdown JSONB, -- { "Deep Work": { planned: 120, completed: 90 }, ... }
  
  -- Calendar Context
  external_events_count INTEGER DEFAULT 0, -- Google Calendar events
  meeting_minutes INTEGER DEFAULT 0,
  
  -- Mood (from journal if available)
  mood TEXT,
  
  -- Timestamps
  committed BOOLEAN DEFAULT false,
  committed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, date)
);

-- 3. WEEKLY SUMMARIES
-- Aggregated weekly analytics for trends
CREATE TABLE IF NOT EXISTS weekly_summaries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start DATE NOT NULL, -- Monday of the week
  
  -- Weekly Stats
  total_blocks INTEGER DEFAULT 0,
  completed_blocks INTEGER DEFAULT 0,
  avg_daily_adherence NUMERIC(5,2),
  
  -- Time Stats
  total_planned_minutes INTEGER DEFAULT 0,
  total_completed_minutes INTEGER DEFAULT 0,
  
  -- Top Identities
  top_identities JSONB, -- [{ identity: "Deep Work", count: 10, minutes: 600 }, ...]
  
  -- Trends (compared to previous week)
  adherence_change NUMERIC(5,2), -- +/- percentage
  consistency_score INTEGER, -- 0-100 based on day-to-day variance
  
  -- AI Insights (generated weekly)
  ai_insights JSONB, -- { summary: "...", suggestions: [...], wins: [...] }
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, week_start)
);

-- 4. HABIT PATTERNS
-- Detected patterns for ghost block suggestions
-- Pre-computed for fast app startup
CREATE TABLE IF NOT EXISTS habit_patterns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  identity TEXT NOT NULL,
  
  -- Pattern Data
  frequency INTEGER, -- Times per week
  avg_start_time TIME,
  avg_duration_minutes INTEGER,
  day_of_week_frequency INTEGER[], -- [Sun, Mon, Tue, Wed, Thu, Fri, Sat]
  confidence NUMERIC(3,2), -- 0.00 to 1.00
  
  -- Timestamps
  last_seen DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, identity)
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_identity_analytics_user ON identity_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_identity_analytics_identity ON identity_analytics(user_id, identity);
CREATE INDEX IF NOT EXISTS idx_identity_analytics_habit_strength ON identity_analytics(user_id, habit_strength DESC);

CREATE INDEX IF NOT EXISTS idx_daily_snapshots_user_date ON daily_snapshots(user_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_weekly_summaries_user ON weekly_summaries(user_id, week_start DESC);

CREATE INDEX IF NOT EXISTS idx_habit_patterns_user ON habit_patterns(user_id);
CREATE INDEX IF NOT EXISTS idx_habit_patterns_confidence ON habit_patterns(user_id, confidence DESC);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE identity_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_patterns ENABLE ROW LEVEL SECURITY;

-- Identity Analytics Policies
CREATE POLICY "Users can view own identity analytics"
  ON identity_analytics FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own identity analytics"
  ON identity_analytics FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own identity analytics"
  ON identity_analytics FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own identity analytics"
  ON identity_analytics FOR DELETE
  USING (auth.uid() = user_id);

-- Daily Snapshots Policies
CREATE POLICY "Users can view own daily snapshots"
  ON daily_snapshots FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own daily snapshots"
  ON daily_snapshots FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own daily snapshots"
  ON daily_snapshots FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own daily snapshots"
  ON daily_snapshots FOR DELETE
  USING (auth.uid() = user_id);

-- Weekly Summaries Policies
CREATE POLICY "Users can view own weekly summaries"
  ON weekly_summaries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own weekly summaries"
  ON weekly_summaries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own weekly summaries"
  ON weekly_summaries FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own weekly summaries"
  ON weekly_summaries FOR DELETE
  USING (auth.uid() = user_id);

-- Habit Patterns Policies
CREATE POLICY "Users can view own habit patterns"
  ON habit_patterns FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own habit patterns"
  ON habit_patterns FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own habit patterns"
  ON habit_patterns FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own habit patterns"
  ON habit_patterns FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- TRIGGERS
-- ============================================

CREATE TRIGGER update_identity_analytics_updated_at
  BEFORE UPDATE ON identity_analytics
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_daily_snapshots_updated_at
  BEFORE UPDATE ON daily_snapshots
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_weekly_summaries_updated_at
  BEFORE UPDATE ON weekly_summaries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_habit_patterns_updated_at
  BEFORE UPDATE ON habit_patterns
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to compute habit strength based on consistency and recency
CREATE OR REPLACE FUNCTION compute_habit_strength(
  p_total_occurrences INTEGER,
  p_current_streak INTEGER,
  p_last_completed DATE
) RETURNS INTEGER AS $$
DECLARE
  recency_score INTEGER;
  consistency_score INTEGER;
  frequency_score INTEGER;
BEGIN
  -- Recency score (max 40 points)
  IF p_last_completed IS NULL THEN
    recency_score := 0;
  ELSIF p_last_completed >= CURRENT_DATE - INTERVAL '1 day' THEN
    recency_score := 40;
  ELSIF p_last_completed >= CURRENT_DATE - INTERVAL '3 days' THEN
    recency_score := 30;
  ELSIF p_last_completed >= CURRENT_DATE - INTERVAL '7 days' THEN
    recency_score := 20;
  ELSIF p_last_completed >= CURRENT_DATE - INTERVAL '14 days' THEN
    recency_score := 10;
  ELSE
    recency_score := 0;
  END IF;
  
  -- Streak score (max 30 points)
  consistency_score := LEAST(30, p_current_streak * 5);
  
  -- Frequency score (max 30 points)
  frequency_score := LEAST(30, p_total_occurrences * 2);
  
  RETURN recency_score + consistency_score + frequency_score;
END;
$$ LANGUAGE plpgsql;

