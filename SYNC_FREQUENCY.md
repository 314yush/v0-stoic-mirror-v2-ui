# Sync Frequency & Behavior

## 🔄 **Sync Timing**

### **Immediate Sync (Trigger-Based)**
When you perform actions, sync happens **immediately**:

1. **Creating Journal Entry** → Syncs instantly (in background)
2. **Updating Journal Entry** → Syncs instantly
3. **Deleting Journal Entry** → Syncs instantly
4. **Committing Schedule** → Syncs instantly
5. **Updating Schedule** → Syncs instantly (e.g., completion Yes/No)
6. **Deleting Schedule** → Syncs instantly

**Note:** Even though sync is "instant", it runs **in the background** so it doesn't block the UI. If sync fails, it's automatically queued for retry.

### **Background Sync (Periodic)**
Background sync processes the queue **every 30 seconds** (`30000ms`):

```typescript
startBackgroundSync(intervalMs: number = 30000) // 30 seconds
```

**What it does:**
- Processes any items in the sync queue (failed/queued syncs)
- Only runs when online
- Only runs if you're logged into Supabase
- Stops automatically when you log out

### **Initial Sync (On Login)**
When you log in, sync happens **immediately**:

1. **Pulls data from Supabase** → Downloads your journal entries and schedules
2. **Merges with local data** → Smart merge (Supabase data takes priority for conflicts)
3. **Starts background sync** → Begins the 30-second interval sync
4. **Processes sync queue** → Syncs any pending changes that were queued while offline

## 📊 **Sync Behavior Details**

### **Sync Queue System**

**Queue items include:**
- Journal entries waiting to sync
- Schedule commits waiting to sync
- Any operations that failed due to network issues

**Queue limits:**
- Maximum 100 items in queue
- Maximum 5 retry attempts per item
- Items older than 7 days are auto-cleaned

**When items are queued:**
- ✅ **Offline** → All operations queued
- ✅ **Not logged in** → All operations queued
- ✅ **Network errors** → Operations queued for retry
- ✅ **Sync failures** → Operations queued (up to 5 retries)

### **Retry Logic**

**Automatic retries:**
- Failed syncs are automatically retried every 30 seconds
- Each item can be retried up to 5 times
- After 5 failures, the item is removed from queue (logged as error)

**Permanent errors (not retried):**
- Data format errors (invalid JSON)
- These are logged but not queued (won't succeed on retry anyway)

**Transient errors (retried):**
- Network errors → Retried automatically
- Auth errors → Retried (might succeed after re-login)
- Temporary server errors → Retried

## ⏱️ **Sync Timeline Example**

```
00:00 - You create a journal entry
00:00 - Sync attempted immediately (background)
00:00 - If successful: ✅ Synced to Supabase
00:00 - If failed: Queued for retry

00:30 - Background sync runs
00:30 - Processes any queued items
00:30 - Retries failed syncs

01:00 - Background sync runs again
01:00 - Continues processing queue...

...and so on every 30 seconds
```

## 🔍 **How to Check Sync Status**

### **In Browser Console:**
1. Open DevTools (F12)
2. Check console for:
   - `Sync error:` → Failed sync (will retry)
   - No errors → Syncs are working

### **Check Sync Queue:**
1. Open DevTools
2. **Application** tab → **Local Storage**
3. Check `sync_queue` key:
   - Empty array `[]` → Everything synced ✅
   - Items in array → Pending syncs ⏳

### **Network Tab:**
1. Open DevTools → **Network** tab
2. Filter by `supabase.co`
3. You should see requests every ~30 seconds when queue has items

## 🚨 **Sync Status Indicators**

**Network Status Component:**
- Shows online/offline status
- When offline, syncs are queued automatically
- When back online, queue processes on next 30-second cycle

**In App:**
- No explicit "syncing" indicator (by design - background process)
- Errors show as console warnings
- Success is silent (as it should be)

## 📝 **Summary**

| Event | Sync Timing |
|-------|-------------|
| **Create/Update/Delete Journal** | Immediate (background) |
| **Commit/Update Schedule** | Immediate (background) |
| **Background Queue Processing** | Every **30 seconds** |
| **On Login** | Immediate (pulls data + processes queue) |
| **When Offline** | Queued (syncs when back online) |
| **Failed Syncs** | Retried every 30 seconds (max 5 attempts) |

**Key Points:**
- ✅ Changes are **saved locally first** (instant)
- ✅ Sync happens **in background** (non-blocking)
- ✅ **30-second interval** for processing queue
- ✅ **Automatic retries** for failed syncs
- ✅ **Smart queue management** (deduplication, size limits, cleanup)

**Your data is safe:** Even if sync fails, your data is stored locally and will sync once connectivity/auth issues are resolved.


