# What Information is Encrypted?

## Overview

This document clearly outlines **exactly what data is encrypted** and what remains **plaintext** (for search/performance).

## 🔐 Encrypted Data (Team Cannot See)

### 1. Journal Entries

**Encrypted Fields:**
- ✅ `content` - The actual journal entry text (conversations, reflections, thoughts)
- ✅ `ai_summary` - AI-generated summaries of journal entries
- ✅ `title` - Optional title for journal entries

**Plaintext Fields (for search/metadata):**
- `mood` - Emoji (😌, 🙂, 😐, 😣, 😡) - needed for filtering
- `tags` - Array of tags - needed for search
- `is_sensitive` - Boolean flag - needed for filtering
- `visibility` - "private" or "shared" - needed for access control
- `created_at` - Timestamp - needed for sorting/grouping
- `updated_at` - Timestamp - needed for sync
- `id` - Entry ID - needed for references
- `user_id` - User ID - needed for RLS

**Why:** Journal content is highly personal and sensitive. Metadata (tags, mood, dates) stays plaintext so users can search and filter their entries.

---

### 2. Schedule Commits

**Encrypted Fields:**
- ✅ `blocks` - The entire JSON array of TimeBlock objects containing:
  - `identity` - What the block represents (e.g., "Morning Meditation", "Work Session")
  - `start` - Start time
  - `end` - End time
  - `optional` - Whether block is optional
  - `streak` - Streak count
  - `completed` - Completion status

**Plaintext Fields:**
- `date` - Date string (YYYY-MM-DD) - needed for queries
- `committed_at` - Timestamp - needed for sync
- `committed` - Boolean - needed for queries
- `finalized_at` - Timestamp - needed for anti-gaming logic
- `id` - Commit ID - needed for references
- `user_id` - User ID - needed for RLS

**Why:** Schedule blocks contain personal routine information (what activities you do, when). The date and commit status stay plaintext for queries and stats.

---

### 3. User Settings

**Encrypted Fields:**
- ✅ `user_goals` - Entire JSONB object containing:
  - `northStar` - Personal identity vision ("I want to become...")
  - `lifestyle` - Selected lifestyle patterns
  - `preferences` - Selected preferences
  - `otherLifestyle` - Free text for "Other" lifestyle
  - `otherPreferences` - Free text for "Other" preferences
  - `routineNames` - User's routine names

**Plaintext Fields:**
- `theme` - "dark" or "light" - not sensitive
- `widget_enabled` - Boolean - not sensitive
- `wake_up_time` - Time string - not sensitive
- `wake_up_enabled` - Boolean - not sensitive
- `evening_wind_down_time` - Time string - not sensitive
- `evening_wind_down_enabled` - Boolean - not sensitive
- `commit_cutoff_time` - Time string - not sensitive
- `ollama_config` - Technical config - not sensitive
- `personality_preferences` - AI personality - not sensitive
- `encryption_enabled` - Boolean flag - needed for app logic
- `encryption_salt` - Salt for key derivation - not sensitive without password
- `encryption_version` - Version number - needed for key rotation

**Why:** User goals contain deeply personal information about identity and aspirations. Technical settings and preferences stay plaintext for app functionality.

---

### 4. Tasks (if table exists)

**Encrypted Fields:**
- ✅ `text` - Task description/content

**Plaintext Fields:**
- `completed` - Boolean - needed for filtering
- `created_at` - Timestamp - needed for sorting
- `updated_at` - Timestamp - needed for sync
- `id` - Task ID - needed for references
- `user_id` - User ID - needed for RLS

**Why:** Task descriptions can contain personal information. Completion status stays plaintext for queries.

---

## 📊 Summary Table

| Data Type | Encrypted Fields | Plaintext Fields | Reason |
|-----------|-----------------|------------------|--------|
| **Journal Entries** | `content`, `ai_summary`, `title` | `mood`, `tags`, `is_sensitive`, `visibility`, `created_at`, `updated_at`, `id`, `user_id` | Content is personal; metadata needed for search |
| **Schedule Commits** | `blocks` (entire JSON) | `date`, `committed_at`, `committed`, `finalized_at`, `id`, `user_id` | Blocks contain personal routines; dates needed for queries |
| **User Settings** | `user_goals` (entire JSONB) | `theme`, `widget_enabled`, times, flags, `encryption_*`, `ollama_config`, `personality_preferences` | Goals are personal; settings needed for app functionality |
| **Tasks** | `text` | `completed`, `created_at`, `updated_at`, `id`, `user_id` | Task text can be personal; status needed for queries |

---

## 🔍 What Team Can See (Even with Encryption)

**Even with encryption enabled, the team can see:**

1. **Metadata:**
   - Tags, moods, dates, completion status
   - Entry counts, frequency patterns
   - Schedule structure (dates, but not content)

2. **Aggregate Statistics:**
   - How many entries per day/week
   - Most common tags/moods
   - Completion rates (but not what was completed)

3. **Technical Data:**
   - User IDs, timestamps
   - Encryption status flags
   - Sync timestamps

**What Team CANNOT See (with encryption):**
- ❌ Actual journal content
- ❌ AI summaries
- ❌ Schedule block identities/activities
- ❌ User goals and aspirations
- ❌ Task descriptions
- ❌ Any personal thoughts or reflections

---

## 🎯 Encryption Strategy

### Highly Sensitive (Always Encrypted)
- Journal entry content
- AI summaries
- User goals and identity vision
- Schedule block identities

### Moderately Sensitive (Encrypted)
- Schedule blocks (entire JSON)
- Task descriptions

### Non-Sensitive (Never Encrypted)
- User IDs, timestamps
- Metadata (tags, moods, dates)
- Completion status
- Technical settings
- Encryption metadata

---

## 💡 Why This Approach?

1. **Search Functionality:**
   - Tags and moods stay plaintext so users can search/filter
   - Dates stay plaintext for timeline views
   - Can't search encrypted content server-side

2. **Performance:**
   - Metadata queries are fast (no decryption needed)
   - Only decrypt when viewing actual content
   - Reduces encryption overhead

3. **User Experience:**
   - Users can still search their entries by tags/moods
   - Timeline views work without decryption
   - Stats and insights work with metadata

4. **Security:**
   - Most sensitive data (content, goals) is encrypted
   - Team can see patterns but not personal details
   - Zero-knowledge for actual content

---

## 🔐 Encryption Details

**What Gets Encrypted:**
- All encrypted fields are encrypted using **AES-GCM 256-bit**
- Key derived from user password using **PBKDF2** (100,000 iterations)
- Each encryption uses a unique **IV** (Initialization Vector)
- Encrypted data stored in separate columns (`encrypted_content`, `encrypted_blocks`, etc.)

**Storage Format:**
```
When encrypted=true:
  - Original field (content, blocks, etc.) → NULL
  - Encrypted field (encrypted_content, encrypted_blocks, etc.) → Base64 encoded encrypted data
  - encryption_version → 1 (for future key rotation)
```

---

## 📝 Example

**Before Encryption (Plaintext):**
```json
{
  "id": "abc123",
  "user_id": "user-uuid",
  "content": "Today I felt anxious about my presentation tomorrow...",
  "mood": "😣",
  "tags": ["anxiety", "work"],
  "created_at": "2025-01-15T10:00:00Z"
}
```

**After Encryption:**
```json
{
  "id": "abc123",
  "user_id": "user-uuid",
  "content": null,  // NULL (encrypted)
  "encrypted_content": "aGVsbG8gd29ybGQ...",  // Encrypted content
  "encrypted": true,
  "encryption_version": 1,
  "mood": "😣",  // Still plaintext (for search)
  "tags": ["anxiety", "work"],  // Still plaintext (for search)
  "created_at": "2025-01-15T10:00:00Z"  // Still plaintext (for sorting)
}
```

**What Team Sees:**
- ✅ Entry exists
- ✅ Created on 2025-01-15
- ✅ Has mood "😣" and tags ["anxiety", "work"]
- ❌ Cannot see actual content ("Today I felt anxious...")
- ❌ Cannot decrypt without user's password

---

## ✅ Summary

**Encrypted:** Personal content, thoughts, goals, routine details
**Plaintext:** Metadata, tags, dates, status flags, technical settings

This balance provides:
- 🔒 Strong privacy for sensitive data
- 🔍 Usable search and filtering
- ⚡ Good performance
- 👥 Team can see patterns but not personal details

