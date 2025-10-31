# Backend & Auth Integration Roadmap

## Strategic Recommendations

### 🎯 Recommendation: **Supabase First, Before Electron**

**Why Supabase over Privy + separate backend:**
- ✅ All-in-one: Auth + PostgreSQL + Realtime + Storage
- ✅ Simpler: One service vs managing multiple integrations
- ✅ Real-time sync built-in
- ✅ Row-level security (important for sensitive journal entries)
- ✅ Free tier is generous
- ✅ Works great with web AND Electron

**Why Before Electron:**
- ✅ Easier to test and debug in web environment
- ✅ No IPC complexity initially
- ✅ Can verify all APIs work before adding Electron layer
- ✅ Migration path is cleaner (web → Electron)

---

## Phase 1: Auth First (Week 1)

### Why Auth First?
1. **Foundation for everything else** - Need user identity before syncing data
2. **Simplest to test** - Can verify login/logout without data complexity
3. **Unblocks data sync** - Can't sync user data without knowing who the user is

### Implementation Steps

1. **Set up Supabase project**
   ```bash
   npm install @supabase/supabase-js
   ```

2. **Create auth service** (`src/renderer/lib/auth.ts`)
   - Login/signup with email
   - Session management
   - Optional: Magic link (passwordless)

3. **Add auth UI** (simple for now)
   - Login screen on first launch
   - Logout button in settings
   - Session persistence

4. **Test thoroughly**
   - Sign up → Login → Logout
   - Session refresh
   - Error handling

**Estimated time:** 2-3 days

---

## Phase 2: Data Sync Layer (Week 2)

### What to Sync?

**Priority 1 (Must sync):**
- ✅ Journal entries (with encryption for sensitive ones)
- ✅ Daily schedule commits

**Priority 2 (Nice to have):**
- Settings (personalities, Ollama config)
- Streaks data

**Priority 3 (Future):**
- Analytics/insights
- Shared entries (if you add sharing)

### Implementation Strategy: **Local-First with Cloud Backup**

**Approach:**
1. **Always write to local storage first** (fast, works offline)
2. **Sync to Supabase in background** (async)
3. **Conflict resolution**: Last write wins (can improve later)
4. **Offline-first**: App works without internet

### Architecture

```
User Action → Local Storage (immediate) → Queue for Sync → Supabase (background)
                                    ↓
                              If offline, retry later
```

### Implementation Steps

1. **Create sync service** (`src/renderer/lib/sync.ts`)
   - Queue local changes
   - Sync to Supabase
   - Handle conflicts
   - Retry on failure

2. **Update stores to use sync layer**
   - `journal-store.ts` - Add sync on add/update/delete
   - `schedule-store.ts` - Add sync on commit
   - Keep local-first pattern

3. **Add sync status UI**
   - Show "Syncing..." indicator
   - "Last synced: 2 min ago"
   - Handle offline state

**Estimated time:** 4-5 days

---

## Phase 3: Electron Migration (Week 3-4)

**Now that web works:**
- Add Electron shell
- Use same Supabase client (works in Electron)
- Storage adapter switches: localStorage → Electron file system (for local cache)
- Supabase sync works the same in both

**Benefit of doing this order:**
- Auth + sync already tested and working
- Electron just wraps existing web app
- Less to debug simultaneously

---

## Technology Stack Recommendation

### Supabase (Recommended)

**Why:**
- ✅ Auth + Database + Realtime in one
- ✅ PostgreSQL (proper relational DB)
- ✅ Row Level Security (protect sensitive entries)
- ✅ Built-in encryption at rest
- ✅ Free tier: 500MB database, 50,000 monthly active users
- ✅ JavaScript SDK works in web and Electron

**Setup:**
```bash
npm install @supabase/supabase-js
```

**Alternative: Firebase**
- Also all-in-one
- NoSQL (Firestore)
- Different query model
- Might be easier for simple key-value

**Not Recommended: Privy + Separate Backend**
- Overkill for personal journal
- More complexity
- Privy is great for web3/wallet auth, but probably unnecessary here

---

## Privacy & Security Considerations

### For Sensitive Journal Entries

**Option 1: Encryption at App Level** (Recommended)
- Encrypt sensitive entries before sending to Supabase
- Use Web Crypto API or `crypto-js`
- User's password → encryption key
- Supabase stores encrypted blobs
- ✅ Even Supabase admins can't read

**Option 2: Row Level Security (RLS)**
- Supabase RLS ensures users only see their own data
- ✅ Protects from other users
- ❌ Supabase admins could access (if needed)

**Recommended: Both**
- RLS for access control
- App-level encryption for truly sensitive entries
- Mark entries as `is_sensitive` → encrypt before sync

---

## Database Schema Proposal

### `journal_entries`
```sql
id: uuid (primary key)
user_id: uuid (foreign key to auth.users)
content: text (encrypted if is_sensitive)
mood: text
tags: text[] 
is_sensitive: boolean
visibility: text (private/shared)
ai_summary: text
created_at: timestamp
updated_at: timestamp
```

### `schedule_commits`
```sql
id: uuid (primary key)
user_id: uuid (foreign key)
date: date
blocks: jsonb (TimeBlock[])
committed_at: timestamp
committed: boolean
```

### `user_settings`
```sql
id: uuid (primary key)
user_id: uuid (foreign key, unique)
ollama_config: jsonb
personality_preferences: jsonb
```

---

## Migration Path

### Step 1: Dual-Write Pattern
```
User Action → Local Storage (existing) + Supabase (new)
                      ↓
              If sync fails, keep in queue
```

### Step 2: Migrate Existing Data
- On first login after auth setup
- Read all local data
- Sync to Supabase
- Keep local as backup

### Step 3: Read from Both (Fallback)
```
On Load: Try Supabase first → If fails → Use local storage
```

### Step 4: Full Cloud (Optional, Later)
- Remove local storage fallback
- Everything in Supabase
- Better multi-device sync

---

## Quick Start: Supabase Setup

1. **Create Supabase project** (supabase.com)
2. **Get API keys** (anon key, service role key)
3. **Set up environment variables**
   ```
   VITE_SUPABASE_URL=your-project-url
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```
4. **Enable RLS** on all tables
5. **Create tables** (use schema above)

---

## Recommended Order

1. ✅ **Supabase setup** (30 min)
2. ✅ **Auth integration** (2-3 days)
3. ✅ **Data sync layer** (4-5 days)
4. ✅ **Test thoroughly** (2-3 days)
5. ✅ **Electron migration** (after everything works)

**Total: ~2 weeks for auth + sync, then Electron**

---

## Questions to Consider

1. **Encryption**: Do you want app-level encryption for sensitive entries?
2. **Offline-first**: Should app work fully offline and sync when online?
3. **Multi-device**: Primary goal is backup or full multi-device sync?
4. **Sharing**: Will you add sharing entries with others later? (affects schema)

---

## Next Steps

I can start with:
1. Supabase project setup
2. Auth service implementation
3. Database schema creation

Want me to start with auth setup?

