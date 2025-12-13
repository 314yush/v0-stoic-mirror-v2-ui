-- Encryption Migration for Supabase
-- Run this in your Supabase SQL Editor
-- This adds encryption support WITHOUT breaking existing functionality

-- ============================================
-- 1. Add encryption columns to journal_entries
-- ============================================
ALTER TABLE journal_entries 
  ADD COLUMN IF NOT EXISTS encrypted BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS encryption_version INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS encrypted_content TEXT;

-- Add comment for clarity
COMMENT ON COLUMN journal_entries.encrypted IS 'Whether this entry is encrypted (true) or plaintext (false)';
COMMENT ON COLUMN journal_entries.encryption_version IS 'Encryption version for future key rotation';
COMMENT ON COLUMN journal_entries.encrypted_content IS 'Encrypted content (when encrypted=true, content should be NULL)';

-- ============================================
-- 2. Add encryption columns to schedule_commits
-- ============================================
ALTER TABLE schedule_commits 
  ADD COLUMN IF NOT EXISTS encrypted BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS encryption_version INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS encrypted_blocks TEXT;

COMMENT ON COLUMN schedule_commits.encrypted IS 'Whether this commit is encrypted';
COMMENT ON COLUMN schedule_commits.encryption_version IS 'Encryption version for future key rotation';
COMMENT ON COLUMN schedule_commits.encrypted_blocks IS 'Encrypted blocks JSON (when encrypted=true, blocks should be NULL)';

-- ============================================
-- 3. Add encryption columns to user_settings
-- ============================================
ALTER TABLE user_settings 
  ADD COLUMN IF NOT EXISTS encryption_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS encryption_salt TEXT,
  ADD COLUMN IF NOT EXISTS encryption_version INTEGER DEFAULT 1;

COMMENT ON COLUMN user_settings.encryption_enabled IS 'Whether user has encryption enabled';
COMMENT ON COLUMN user_settings.encryption_salt IS 'Salt for key derivation (base64 encoded)';
COMMENT ON COLUMN user_settings.encryption_version IS 'Current encryption version for this user';

-- ============================================
-- 4. Add encryption columns to tasks (if exists)
-- ============================================
-- Check if tasks table exists first
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'tasks') THEN
    ALTER TABLE tasks 
      ADD COLUMN IF NOT EXISTS encrypted BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS encryption_version INTEGER DEFAULT 1,
      ADD COLUMN IF NOT EXISTS encrypted_text TEXT;
    
    COMMENT ON COLUMN tasks.encrypted IS 'Whether this task is encrypted';
    COMMENT ON COLUMN tasks.encryption_version IS 'Encryption version';
    COMMENT ON COLUMN tasks.encrypted_text IS 'Encrypted task text (when encrypted=true, text should be NULL)';
  END IF;
END $$;

-- ============================================
-- 5. Update RLS policies (no changes needed)
-- ============================================
-- RLS policies remain the same - they already protect user data
-- Encryption is an additional layer on top of RLS

-- ============================================
-- 6. Create index for encrypted flag (optional, for queries)
-- ============================================
CREATE INDEX IF NOT EXISTS idx_journal_entries_encrypted 
  ON journal_entries(encrypted) 
  WHERE encrypted = true;

CREATE INDEX IF NOT EXISTS idx_schedule_commits_encrypted 
  ON schedule_commits(encrypted) 
  WHERE encrypted = true;

-- ============================================
-- 7. Add constraint to ensure data integrity
-- ============================================
-- When encrypted=true, content should be NULL and encrypted_content should have data
-- When encrypted=false, content should have data and encrypted_content should be NULL
-- Note: We don't enforce this with a constraint to allow gradual migration
-- The application logic will handle this

-- ============================================
-- 8. Verification queries (run these to check)
-- ============================================
-- Check if encryption columns were added:
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'journal_entries' 
--   AND column_name IN ('encrypted', 'encryption_version', 'encrypted_content');

-- Check encryption status:
-- SELECT 
--   user_id,
--   encryption_enabled,
--   encryption_version,
--   CASE WHEN encryption_salt IS NOT NULL THEN 'Salt present' ELSE 'No salt' END as salt_status
-- FROM user_settings
-- WHERE encryption_enabled = true;

-- ============================================
-- Migration Notes:
-- ============================================
-- 1. All new columns default to false/NULL - existing data remains unencrypted
-- 2. Backward compatible - app will work with both encrypted and unencrypted data
-- 3. Gradual migration - users can enable encryption when ready
-- 4. No data loss - existing data continues to work
-- 5. Encryption is opt-in per user
-- ============================================

