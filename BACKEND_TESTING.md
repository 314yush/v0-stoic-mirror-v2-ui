# Backend Testing Guide

## Issues Fixed

### 1. ✅ "Use Yesterday" Button
**Problem**: Button didn't actually load yesterday's schedule  
**Fix**: Now loads yesterday's commit from store and copies blocks (resets completion status)

### 2. ✅ Commit Loading After Commit
**Problem**: After committing, you couldn't view/edit the commit  
**Fix**: Simplified loading logic - always loads from store when date/commits change

### 3. ✅ Sync Merge Logic
**Problem**: Commits from Supabase weren't being merged properly (only new ones, not updates)  
**Fix**: Now compares timestamps and uses newer version (local or Supabase)

### 4. ✅ Sync Actions
**Problem**: Always used "insert" action, even for updates  
**Fix**: Uses "update" for existing commits, "insert" for new ones

### 5. ✅ Manual Sync
**Problem**: No way to manually trigger sync from Supabase  
**Fix**: Added "🔄 Sync Now" button in Settings

## Testing Utilities

Debug utilities are available in the browser console (dev mode only):

### Quick Tests

```javascript
// Get current state info
window.testBackend.debugInfo()

// Test loading yesterday's schedule
window.testBackend.loadYesterday()

// Test pulling from Supabase
window.testBackend.pullFromSupabase()

// Test syncing to Supabase
window.testBackend.syncToSupabase()

// Test full sync cycle (pull + push)
window.testBackend.fullSync()

// Test merge logic
window.testBackend.mergeLogic()
```

## Testing Scenarios

### Scenario 1: Commit Today, Load Tomorrow

1. **Commit a schedule for today**
   - Add some blocks
   - Click "Commit Day"
   - Verify it shows as committed

2. **Navigate to tomorrow**
   - Use date picker or "Next Day" button
   - Verify today's commit is still there when you go back

3. **Load yesterday**
   - Go back to today
   - Click "Use Yesterday" button
   - Should load yesterday's blocks (if they exist)

### Scenario 2: Multi-Device Sync

1. **Device A**: Commit a schedule
2. **Device B**: Click "Sync Now" in Settings
3. **Device B**: Verify schedule appears

### Scenario 3: Update Existing Commit

1. **Commit a schedule** for a date
2. **Update blocks** (add/remove/modify)
3. **Commit again** (should update, not create duplicate)
4. **Sync** - verify only one commit exists in Supabase

### Scenario 4: Load Past Commit

1. **Navigate to yesterday** (or any past date)
2. **If committed yesterday**, verify blocks load
3. **Try to edit** - should be allowed (committed status should be clearable)

## Console Debugging

Open browser console (Cmd+Option+I) and use:

```javascript
// See all current commits
const store = window.testBackend
console.log(useScheduleStore.getState().commits)

// Check Supabase sync status
window.testBackend.pullFromSupabase().then(data => {
  console.log("From Supabase:", data.scheduleCommits)
})
```

## Common Issues

### "No schedule found for yesterday"
- **Cause**: Yesterday wasn't committed, or sync didn't work
- **Fix**: Click "Sync Now" in Settings to pull from Supabase

### "Commit won't load"
- **Cause**: Store not updated or useEffect not triggering
- **Fix**: Check console with `window.testBackend.debugInfo()`
- **Fix**: Try manual sync

### "Duplicate commits"
- **Cause**: Merge logic issue or sync conflict
- **Fix**: Check Supabase directly, verify date format (YYYY-MM-DD)

## Next Steps

After testing, verify:
1. ✅ Commits save to Supabase
2. ✅ Commits load from Supabase
3. ✅ Updates work (not creating duplicates)
4. ✅ "Use Yesterday" button works
5. ✅ Past dates can be viewed/edited
6. ✅ Manual sync works

