# End-to-End Encryption Architecture

## Overview

This document outlines a sophisticated, profile-based encryption system where **the team cannot access user data**, even with database access. All sensitive data is encrypted client-side before being sent to Supabase.

## Current State

- ✅ RLS (Row Level Security) prevents users from seeing each other's data
- ❌ Team can still access all data with service role key
- ❌ Data stored in plaintext in Supabase
- ❌ No client-side encryption

## Proposed Architecture

### 1. Encryption Strategy

**Option A: Password-Derived Keys (Recommended)**
- User's password → PBKDF2 → Encryption Key
- Key never stored, derived on login
- **Pros**: Zero-knowledge, team can't decrypt even with DB access
- **Cons**: Password reset = data loss (unless recovery key)

**Option B: Encrypted Key Storage**
- Generate random encryption key per user
- Encrypt key with password-derived key
- Store encrypted key in Supabase
- **Pros**: Password reset possible with recovery key
- **Cons**: More complex, requires key management

**Option C: Hybrid (Best UX)**
- Primary key: Password-derived (for sensitive data)
- Secondary key: Encrypted key storage (for less sensitive data)
- Recovery key: User can export/backup

### 2. Implementation Plan

#### Phase 1: Core Encryption Library

```typescript
// src/renderer/lib/encryption.ts
- generateEncryptionKey(password: string, salt: string): Promise<CryptoKey>
- encryptData(data: string, key: CryptoKey): Promise<string>
- decryptData(encrypted: string, key: CryptoKey): Promise<string>
- deriveKeyFromPassword(password: string, salt: Uint8Array): Promise<CryptoKey>
- generateSalt(): Uint8Array
```

#### Phase 2: Key Management

```typescript
// src/renderer/lib/key-manager.ts
- initializeUserKeys(userId: string, password: string)
- getEncryptionKey(): Promise<CryptoKey>
- exportRecoveryKey(): string
- importRecoveryKey(recoveryKey: string): void
```

#### Phase 3: Encrypted Storage Adapter

```typescript
// src/renderer/lib/encrypted-storage.ts
- EncryptedJournalEntry (encrypted content, plaintext metadata)
- EncryptedScheduleCommit (encrypted blocks)
- EncryptedUserSettings (encrypted sensitive settings)
```

#### Phase 4: Migration

- Add `encrypted: boolean` flag to tables
- Migrate existing data (encrypt on first access)
- Support both encrypted and unencrypted during transition

### 3. Data Classification

**Highly Sensitive (Always Encrypt):**
- Journal entries (`content`, `ai_summary`)
- User goals and preferences
- Sensitive settings

**Moderately Sensitive (Optional Encryption):**
- Schedule commits (blocks data)
- Task descriptions

**Non-Sensitive (No Encryption):**
- User IDs
- Timestamps
- Metadata (tags, mood emoji, dates)
- Completion status

### 4. Database Schema Changes

```sql
-- Add encryption metadata to tables
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS encrypted BOOLEAN DEFAULT false;
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS encryption_version INTEGER DEFAULT 1;
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS encrypted_content TEXT; -- Store encrypted content here

-- For encrypted entries:
-- - content: NULL or placeholder
-- - encrypted_content: Actual encrypted data
-- - encrypted: true
-- - encryption_version: 1 (for future key rotation)

-- Similar changes for schedule_commits, user_settings
```

### 5. Key Derivation Flow

```
User Password
    ↓
PBKDF2 (100,000 iterations, SHA-256)
    ↓
Encryption Key (AES-GCM, 256-bit)
    ↓
Encrypt/Decrypt Data
```

**Security Parameters:**
- Algorithm: AES-GCM (256-bit)
- Key Derivation: PBKDF2 with 100,000 iterations
- Salt: Unique per user (stored in user_settings)
- IV: Random per encryption (stored with encrypted data)

### 6. Implementation Details

#### Encryption Format

```typescript
interface EncryptedData {
  iv: string;           // Base64 encoded IV
  data: string;         // Base64 encoded encrypted data
  version: number;      // Encryption version (for key rotation)
  algorithm: string;    // "AES-GCM-256"
}
```

#### Storage Strategy

**Journal Entries:**
```typescript
{
  id: "abc123",
  user_id: "user-uuid",
  content: null,                    // NULL for encrypted entries
  encrypted_content: "base64...",   // Encrypted content
  mood: "😌",                       // Plaintext (metadata)
  tags: ["reflection"],             // Plaintext (for search)
  encrypted: true,
  encryption_version: 1,
  created_at: "2025-01-01T00:00:00Z"
}
```

**Schedule Commits:**
```typescript
{
  id: "2025-01-01",
  user_id: "user-uuid",
  date: "2025-01-01",
  blocks: null,                     // NULL for encrypted
  encrypted_blocks: "base64...",     // Encrypted JSON
  encrypted: true,
  encryption_version: 1
}
```

### 7. Search & Query Challenges

**Problem:** Can't search encrypted content directly

**Solutions:**

1. **Metadata-Only Search** (Initial)
   - Search by tags, mood, dates (plaintext)
   - Decrypt results client-side for display

2. **Client-Side Search** (Better UX)
   - Download all entries, decrypt, search locally
   - Cache decrypted search index

3. **Encrypted Search** (Future)
   - Use searchable encryption (e.g., Bloom filters)
   - More complex, but enables server-side search

### 8. Migration Path

**Step 1: Add Encryption Support (Backward Compatible)**
- Add `encrypted` flag to tables
- Support both encrypted and unencrypted data
- New users: Encrypt by default
- Existing users: Encrypt on first access

**Step 2: Gradual Migration**
- On login: Check if user has encryption key
- If not: Prompt to enable encryption
- Encrypt data in background as user accesses it

**Step 3: Full Encryption**
- After migration period: Require encryption for new data
- Keep unencrypted data for backward compatibility

### 9. Recovery & Key Management

**Recovery Options:**

1. **Recovery Key Export**
   - User can export recovery key (encrypted with password)
   - Store securely (password manager, paper backup)
   - Can import to recover data

2. **Password Reset Flow**
   - If password reset: Data becomes inaccessible
   - Require recovery key to re-encrypt with new password
   - Warn user before reset

3. **Key Rotation**
   - Support changing encryption key
   - Re-encrypt all data with new key
   - Background process, show progress

### 10. Security Considerations

**✅ What This Protects Against:**
- Team members accessing user data
- Database breaches (data is encrypted)
- Supabase admin access
- Server-side attacks

**⚠️ What It Doesn't Protect Against:**
- Client-side malware/keyloggers
- Browser extensions with access
- Physical device access (if unlocked)
- User sharing password/recovery key

**🔒 Additional Security Measures:**
- Encrypt keys in memory (use Secure Enclave on macOS if available)
- Clear keys from memory on logout
- Rate limit decryption attempts
- Warn on suspicious activity

### 11. Performance Considerations

**Encryption Overhead:**
- Encryption: ~1-5ms per entry (negligible)
- Decryption: ~1-5ms per entry (negligible)
- Key derivation: ~100-500ms (only on login)

**Optimization Strategies:**
- Cache decryption key in memory (cleared on logout)
- Batch encrypt/decrypt operations
- Lazy decryption (only decrypt when viewing)
- Background encryption for migration

### 12. User Experience

**Onboarding:**
1. User signs up/logs in
2. System generates encryption key from password
3. Optionally: Export recovery key
4. Data encrypted automatically going forward

**Daily Use:**
- Transparent encryption/decryption
- No user action required
- Fast performance (cached keys)

**Recovery:**
- Clear UI for recovery key export/import
- Password reset warning
- Recovery flow if key lost

### 13. Implementation Checklist

- [ ] Create encryption library (`encryption.ts`)
- [ ] Create key manager (`key-manager.ts`)
- [ ] Update database schema (add encrypted columns)
- [ ] Create encrypted storage adapters
- [ ] Update sync service to encrypt before sync
- [ ] Update journal store to encrypt/decrypt
- [ ] Update schedule store to encrypt/decrypt
- [ ] Update settings store to encrypt/decrypt
- [ ] Add recovery key export/import UI
- [ ] Add migration logic for existing data
- [ ] Add encryption status indicator
- [ ] Update search to work with encrypted data
- [ ] Add password reset warning
- [ ] Security audit and testing

### 14. Testing Strategy

**Unit Tests:**
- Encryption/decryption correctness
- Key derivation consistency
- Error handling (wrong password, corrupted data)

**Integration Tests:**
- End-to-end encryption flow
- Migration from unencrypted to encrypted
- Recovery key import/export
- Multi-device sync with encryption

**Security Tests:**
- Verify team cannot decrypt user data
- Test with corrupted encrypted data
- Test key rotation
- Test password change flow

### 15. Rollout Plan

**Phase 1: Development (2-3 weeks)**
- Implement core encryption
- Add to new data only
- Test thoroughly

**Phase 2: Beta (1 week)**
- Enable for beta users
- Monitor performance
- Gather feedback

**Phase 3: Gradual Rollout (2 weeks)**
- Enable for new users
- Migrate existing users on login
- Monitor for issues

**Phase 4: Full Rollout**
- All users encrypted
- Remove unencrypted support (after grace period)

## Next Steps

1. **Review this architecture** - Confirm approach and priorities
2. **Choose encryption strategy** - Password-derived vs. encrypted key storage
3. **Start with Phase 1** - Core encryption library
4. **Test thoroughly** - Security is critical
5. **Plan migration** - Smooth transition for existing users

## Questions to Consider

1. **Password Reset**: Should we support password reset with recovery key, or require recovery key for all resets?
2. **Search**: Start with metadata-only search, or implement client-side search from the start?
3. **Migration**: Encrypt all existing data immediately, or encrypt on access?
4. **Recovery Key**: Make it mandatory to export, or optional?
5. **Performance**: Acceptable encryption overhead for large datasets?

