# Database Migration Required

## Issue
Your Supabase database is missing the `finalized_at` column in the `schedule_commits` table. This causes sync failures and commits disappear after refresh.

## Quick Fix

### Option 1: Run Migration in Supabase Dashboard (Recommended)

1. Open your Supabase project dashboard
2. Go to **SQL Editor**
3. Click **New Query**
4. Copy and paste this SQL:

```sql
-- Add finalized_at column to schedule_commits table
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
```

5. Click **Run** (or press Cmd/Ctrl + Enter)
6. You should see: "Success. No rows returned"

### Option 2: Use Migration File

The migration file `SUPABASE_MIGRATION_add_finalized_at.sql` contains the same SQL. You can run it via Supabase CLI or copy-paste into the SQL Editor.

## Verify Migration

After running the migration, verify it worked:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'schedule_commits' 
AND column_name = 'finalized_at';
```

You should see a row with `finalized_at` and `timestamp with time zone`.

## What This Column Does

The `finalized_at` column:
- Prevents gaming stats by locking commits after all blocks have passed
- Ensures data integrity for weekly stats
- Prevents uncommitting/re-committing finalized days

## Temporary Workaround

The app now includes a fallback that syncs without `finalized_at` if the column is missing. However, you should still run the migration to get full functionality.

## Need Help?

If you see errors after running the migration, check:
1. You have the correct database selected in Supabase
2. You have permissions to alter the table
3. The table name is exactly `schedule_commits` (case-sensitive)

