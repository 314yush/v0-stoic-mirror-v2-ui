-- Fix RLS Policies for Tasks Table with Encryption Support
-- Run this in your Supabase SQL Editor

-- First, check if tasks table exists and has RLS enabled
DO $$
BEGIN
  -- Check if tasks table exists
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'tasks') THEN
    -- Enable RLS if not already enabled
    ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
    
    -- Drop existing policies if they exist (to recreate them)
    DROP POLICY IF EXISTS "Users can view own tasks" ON tasks;
    DROP POLICY IF EXISTS "Users can insert own tasks" ON tasks;
    DROP POLICY IF EXISTS "Users can update own tasks" ON tasks;
    DROP POLICY IF EXISTS "Users can delete own tasks" ON tasks;
    
    -- Recreate policies that work with encrypted columns
    CREATE POLICY "Users can view own tasks"
      ON tasks FOR SELECT
      USING (auth.uid() = user_id);
    
    CREATE POLICY "Users can insert own tasks"
      ON tasks FOR INSERT
      WITH CHECK (auth.uid() = user_id);
    
    CREATE POLICY "Users can update own tasks"
      ON tasks FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
    
    CREATE POLICY "Users can delete own tasks"
      ON tasks FOR DELETE
      USING (auth.uid() = user_id);
    
    RAISE NOTICE '✅ RLS policies updated for tasks table';
  ELSE
    RAISE NOTICE '⚠️ Tasks table does not exist. Run SUPABASE_TASKS_UPDATE.sql first.';
  END IF;
END $$;

-- Verify policies were created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'tasks'
ORDER BY policyname;



