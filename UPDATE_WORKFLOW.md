# Update & Bug Fix Workflow

## Quick Fix Workflow

### 1. Make Your Fix
```bash
# Make your code changes
# Fix the bug in the appropriate file
```

### 2. Update Version
```bash
# Edit package.json - bump version
# Current: 0.1.0
# Fix: 0.1.1 (patch)
# Feature: 0.2.0 (minor)
# Breaking: 1.0.0 (major)

# Example: Fix a bug
# Change: "version": "0.1.0" → "version": "0.1.1"
```

### 3. Commit & Tag
```bash
git add .
git commit -m "fix: [describe the bug fix]"
git tag -a v0.1.1 -m "v0.1.1: Bug fixes

- Fixed [issue description]
- Improved [what was improved]"
git push origin main
git push origin v0.1.1
```

### 4. Rebuild & Release
```bash
# Regenerate icons (if icon changed)
npm run generate:icons

# Build new release
npm run build:app

# This creates: release/Stoic Mirror-0.1.1-universal.dmg
```

### 5. Create GitHub Release
- Go to: https://github.com/314yush/v0-stoic-mirror-v2-ui/releases/new
- Tag: `v0.1.1`
- Upload: `release/Stoic Mirror-0.1.1-universal.dmg`
- Add release notes describing the fix

## Versioning Guide

### Semantic Versioning (semver)
- **Major** (1.0.0): Breaking changes
- **Minor** (0.2.0): New features (backward compatible)
- **Patch** (0.1.1): Bug fixes (backward compatible)

### Common Scenarios

**Bug Fix:**
```
0.1.0 → 0.1.1
```

**New Feature:**
```
0.1.1 → 0.2.0
```

**Critical Security Fix:**
```
0.1.1 → 0.1.2
```

## Auto-Update (Future)

Currently, updates are manual. To enable auto-updates:

1. Install `electron-updater`:
   ```bash
   npm install electron-updater
   ```

2. Configure in `electron-builder.yml`:
   ```yaml
   publish:
     provider: github
     owner: 314yush
     repo: v0-stoic-mirror-v2-ui
   ```

3. Add update checking in `src/main/main.ts`:
   ```typescript
   import { autoUpdater } from 'electron-updater'
   
   // Check for updates on startup
   app.whenReady().then(() => {
     autoUpdater.checkForUpdatesAndNotify()
   })
   ```

4. GitHub Actions will auto-publish updates when you push tags

## Distribution to Users

### Option 1: Manual Download (Current)
1. Users download new DMG from GitHub Releases
2. Replace old app in Applications folder
3. Data persists (stored in app data directory)

### Option 2: Auto-Update (Future)
1. App checks GitHub Releases on startup
2. Downloads and installs update automatically
3. Seamless for users

## Testing Before Release

1. **Test locally:**
   ```bash
   npm run dev:electron
   ```

2. **Build and test DMG:**
   ```bash
   npm run build:app
   # Open and test the DMG
   ```

3. **Verify on both architectures** (if you have access):
   - Intel Mac
   - Apple Silicon Mac

## Release Checklist

- [ ] Bug fixed and tested locally
- [ ] Version bumped in `package.json`
- [ ] Commit message follows convention (`fix:`, `feat:`, etc.)
- [ ] Git tag created with version number
- [ ] DMG built successfully
- [ ] DMG tested (opens and runs)
- [ ] GitHub Release created with DMG
- [ ] Release notes include:
  - What was fixed
  - How to update (for users)
  - Any breaking changes (if applicable)

## Example: Fixing a Bug

```bash
# 1. Fix the bug in src/renderer/components/today/day-timeline.tsx

# 2. Update version
# In package.json: "version": "0.1.1"

# 3. Commit
git add .
git commit -m "fix: correct block end time calculation in timeline"
git tag -a v0.1.1 -m "v0.1.1: Timeline fix

- Fixed block end time calculation
- Blocks now display correct duration"
git push origin main && git push origin v0.1.1

# 4. Build
npm run build:app

# 5. Create GitHub Release with new DMG
```

## Notifying Users

1. **GitHub Release** - Users subscribed get notifications
2. **README Update** - Add note about update
3. **In-App Notice** (future) - Show update available message

