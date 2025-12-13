# Distribution Setup Guide

## Quick Distribution (GitHub Releases)

### Option 1: Automated GitHub Releases

1. **Tag the release:**
   ```bash
   git tag v0.1.0
   git push origin v0.1.0
   ```

2. **GitHub Actions will automatically:**
   - Build the app
   - Generate icons
   - Create a release
   - Upload DMG files

### Option 2: Manual GitHub Release

1. **Build the app:**
   ```bash
   npm run generate:icons
   npm run build:app
   ```

2. **Create GitHub Release:**
   - Go to your GitHub repo
   - Click "Releases" → "Draft a new release"
   - Tag: `v0.1.0`
   - Title: "Stoic Mirror v0.1.0"
   - Upload `release/Stoic Mirror-0.1.0-universal.dmg`

3. **Publish release**

### Option 3: Cloud Storage (Fastest)

1. **Upload DMG:**
   - Google Drive, Dropbox, or similar
   - Share link (make it viewable by anyone with link)

2. **Share link** with friends

## Release Notes Template

```markdown
# Stoic Mirror v0.1.0

## What's New
- 🎨 Optimized app icons (macOS compliant)
- ✨ Enhanced onboarding with setup detection
- 🔍 Auto-detect Ollama installation
- ⚙️ Setup status indicators in Settings
- 🐛 Bug fixes and improvements

## Installation

### For Apple Silicon Macs (M1/M2/M3):
Download `Stoic Mirror-0.1.0-universal.dmg`

### For Intel Macs:
Download `Stoic Mirror-0.1.0-universal.dmg` (universal binary works for both)

### Steps:
1. Download the `.dmg` file
2. Double-click to open
3. Drag "Stoic Mirror" to Applications
4. Open from Applications (right-click → Open if macOS warns)
5. Follow the onboarding to configure Supabase and AI

## First Launch

macOS may show a security warning. This is normal for unsigned apps:
- Right-click the app → Open
- Click "Open" in the dialog

## Setup Required

- **Supabase**: Create account at [supabase.com](https://supabase.com) and run SQL from `SUPABASE_SETUP.sql`
- **AI (Optional)**: Install Ollama or add Gemini API key

See `DOWNLOAD_INSTRUCTIONS.md` for detailed setup steps.
```

## Next Steps

1. ✅ Build is working
2. ✅ Icons optimized
3. ✅ Onboarding enhanced
4. ⏳ Test installation on fresh Mac
5. ⏳ Create release and share

