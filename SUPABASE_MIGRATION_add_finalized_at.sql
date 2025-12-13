-- Migration: Add finalized_at column to schedule_commits table
-- Run this in your Supabase SQL Editor if you already have the schedule_commits table

-- Add finalized_at column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'schedule_commits' 
    AND column_name = 'finalized_at'
  ) THEN
    ALTER TABLE schedule_commits 
    ADD COLUMN finalized_at TIMESTAMPTZ;
    
    RAISE NOTICE 'Added finalized_at column to schedule_commits table';
  ELSE
    RAISE NOTICE 'Column finalized_at already exists in schedule_commits table';
  END IF;
END $$;

