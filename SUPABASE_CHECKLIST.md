# Supabase Setup Verification Checklist

## Quick Check

Run `SUPABASE_VERIFICATION.sql` in your Supabase SQL Editor to get a complete status report.

## Manual Checklist

### ✅ Environment Variables
- [ ] `.env` file exists in project root
- [ ] `VITE_SUPABASE_URL` is set (starts with `https://`)
- [ ] `VITE_SUPABASE_ANON_KEY` is set (long JWT string)
- [ ] No quotes around values in `.env`
- [ ] Dev server restarted after adding `.env`

### ✅ Database Tables
- [ ] `journal_entries` table exists
- [ ] `schedule_commits` table exists
- [ ] `user_settings` table exists
- [ ] `tasks` table exists

### ✅ Schema Verification
- [ ] `schedule_commits.finalized_at` column exists (TIMESTAMPTZ)
- [ ] All tables have correct columns
- [ ] Indexes are created for performance

### ✅ Row Level Security (RLS)
- [ ] RLS enabled on `journal_entries`
- [ ] RLS enabled on `schedule_commits`
- [ ] RLS enabled on `user_settings`
- [ ] RLS enabled on `tasks`
- [ ] Policies exist for SELECT, INSERT, UPDATE, DELETE on all tables

### ✅ Sync Functionality
- [ ] Can sign up / sign in
- [ ] Commits sync to Supabase (check browser console)
- [ ] Commits persist after refresh
- [ ] No sync errors in console
- [ ] Background sync is working

## Common Issues

### Issue: Commits not syncing
**Check:**
1. Browser console for errors
2. Network tab for failed requests
3. Supabase logs (Dashboard → Logs → API)
4. RLS policies are correct

### Issue: "finalized_at column missing"
**Fix:** Run `SUPABASE_MIGRATION_add_finalized_at.sql`

### Issue: "Table doesn't exist"
**Fix:** Run `SUPABASE_SETUP.sql` completely

### Issue: "Permission denied" or RLS errors
**Fix:** Verify RLS policies exist (run verification SQL)

## Testing Sync

1. **Make a commit** in the app
2. **Check browser console** - should see sync success
3. **Check Supabase Table Editor** - commit should appear in `schedule_commits`
4. **Refresh app** - commit should still be there
5. **Clear local storage** - commit should reload from Supabase

## Debug Commands

In browser console:
```javascript
// Check if Supabase is configured
import { isSupabaseConfigured } from './lib/supabase'
console.log('Supabase configured:', isSupabaseConfigured())

// Check sync queue
const queue = JSON.parse(localStorage.getItem('sync_queue') || '[]')
console.log('Sync queue:', queue)

// Check local commits
const commits = JSON.parse(localStorage.getItem('schedule_commits_v1') || '{}')
console.log('Local commits:', commits)
```

## What to Share for Debugging

If sync isn't working, share:
1. Browser console errors (screenshot or copy)
2. Network tab errors (failed requests)
3. Output from `SUPABASE_VERIFICATION.sql`
4. Whether you can sign in successfully
5. Whether commits appear in Supabase Table Editor

