-- Supabase Setup Verification Script
-- Run this in your Supabase SQL Editor to verify everything is set up correctly

-- 1. Check if all tables exist
SELECT 
  table_name,
  CASE 
    WHEN table_name IN ('journal_entries', 'schedule_commits', 'user_settings', 'tasks') 
    THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('journal_entries', 'schedule_commits', 'user_settings', 'tasks')
ORDER BY table_name;

-- 2. Check schedule_commits table structure (including finalized_at)
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'schedule_commits'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Check if finalized_at column exists
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'schedule_commits' 
      AND column_name = 'finalized_at'
    ) THEN '✅ finalized_at column EXISTS'
    ELSE '❌ finalized_at column MISSING - Run SUPABASE_MIGRATION_add_finalized_at.sql'
  END as finalized_at_status;

-- 4. Check RLS is enabled on all tables
SELECT 
  schemaname,
  tablename,
  CASE 
    WHEN rowsecurity THEN '✅ RLS ENABLED'
    ELSE '❌ RLS DISABLED'
  END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('journal_entries', 'schedule_commits', 'user_settings', 'tasks')
ORDER BY tablename;

-- 5. Check RLS policies exist
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
WHERE schemaname = 'public'
  AND tablename IN ('journal_entries', 'schedule_commits', 'user_settings', 'tasks')
ORDER BY tablename, policyname;

-- 6. Check indexes exist
SELECT 
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('journal_entries', 'schedule_commits', 'user_settings', 'tasks')
ORDER BY tablename, indexname;

-- 7. Check triggers exist
SELECT 
  trigger_name,
  event_object_table,
  action_statement,
  action_timing,
  event_manipulation
FROM information_schema.triggers
WHERE event_object_schema = 'public'
  AND event_object_table IN ('journal_entries', 'user_settings', 'tasks')
ORDER BY event_object_table, trigger_name;

-- 8. Summary check
SELECT 
  'Tables' as check_type,
  COUNT(*) as count,
  CASE 
    WHEN COUNT(*) = 4 THEN '✅ All 4 tables exist'
    ELSE '❌ Missing tables'
  END as status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('journal_entries', 'schedule_commits', 'user_settings', 'tasks')
UNION ALL
SELECT 
  'RLS Enabled' as check_type,
  COUNT(*) as count,
  CASE 
    WHEN COUNT(*) = 4 THEN '✅ RLS enabled on all tables'
    ELSE '❌ Some tables missing RLS'
  END as status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('journal_entries', 'schedule_commits', 'user_settings', 'tasks')
  AND rowsecurity = true
UNION ALL
SELECT 
  'finalized_at Column' as check_type,
  COUNT(*) as count,
  CASE 
    WHEN COUNT(*) = 1 THEN '✅ finalized_at column exists'
    ELSE '❌ finalized_at column missing'
  END as status
FROM information_schema.columns
WHERE table_name = 'schedule_commits'
  AND column_name = 'finalized_at';

