# Stoic Mirror Distribution Guide

## Current Status

✅ **App is built and ready!**
- DMG files created: `Stoic Mirror-0.1.0.dmg` (Universal) and `Stoic Mirror-0.1.0-arm64.dmg` (Apple Silicon)
- ZIP files also available
- App is functional and tested
- Icons and branding complete

## Distribution Options

### Option 1: GitHub Releases (Recommended)

**Pros:**
- Free and reliable
- Easy version management
- Automatic checksums
- Professional appearance
- Download statistics

**Steps:**
1. Go to your GitHub repo: https://github.com/314yush/v0-stoic-mirror-v2-ui
2. Click "Releases" → "Create a new release"
3. Tag: `v0.1.0`
4. Title: `Stoic Mirror v0.1.0 - Beta`
5. Description:
   ```markdown
   ## First Beta Release 🎉
   
   Stoic Mirror - A mindful productivity app inspired by Stoic philosophy.
   
   ### Installation
   1. Download the .dmg file below (choose based on your Mac):
      - **Apple Silicon (M1/M2/M3)**: `Stoic Mirror-0.1.0-arm64.dmg`
      - **Intel Mac**: `Stoic Mirror-0.1.0.dmg`
   2. Double-click the .dmg file
   3. Drag "Stoic Mirror" to Applications folder
   4. Open from Applications (you may need to right-click → Open the first time)
   
   ### Requirements
   - macOS 10.13 or later
   - Supabase account (free tier works) - for sync
   - Optional: Ollama (for local AI) or Gemini API key (for cloud AI)
   ```
6. Upload files:
   - `release/Stoic Mirror-0.1.0.dmg`
   - `release/Stoic Mirror-0.1.0-arm64.dmg`
7. Publish release

**Download URL format:** `https://github.com/314yush/v0-stoic-mirror-v2-ui/releases/download/v0.1.0/Stoic-Mirror-0.1.0-arm64.dmg`

### Option 2: Cloud Storage (Quick & Simple)

**Services:**
- Google Drive (free, easy sharing)
- Dropbox (professional)
- iCloud Drive (if you have iCloud+)
- WeTransfer (temporary, 7 days free)

**Steps:**
1. Upload `.dmg` files to cloud storage
2. Share link with friends
3. Friends download and install

**Pros:** Immediate, no technical setup  
**Cons:** No version management, link can expire

### Option 3: Personal Website/Server

If you have a website:
1. Upload `.dmg` files to web server
2. Create simple download page
3. Link to files

**Example structure:**
```
https://yourwebsite.com/downloads/
  - stoic-mirror-0.1.0.dmg
  - stoic-mirror-0.1.0-arm64.dmg
```

## Installation Instructions for Users

### For Friends/Testers

**Simple Instructions:**
```
1. Download the .dmg file
2. Double-click to open
3. Drag "Stoic Mirror" to Applications
4. Open from Applications (right-click → Open if macOS warns)
5. Follow the setup:
   - Create Supabase account at supabase.com
   - Run SQL setup (instructions in README)
   - Enter Supabase credentials in app
   - Optionally set up Ollama or Gemini API
```

### First Launch Note

macOS Gatekeeper may show a warning:
- **Warning:** "Stoic Mirror cannot be opened because it is from an unidentified developer"
- **Solution:** Right-click → Open → Click "Open" in dialog
- This is normal for unsigned apps (no Apple Developer account needed for beta)

## What's Left to Do

### Critical (Before Sharing)
- [x] ✅ App builds successfully
- [x] ✅ Icons and branding complete
- [ ] ⚠️ Test installation on fresh Mac (verify it works for first-time users)
- [ ] ⚠️ Create user-friendly download instructions

### Important (For Better UX)
- [ ] Add onboarding/help for Supabase setup
- [ ] Document Supabase setup in-app or simplified README
- [ ] Test with friends who aren't developers
- [ ] Collect feedback

### Nice to Have
- [ ] Create demo Supabase instance (so friends don't need to set up)
- [ ] Add video walkthrough
- [ ] Screenshots for README
- [ ] Auto-updater (for future releases)

## Quick Start Distribution

**Fastest way to share:**

1. **Upload to Google Drive:**
   ```bash
   # Upload these files:
   - release/Stoic Mirror-0.1.0-arm64.dmg (for Apple Silicon Macs)
   - release/Stoic Mirror-0.1.0.dmg (for Intel Macs)
   ```

2. **Share link** with friends

3. **Send them this message:**
   ```
   Hey! I've built Stoic Mirror - a productivity app I've been working on.
   
   To install:
   1. Download the .dmg file (use arm64 if you have M1/M2/M3 Mac)
   2. Double-click, drag to Applications
   3. Right-click → Open the first time (macOS security)
   4. Follow the setup in-app (need Supabase account)
   
   Let me know if you run into any issues!
   ```

## GitHub Releases Setup (Step-by-Step)

1. **Push code to GitHub** (if not already)
   ```bash
   git add .
   git commit -m "Release v0.1.0 - Beta"
   git push origin main
   ```

2. **Create release tag:**
   ```bash
   git tag v0.1.0
   git push origin v0.1.0
   ```

3. **Go to GitHub** → Releases → Draft new release
   - Choose tag: v0.1.0
   - Add description
   - Upload DMG files
   - Publish

4. **Share release URL** with friends

## File Sizes

Current builds:
- Universal DMG: ~113 MB
- ARM64 DMG: ~108 MB
- ZIP files: ~109 MB (Universal), ~104 MB (ARM64)

**Recommendation:** Use DMG files (easier installation on macOS)

## Future Improvements

- **Auto-updater:** Use `electron-updater` for automatic updates
- **Code signing:** Apple Developer account ($99/year) for no warnings
- **App Store:** Distribute via Mac App Store (requires code signing)
- **Beta testing:** Use TestFlight (requires App Store Connect)

## Troubleshooting for Users

If friends have issues:

1. **"App is damaged" error:**
   - Run: `xattr -cr /Applications/Stoic\ Mirror.app`
   - Then try opening again

2. **Supabase setup:**
   - Make sure they run SQL scripts correctly
   - Check environment variables are set

3. **AI not working:**
   - Check Ollama is running (if using local)
   - Verify Gemini API key (if using cloud)

## Recommended Approach

**For Beta with Friends:**
1. ✅ Use **GitHub Releases** (professional, free, versioned)
2. ✅ Share release URL
3. ✅ Provide simple setup guide
4. ✅ Collect feedback

**Quick alternative:**
- Upload to Google Drive
- Share link
- Upgrade to GitHub Releases later
