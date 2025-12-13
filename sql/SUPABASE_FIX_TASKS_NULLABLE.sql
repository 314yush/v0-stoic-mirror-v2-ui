-- Fix Tasks Table to Allow NULL text for Encrypted Tasks
-- Run this in your Supabase SQL Editor

-- Make text column nullable (for encrypted tasks, text will be NULL)
ALTER TABLE tasks 
  ALTER COLUMN text DROP NOT NULL;

-- Verify the change
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'tasks' 
  AND column_name = 'text';

-- Should show: is_nullable = 'YES'



