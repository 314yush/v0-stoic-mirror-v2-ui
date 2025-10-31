# What Happens When localStorage is Cleared?

## 🔴 **Immediate Impact: Complete Data Loss**

When you clear localStorage, **ALL** locally stored data is permanently deleted. Here's what gets wiped:

## 📦 **Data Stored in localStorage**

### 1. **Journal Entries** (`journal_entries_v1`)
- ❌ All journal entries (conversations, summaries, moods, tags)
- ❌ **Permanent loss** if not synced to Supabase
- ✅ **Recoverable** if entries were already synced to Supabase (will re-sync on next login)

### 2. **Schedule Commits** (`schedule_commits_v1`)
- ❌ All daily routine commits
- ❌ All completion statuses (Yes/No answers)
- ❌ Streak data
- ❌ **Permanent loss** if not synced to Supabase
- ✅ **Recoverable** if data was synced to Supabase (will re-sync on next login)

### 3. **User Settings** (`user_settings_v1`)
- ❌ AI provider preference (Ollama/Gemini)
- ❌ Ollama URL and model configuration
- ❌ Gemini API key
- ❌ Theme preference (dark/light)
- ❌ **Permanent loss** - will reset to defaults:
  - AI Provider: Ollama
  - Ollama URL: `http://localhost:11434`
  - Ollama Model: `llama3.2:1b`
  - Theme: Dark

### 4. **Routine Templates** (`routine_templates_v1`)
- ❌ All saved routine templates
- ❌ **Permanent loss** - these are NOT synced to Supabase (local-only)

### 5. **Theme Preference** (`theme_preference_v1`)
- ❌ Dark/light mode preference
- ❌ Will reset to default (dark)

### 6. **Auth State** (`auth_state_v1`)
- ❌ User session information
- ❌ You'll be logged out immediately
- ✅ **Recoverable** - Supabase session persists server-side
- 🔄 You'll need to log in again, but Supabase will remember your session

### 7. **Sync Queue** (`sync_queue`)
- ❌ Pending sync operations
- ❌ Any unsent changes waiting to sync to Supabase
- ⚠️ **Critical** - If you had unsynced changes, they're now lost permanently

## 🔄 **What Happens Next**

### **If You're Logged Into Supabase:**

1. **On Next Login:**
   - ✅ Journal entries synced to Supabase will be re-downloaded
   - ✅ Schedule commits synced to Supabase will be re-downloaded
   - ❌ Any **unsynced** changes are permanently lost
   - ❌ Settings and routine templates are **gone forever** (not synced)

2. **Settings Reset:**
   - All settings reset to defaults
   - You'll need to reconfigure:
     - AI provider preference
     - Ollama model/URL
     - Gemini API key (if using Gemini)
     - Theme preference

3. **Lost Data:**
   - Any journal entries created but not yet synced
   - Any schedule commits made but not yet synced
   - Any completion statuses (Yes/No) not yet synced
   - All routine templates (never synced)

### **If You're NOT Logged Into Supabase:**

- 🔴 **Total data loss** - nothing can be recovered
- Everything resets to a fresh install state

## ⚠️ **Critical Warnings**

### **Before Clearing localStorage:**

1. ✅ **Make sure you're logged into Supabase** - This gives you a backup
2. ✅ **Let sync finish** - Wait for all pending syncs to complete
3. ✅ **Check sync queue** - Make sure `sync_queue` is empty or only has old items
4. ⚠️ **Backup routine templates** - These are NOT synced, so note them down if important

### **Data Recovery:**

- ✅ **Synced data** → Automatically re-downloads on next login
- ❌ **Unsynced data** → Permanently lost
- ❌ **Settings** → Permanently lost (must reconfigure)
- ❌ **Routine templates** → Permanently lost

## 🔍 **How to Check What Will Be Lost**

### Before clearing, check in browser DevTools:

1. **Open DevTools** (F12)
2. **Application tab** → **Local Storage**
3. **Check keys:**
   - `journal_entries_v1` - Count entries
   - `schedule_commits_v1` - Count commits
   - `sync_queue` - Check if empty or has pending items
   - `routine_templates_v1` - Your saved templates
   - `user_settings_v1` - Your settings

### Check Sync Status:

Look for any sync errors in console:
- `Sync error` messages indicate unsynced data
- `sync_queue` with items means pending syncs

## 💡 **Recommendations**

1. **Regular Backups:**
   - Make sure Supabase sync is working
   - Periodically export routine templates (copy-paste to notes)

2. **Before Major Changes:**
   - Ensure all syncs are complete
   - Check for any errors in console

3. **After Clearing:**
   - Log in again to restore synced data
   - Reconfigure settings
   - Recreate routine templates if needed

## 🎯 **Summary**

| Data Type | Synced to Supabase? | Recoverable? | Lost Forever? |
|-----------|-------------------|--------------|---------------|
| Journal Entries | ✅ Yes | ✅ If synced | ❌ If unsynced |
| Schedule Commits | ✅ Yes | ✅ If synced | ❌ If unsynced |
| Settings | ❌ No | ❌ No | ✅ Yes |
| Routine Templates | ❌ No | ❌ No | ✅ Yes |
| Theme | ❌ No | ❌ No | ✅ Yes |
| Auth Session | ✅ Server-side | ✅ Yes | ❌ No |

**Bottom Line:** Clearing localStorage is like doing a factory reset. Only data already synced to Supabase can be recovered.

