-- ============================================
-- STOIC MIRROR: Complete Supabase Schema
-- ============================================
-- Run this in your Supabase SQL Editor for a fresh setup
-- Version: 1.0.0
-- Last Updated: 2024-12-14
-- ============================================

-- ============================================
-- 1. EXTENSIONS
-- ============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 2. HELPER FUNCTIONS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 3. CORE TABLES
-- ============================================

-- 3.1 Journal Entries
CREATE TABLE IF NOT EXISTS journal_entries (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  title TEXT,
  mood TEXT,
  tags TEXT[] DEFAULT '{}',
  is_sensitive BOOLEAN DEFAULT false,
  visibility TEXT DEFAULT 'private' CHECK (visibility IN ('private', 'shared')),
  ai_summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.2 Schedule Commits
CREATE TABLE IF NOT EXISTS schedule_commits (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  blocks JSONB NOT NULL,
  committed_at TIMESTAMPTZ NOT NULL,
  committed BOOLEAN DEFAULT true,
  finalized_at TIMESTAMPTZ,
  UNIQUE(user_id, date)
);

-- 3.3 User Settings
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  ollama_config JSONB,
  personality_preferences JSONB,
  user_goals JSONB,
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

-- 3.4 Tasks
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done', 'archived')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  due_date DATE,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 4. HABITS TABLES
-- ============================================

-- 4.1 User Habits
CREATE TABLE IF NOT EXISTS user_habits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  identity TEXT NOT NULL,
  target_frequency INTEGER DEFAULT 7,
  target_duration_minutes INTEGER,
  preferred_time TIME,
  emoji TEXT,
  color TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, name)
);

-- 4.2 Habit Completions
CREATE TABLE IF NOT EXISTS habit_completions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  habit_id UUID NOT NULL REFERENCES user_habits(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  completed BOOLEAN DEFAULT false,
  block_id TEXT,
  actual_start_time TIME,
  actual_duration_minutes INTEGER,
  note TEXT,
  skipped_reason TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, habit_id, date)
);

-- ============================================
-- 5. ANALYTICS TABLES
-- ============================================

-- 5.1 Identity Analytics
CREATE TABLE IF NOT EXISTS identity_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  identity TEXT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_minutes INTEGER DEFAULT 0,
  total_blocks INTEGER DEFAULT 0,
  completed_blocks INTEGER DEFAULT 0,
  skipped_blocks INTEGER DEFAULT 0,
  completion_rate DECIMAL(5,2) DEFAULT 0,
  streak_current INTEGER DEFAULT 0,
  streak_longest INTEGER DEFAULT 0,
  avg_block_duration INTEGER DEFAULT 0,
  preferred_time_slot TEXT,
  consistency_score DECIMAL(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, identity, period_start, period_end)
);

-- 5.2 Daily Snapshots
CREATE TABLE IF NOT EXISTS daily_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  total_planned_minutes INTEGER DEFAULT 0,
  total_completed_minutes INTEGER DEFAULT 0,
  blocks_planned INTEGER DEFAULT 0,
  blocks_completed INTEGER DEFAULT 0,
  blocks_skipped INTEGER DEFAULT 0,
  completion_rate DECIMAL(5,2) DEFAULT 0,
  identities_worked JSONB DEFAULT '[]',
  calendar_events_count INTEGER DEFAULT 0,
  calendar_conflicts INTEGER DEFAULT 0,
  first_block_time TIME,
  last_block_time TIME,
  journal_entry_count INTEGER DEFAULT 0,
  mood_average TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- 5.3 Weekly Summaries
CREATE TABLE IF NOT EXISTS weekly_summaries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  total_planned_minutes INTEGER DEFAULT 0,
  total_completed_minutes INTEGER DEFAULT 0,
  avg_daily_completion_rate DECIMAL(5,2) DEFAULT 0,
  most_consistent_identity TEXT,
  least_consistent_identity TEXT,
  identity_breakdown JSONB DEFAULT '{}',
  days_committed INTEGER DEFAULT 0,
  perfect_days INTEGER DEFAULT 0,
  habits_completion_rate DECIMAL(5,2) DEFAULT 0,
  top_habits JSONB DEFAULT '[]',
  improvement_suggestions JSONB DEFAULT '[]',
  week_over_week_change DECIMAL(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, week_start)
);

-- 5.4 Habit Patterns
CREATE TABLE IF NOT EXISTS habit_patterns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  identity TEXT NOT NULL,
  pattern_type TEXT NOT NULL,
  avg_start_time TIME,
  avg_duration_minutes INTEGER,
  preferred_days INTEGER[] DEFAULT '{}',
  occurrence_count INTEGER DEFAULT 0,
  confidence_score DECIMAL(5,2) DEFAULT 0,
  last_occurrence DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, identity, pattern_type)
);

-- ============================================
-- 6. INDEXES
-- ============================================

-- Journal Entries
CREATE INDEX IF NOT EXISTS idx_journal_entries_user_id ON journal_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_created_at ON journal_entries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_journal_entries_tags ON journal_entries USING GIN(tags);

-- Schedule Commits
CREATE INDEX IF NOT EXISTS idx_schedule_commits_user_id ON schedule_commits(user_id);
CREATE INDEX IF NOT EXISTS idx_schedule_commits_date ON schedule_commits(date DESC);
CREATE INDEX IF NOT EXISTS idx_schedule_commits_user_date ON schedule_commits(user_id, date);

-- Tasks
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(user_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(user_id, due_date);

-- User Habits
CREATE INDEX IF NOT EXISTS idx_user_habits_user ON user_habits(user_id);
CREATE INDEX IF NOT EXISTS idx_user_habits_identity ON user_habits(user_id, identity);
CREATE INDEX IF NOT EXISTS idx_user_habits_active ON user_habits(user_id, is_active);

-- Habit Completions
CREATE INDEX IF NOT EXISTS idx_habit_completions_user_date ON habit_completions(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_habit_completions_habit ON habit_completions(habit_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_habit_completions_user_habit_date ON habit_completions(user_id, habit_id, date);

-- Analytics
CREATE INDEX IF NOT EXISTS idx_identity_analytics_user ON identity_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_identity_analytics_period ON identity_analytics(user_id, period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_daily_snapshots_user_date ON daily_snapshots(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_weekly_summaries_user ON weekly_summaries(user_id, week_start DESC);
CREATE INDEX IF NOT EXISTS idx_habit_patterns_user ON habit_patterns(user_id);

-- ============================================
-- 7. ROW LEVEL SECURITY
-- ============================================

-- Enable RLS on all tables
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_commits ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE identity_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_patterns ENABLE ROW LEVEL SECURITY;

-- Journal Entries Policies
CREATE POLICY "Users can view own journal entries" ON journal_entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own journal entries" ON journal_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own journal entries" ON journal_entries FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own journal entries" ON journal_entries FOR DELETE USING (auth.uid() = user_id);

-- Schedule Commits Policies
CREATE POLICY "Users can view own schedule commits" ON schedule_commits FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own schedule commits" ON schedule_commits FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own schedule commits" ON schedule_commits FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own schedule commits" ON schedule_commits FOR DELETE USING (auth.uid() = user_id);

-- User Settings Policies
CREATE POLICY "Users can view own settings" ON user_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own settings" ON user_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own settings" ON user_settings FOR UPDATE USING (auth.uid() = user_id);

-- Tasks Policies
CREATE POLICY "Users can view own tasks" ON tasks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own tasks" ON tasks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own tasks" ON tasks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own tasks" ON tasks FOR DELETE USING (auth.uid() = user_id);

-- User Habits Policies
CREATE POLICY "Users can view own habits" ON user_habits FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own habits" ON user_habits FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own habits" ON user_habits FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own habits" ON user_habits FOR DELETE USING (auth.uid() = user_id);

-- Habit Completions Policies
CREATE POLICY "Users can view own habit completions" ON habit_completions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own habit completions" ON habit_completions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own habit completions" ON habit_completions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own habit completions" ON habit_completions FOR DELETE USING (auth.uid() = user_id);

-- Identity Analytics Policies
CREATE POLICY "Users can view own identity analytics" ON identity_analytics FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own identity analytics" ON identity_analytics FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own identity analytics" ON identity_analytics FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own identity analytics" ON identity_analytics FOR DELETE USING (auth.uid() = user_id);

-- Daily Snapshots Policies
CREATE POLICY "Users can view own daily snapshots" ON daily_snapshots FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own daily snapshots" ON daily_snapshots FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own daily snapshots" ON daily_snapshots FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own daily snapshots" ON daily_snapshots FOR DELETE USING (auth.uid() = user_id);

-- Weekly Summaries Policies
CREATE POLICY "Users can view own weekly summaries" ON weekly_summaries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own weekly summaries" ON weekly_summaries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own weekly summaries" ON weekly_summaries FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own weekly summaries" ON weekly_summaries FOR DELETE USING (auth.uid() = user_id);

-- Habit Patterns Policies
CREATE POLICY "Users can view own habit patterns" ON habit_patterns FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own habit patterns" ON habit_patterns FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own habit patterns" ON habit_patterns FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own habit patterns" ON habit_patterns FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- 8. TRIGGERS
-- ============================================

-- Journal Entries
CREATE TRIGGER update_journal_entries_updated_at
  BEFORE UPDATE ON journal_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- User Settings
CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Tasks
CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- User Habits
CREATE TRIGGER update_user_habits_updated_at
  BEFORE UPDATE ON user_habits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Habit Completions
CREATE TRIGGER update_habit_completions_updated_at
  BEFORE UPDATE ON habit_completions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Identity Analytics
CREATE TRIGGER update_identity_analytics_updated_at
  BEFORE UPDATE ON identity_analytics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Daily Snapshots
CREATE TRIGGER update_daily_snapshots_updated_at
  BEFORE UPDATE ON daily_snapshots
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Weekly Summaries
CREATE TRIGGER update_weekly_summaries_updated_at
  BEFORE UPDATE ON weekly_summaries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Habit Patterns
CREATE TRIGGER update_habit_patterns_updated_at
  BEFORE UPDATE ON habit_patterns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 9. HELPER FUNCTIONS
-- ============================================

-- Get habit streak (consecutive days completed)
CREATE OR REPLACE FUNCTION get_habit_streak(p_habit_id UUID)
RETURNS INTEGER AS $$
DECLARE
  streak INTEGER := 0;
  check_date DATE := CURRENT_DATE;
  has_completion BOOLEAN;
BEGIN
  LOOP
    SELECT EXISTS(
      SELECT 1 FROM habit_completions 
      WHERE habit_id = p_habit_id 
        AND date = check_date 
        AND completed = true
    ) INTO has_completion;
    
    IF has_completion THEN
      streak := streak + 1;
      check_date := check_date - INTERVAL '1 day';
    ELSE
      EXIT;
    END IF;
    
    IF streak > 365 THEN EXIT; END IF;
  END LOOP;
  
  RETURN streak;
END;
$$ LANGUAGE plpgsql;

-- Get weekly completion count for a habit
CREATE OR REPLACE FUNCTION get_weekly_completions(p_habit_id UUID, p_week_start DATE)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*) 
    FROM habit_completions 
    WHERE habit_id = p_habit_id 
      AND date >= p_week_start 
      AND date < p_week_start + INTERVAL '7 days'
      AND completed = true
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- DONE! Your Supabase is now ready for Stoic Mirror
-- ============================================

