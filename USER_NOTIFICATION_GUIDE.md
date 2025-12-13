# User Notification Guide

## How to Notify Users About Updates

Since auto-updates aren't implemented yet, here are the ways to notify your users:

### Option 1: GitHub Release Notifications (Automatic)
**Users who "Watch" your repo will get notifications automatically**

1. **How it works:**
   - Users who watch your GitHub repo get email notifications for new releases
   - This happens automatically when you publish a GitHub release

2. **To maximize reach:**
   - Tell users to click "Watch" on your repo (star isn't enough)
   - They can choose "Releases only" to avoid spam

### Option 2: Announce in Your Community
**Direct communication channels**

1. **Discord/Slack/Telegram:**
   ```
   🎉 New Update: Stoic Mirror v0.3.0!
   
   New features:
   • Customizable wake-up & evening notifications
   • Desktop push notifications
   • Fixed widget progress bar
   
   Download: [GitHub Release Link]
   ```

2. **Email/Messaging:**
   - Send personal messages to beta testers
   - Include release notes and download link

3. **Social Media:**
   - Tweet/Post about the update
   - Share the GitHub release link

### Option 3: In-App Update Checker (Future)
**Add simple version check on startup**

We can implement a basic check that shows:
- "Update available" banner in-app
- Link to GitHub release
- Only shows once per version

**To implement later:**
```typescript
// In App.tsx or main.ts
const CURRENT_VERSION = "0.3.0"
// Fetch latest from GitHub API
// Show banner if newer version exists
```

### Option 4: README Update
**Keep README current**

Update your README.md with:
- Latest version number
- Download link
- What's new section

## Current Release: v0.3.0

### Next Steps:
1. ✅ Code committed and tagged
2. ✅ DMG built
3. 📋 **Create GitHub Release** (manual):
   - Go to: https://github.com/314yush/v0-stoic-mirror-v2-ui/releases/new
   - Tag: `v0.3.0`
   - Title: `v0.3.0 - Notifications & Widget Improvements`
   - Description: Copy from `RELEASE_NOTES_v0.3.0.md`
   - Upload: `release/Stoic Mirror-0.3.0-universal.dmg`
   - Publish

4. 📢 **Notify Users**:
   - Share GitHub release link
   - Post in your community channels
   - Email beta testers

## Quick Message Template

```
🎉 Stoic Mirror v0.3.0 is here!

New Features:
✨ Customizable wake-up & evening notifications
📬 Desktop push notifications (even when app is closed)
📊 Fixed widget progress bar visibility

Download: [GitHub Release Link]

Your data is safe - just replace the app in Applications folder.
```

## Future: Auto-Updates

For seamless updates, we can add:
- `electron-updater` package
- Automatic update check on startup
- Background download and install
- Zero user intervention

**Pros:**
- Users get updates automatically
- No manual downloads needed
- Better user experience

**Cons:**
- Requires code signing (or users see warnings)
- More complex setup
- Need GitHub token for releases API

---

**Note:** For now, manual updates via GitHub Releases work great for beta testing!

