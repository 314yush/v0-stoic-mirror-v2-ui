# Encryption Implementation Plan (Option A)

## Overview

Implementing password-derived encryption (Option A) with **zero breaking changes**. All existing functionality continues to work.

## Supabase Changes Required

### 1. Run Migration SQL

**File:** `SUPABASE_ENCRYPTION_MIGRATION.sql`

**What it does:**
- Adds `encrypted`, `encryption_version`, and `encrypted_content` columns to `journal_entries`
- Adds `encrypted`, `encryption_version`, and `encrypted_blocks` columns to `schedule_commits`
- Adds `encryption_enabled`, `encryption_salt`, `encryption_version` columns to `user_settings`
- Adds encryption columns to `tasks` table (if it exists)
- Creates indexes for performance
- **All columns default to false/NULL - existing data remains unencrypted**

**How to run:**
1. Open Supabase Dashboard → SQL Editor
2. Copy contents of `SUPABASE_ENCRYPTION_MIGRATION.sql`
3. Run the script
4. Verify columns were added (use verification queries in the script)

### 2. No RLS Policy Changes Needed

- Existing RLS policies continue to work
- Encryption is an additional layer on top of RLS
- Users still can only access their own data (RLS)
- Team still can't decrypt even with DB access (encryption)

### 3. No Breaking Changes

- ✅ Existing unencrypted data continues to work
- ✅ New columns are optional (default to false/NULL)
- ✅ App supports both encrypted and unencrypted data
- ✅ Gradual migration - users opt-in when ready

## Implementation Steps

### Phase 1: Core Library (✅ Done)
- [x] `encryption.ts` - Core encryption functions
- [x] `key-manager.ts` - Key management and caching

### Phase 2: Storage Adapters (Next)
- [ ] `encrypted-journal-store.ts` - Encrypted journal entry adapter
- [ ] `encrypted-schedule-store.ts` - Encrypted schedule commit adapter
- [ ] Update existing stores to use encryption when enabled

### Phase 3: Sync Service Updates
- [ ] Update `syncJournalEntry` to encrypt before sync
- [ ] Update `syncScheduleCommit` to encrypt before sync
- [ ] Update `pullFromSupabase` to decrypt after pull
- [ ] Handle both encrypted and unencrypted data

### Phase 4: UI Integration
- [ ] Add "Enable Encryption" option in settings
- [ ] Show encryption status indicator
- [ ] Add password prompt for encryption key derivation
- [ ] Migration UI (encrypt existing data)

### Phase 5: Testing
- [ ] Test with new encrypted data
- [ ] Test with existing unencrypted data
- [ ] Test migration from unencrypted to encrypted
- [ ] Test multi-device sync with encryption
- [ ] Test password change flow

## Code Changes Summary

### Files to Create
1. ✅ `src/renderer/lib/encryption.ts` - Core encryption
2. ✅ `src/renderer/lib/key-manager.ts` - Key management
3. ⏳ `src/renderer/lib/encrypted-storage.ts` - Storage adapters

### Files to Modify
1. `src/renderer/lib/journal-store.ts` - Add encryption support
2. `src/renderer/lib/schedule-store.ts` - Add encryption support
3. `src/renderer/lib/sync-service.ts` - Encrypt before sync, decrypt after pull
4. `src/renderer/lib/settings-store.ts` - Add encryption settings
5. `src/renderer/components/settings-modal.tsx` - Add encryption UI

### Database Changes
1. ✅ `SUPABASE_ENCRYPTION_MIGRATION.sql` - Schema migration

## Backward Compatibility

### How It Works

**Existing Users (Unencrypted):**
- Continue using app normally
- Data remains unencrypted
- No changes to their workflow

**New Users (Opt-in Encryption):**
- Can enable encryption in settings
- New data encrypted going forward
- Existing data can be migrated later

**Mixed Data:**
- App handles both encrypted and unencrypted data
- Checks `encrypted` flag before encrypting/decrypting
- Seamless experience

## Testing Checklist

- [ ] Existing unencrypted data loads correctly
- [ ] New encrypted data saves correctly
- [ ] Encrypted data decrypts correctly
- [ ] Sync works with encrypted data
- [ ] Sync works with unencrypted data
- [ ] Migration from unencrypted to encrypted works
- [ ] Password change requires re-encryption
- [ ] Multi-device sync with encryption works
- [ ] Performance is acceptable (< 10ms per entry)

## Rollout Plan

1. **Deploy Supabase migration** (no app changes yet)
2. **Deploy app with encryption support** (opt-in, disabled by default)
3. **Test with beta users**
4. **Enable for new users** (default enabled)
5. **Migrate existing users** (on login, optional)

## Security Notes

- ✅ Keys never stored (derived from password)
- ✅ Keys cached in memory only (cleared on logout)
- ✅ Salt stored in Supabase (not sensitive without password)
- ✅ Team cannot decrypt even with DB access
- ✅ Zero-knowledge architecture

