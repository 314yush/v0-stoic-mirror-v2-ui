-- ============================================
-- MIGRATION: Habit Lifecycle System
-- ============================================
-- Run this if you already have the base Supabase schema
-- and want to add the habit tracking system
-- ============================================

-- ============================================
-- 1. USER HABITS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS user_habits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Habit Definition
  name TEXT NOT NULL,
  identity TEXT NOT NULL,  -- Links to north star identity
  
  -- Target Settings
  target_frequency INTEGER DEFAULT 7,
  target_duration_minutes INTEGER,
  preferred_time TIME,
  
  -- Display
  emoji TEXT,
  color TEXT,
  sort_order INTEGER DEFAULT 0,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, name)
);

-- ============================================
-- 2. HABIT COMPLETIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS habit_completions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  habit_id UUID NOT NULL REFERENCES user_habits(id) ON DELETE CASCADE,
  
  -- Completion Data
  date DATE NOT NULL,
  completed BOOLEAN DEFAULT false,
  
  -- Auto-linked from committed block
  block_id TEXT,
  actual_start_time TIME,
  actual_duration_minutes INTEGER,
  
  -- Notes
  note TEXT,
  skipped_reason TEXT,
  
  -- Timestamps
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, habit_id, date)
);

-- ============================================
-- 3. INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_user_habits_user ON user_habits(user_id);
CREATE INDEX IF NOT EXISTS idx_user_habits_identity ON user_habits(user_id, identity);
CREATE INDEX IF NOT EXISTS idx_user_habits_active ON user_habits(user_id, is_active);

CREATE INDEX IF NOT EXISTS idx_habit_completions_user_date ON habit_completions(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_habit_completions_habit ON habit_completions(habit_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_habit_completions_user_habit_date ON habit_completions(user_id, habit_id, date);

-- ============================================
-- 4. ROW LEVEL SECURITY
-- ============================================

ALTER TABLE user_habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_completions ENABLE ROW LEVEL SECURITY;

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

-- ============================================
-- 5. TRIGGERS
-- ============================================

CREATE TRIGGER update_user_habits_updated_at
  BEFORE UPDATE ON user_habits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_habit_completions_updated_at
  BEFORE UPDATE ON habit_completions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 6. HELPER FUNCTIONS
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

-- Get weekly completion count
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
-- DONE! Habit lifecycle tables are ready
-- ============================================

