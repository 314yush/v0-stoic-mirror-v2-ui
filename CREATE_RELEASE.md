# Creating GitHub Release

## Option 1: Using GitHub CLI (Recommended)

If you have GitHub CLI installed and authenticated:

```bash
cd /Users/piyush/mindful-OS

# Create release with DMG
gh release create v0.1.0 \
  "release/Stoic Mirror-0.1.0-universal.dmg" \
  --title "v0.1.0 - Stoic Mirror Initial Release" \
  --notes "## Features

- Daily schedule planning with time blocks
- Journal with AI-powered reflections  
- Weekly adherence heatmap
- Task management
- Offline-first with Supabase sync
- Optimized icons for macOS
- Universal binary (Intel + Apple Silicon)

## Improvements

- Fixed timeline block positioning and timing
- Improved backend sync and merge logic
- Enhanced UI with proper block fills
- Added onboarding flow

## Installation

1. Download \`Stoic Mirror-0.1.0-universal.dmg\`
2. Open the DMG file
3. Drag \`Stoic Mirror\` to your Applications folder
4. Open the app (you may need to right-click and select Open on first launch)

## System Requirements

- macOS 10.13 or later
- Intel or Apple Silicon Macs

## First Time Setup

The app will guide you through:
1. Supabase setup (for cloud sync)
2. AI provider setup (Ollama or Gemini)
3. Creating your first schedule

Enjoy! 📿"
```

## Option 2: Using GitHub Web Interface

1. Go to: https://github.com/314yush/v0-stoic-mirror-v2-ui/releases/new
2. Select tag: `v0.1.0`
3. Title: `v0.1.0 - Stoic Mirror Initial Release`
4. Description: (Copy from above)
5. Upload: `release/Stoic Mirror-0.1.0-universal.dmg`
6. Click "Publish release"

## Option 3: Using GitHub CLI (Install if needed)

```bash
# Install GitHub CLI
brew install gh

# Authenticate
gh auth login

# Then run Option 1 commands
```

