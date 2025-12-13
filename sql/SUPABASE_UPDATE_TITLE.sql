-- Add title column to journal_entries table
-- Run this in your Supabase SQL Editor

ALTER TABLE journal_entries 
ADD COLUMN IF NOT EXISTS title TEXT;

