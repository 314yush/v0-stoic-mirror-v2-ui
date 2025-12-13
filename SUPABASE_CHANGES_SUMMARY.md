# Supabase Changes Summary

## Overview

This document summarizes **all Supabase changes** required for implementing end-to-end encryption. These changes are **backward compatible** and won't break existing functionality.

## Required Changes

### 1. Run Database Migration

**File:** `SUPABASE_ENCRYPTION_MIGRATION.sql`

**How to Run:**
1. Open Supabase Dashboard
2. Go to **SQL Editor**
3. Click **New Query**
4. Copy and paste the entire contents of `SUPABASE_ENCRYPTION_MIGRATION.sql`
5. Click **Run** (or press Cmd/Ctrl + Enter)
6. Wait for success message

**What It Does:**
- Adds encryption columns to existing tables
- All columns default to `false` or `NULL`
- **No existing data is modified**
- **No existing functionality breaks**

### 2. Tables Modified

#### `journal_entries`
**New Columns:**
- `encrypted` (BOOLEAN, default: false)
- `encryption_version` (INTEGER, default: 1)
- `encrypted_content` (TEXT, nullable)

**Purpose:**
- `encrypted`: Flag indicating if entry is encrypted
- `encryption_version`: For future key rotation
- `encrypted_content`: Stores encrypted content (when `encrypted=true`, `content` is NULL)

#### `schedule_commits`
**New Columns:**
- `encrypted` (BOOLEAN, default: false)
- `encryption_version` (INTEGER, default: 1)
- `encrypted_blocks` (TEXT, nullable)

**Purpose:**
- `encrypted`: Flag indicating if commit is encrypted
- `encryption_version`: For future key rotation
- `encrypted_blocks`: Stores encrypted blocks JSON (when `encrypted=true`, `blocks` is NULL)

#### `user_settings`
**New Columns:**
- `encryption_enabled` (BOOLEAN, default: false)
- `encryption_salt` (TEXT, nullable)
- `encryption_version` (INTEGER, default: 1)

**Purpose:**
- `encryption_enabled`: Whether user has encryption enabled
- `encryption_salt`: Salt for key derivation (base64 encoded)
- `encryption_version`: Current encryption version for this user

#### `tasks` (if table exists)
**New Columns:**
- `encrypted` (BOOLEAN, default: false)
- `encryption_version` (INTEGER, default: 1)
- `encrypted_text` (TEXT, nullable)

**Purpose:**
- Same pattern as other tables

### 3. Indexes Added

**Performance Optimization:**
- `idx_journal_entries_encrypted` - Index on `encrypted` flag
- `idx_schedule_commits_encrypted` - Index on `encrypted` flag

These help with queries filtering by encryption status.

### 4. No RLS Policy Changes

**Why:**
- Existing RLS policies already protect user data
- Encryption is an **additional layer** on top of RLS
- No changes needed to policies

**Current RLS Protection:**
- Users can only access their own data (`auth.uid() = user_id`)
- This continues to work with encryption

### 5. Verification

After running the migration, verify it worked:

```sql
-- Check journal_entries columns
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'journal_entries' 
  AND column_name IN ('encrypted', 'encryption_version', 'encrypted_content');

-- Check schedule_commits columns
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'schedule_commits' 
  AND column_name IN ('encrypted', 'encryption_version', 'encrypted_blocks');

-- Check user_settings columns
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'user_settings' 
  AND column_name IN ('encryption_enabled', 'encryption_salt', 'encryption_version');
```

**Expected Result:**
- All columns should exist
- All should have correct data types
- Defaults should be `false` or `NULL`

## Backward Compatibility

### ✅ What Still Works

1. **Existing Unencrypted Data:**
   - All existing journal entries work normally
   - All existing schedule commits work normally
   - No data migration required

2. **Existing App Code:**
   - App continues to work with unencrypted data
   - No breaking changes to API
   - Gradual migration possible

3. **RLS Policies:**
   - All existing policies continue to work
   - No changes needed

### ✅ What's New

1. **Encryption Support:**
   - New columns available for encryption
   - App can encrypt new data going forward
   - Users can opt-in to encryption

2. **Gradual Migration:**
   - Users can enable encryption when ready
   - Existing data can be encrypted later
   - Both encrypted and unencrypted data supported

## Rollback Plan

If you need to rollback (not recommended, but possible):

```sql
-- Remove encryption columns (WARNING: This will lose encrypted data!)
ALTER TABLE journal_entries 
  DROP COLUMN IF EXISTS encrypted,
  DROP COLUMN IF EXISTS encryption_version,
  DROP COLUMN IF EXISTS encrypted_content;

ALTER TABLE schedule_commits 
  DROP COLUMN IF EXISTS encrypted,
  DROP COLUMN IF EXISTS encryption_version,
  DROP COLUMN IF EXISTS encrypted_blocks;

ALTER TABLE user_settings 
  DROP COLUMN IF EXISTS encryption_enabled,
  DROP COLUMN IF EXISTS encryption_salt,
  DROP COLUMN IF EXISTS encryption_version;

-- Remove indexes
DROP INDEX IF EXISTS idx_journal_entries_encrypted;
DROP INDEX IF EXISTS idx_schedule_commits_encrypted;
```

**⚠️ Warning:** Only rollback if you haven't enabled encryption for any users yet.

## Testing Checklist

After running migration:

- [ ] All columns added successfully
- [ ] Existing data still accessible
- [ ] App still works normally
- [ ] No errors in Supabase logs
- [ ] RLS policies still work
- [ ] Can query both encrypted and unencrypted data

## Next Steps

After running the migration:

1. ✅ Verify columns were added (use verification queries)
2. ⏳ Continue with app code changes (storage adapters)
3. ⏳ Test encryption with new data
4. ⏳ Test backward compatibility with existing data

## Support

If you encounter any issues:

1. Check Supabase logs for errors
2. Verify column names match exactly
3. Ensure you have proper permissions
4. Check that tables exist before running migration

## Summary

**Total Changes:**
- ✅ 1 SQL migration file
- ✅ 3-4 tables modified (depending on if tasks table exists)
- ✅ 2 indexes added
- ✅ 0 RLS policy changes
- ✅ 0 breaking changes

**Risk Level:** **LOW** - All changes are additive and backward compatible.

