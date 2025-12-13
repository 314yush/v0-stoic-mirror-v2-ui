# v0.3.0 - Notifications & Widget Improvements

## New Features

### Customizable Notifications
- **Wake-Up Reminders**: Set custom wake-up time to get notified to review your schedule
- **Evening Wind-Down**: Customize when you get reminded to set tomorrow's routine
- **Desktop Push Notifications**: Native macOS notifications (even when app is closed/minimized)
- **Notification Click to Open**: Click any notification to open the app
- **Settings UI**: Easy configuration in Settings → Notifications
  - Toggle notifications on/off independently
  - Custom time pickers (24-hour format)
  - 30-minute notification window

### Widget Improvements
- **Fixed Progress Bar**: Progress bar now properly displays completion percentage
- **Better Visibility**: Improved colors and contrast for dark/light modes
- **Completion Stats**: Shows "X of Y completed (Z%)" below progress bar

## Improvements

### Notification System
- Notifications work even when app is in background
- Both in-app toasts and desktop notifications are shown
- Evening notification retains snooze functionality (20 minutes)
- Wake-up notification automatically opens Today tab

### Widget Progress Display
- Progress bar background is now clearly visible
- Filled portion properly reflects task completion
- Added completion statistics text
- Consistent styling with timeline blocks

## Technical Changes

- Added `wakeUpTime`, `wakeUpEnabled`, `eveningWindDownTime`, `eveningWindDownEnabled` to settings
- Enhanced nudge service with customizable times
- Implemented Electron Notification API
- Improved progress bar with explicit RGBA colors
- Added IPC handler for desktop notifications

## Installation

1. Download `Stoic Mirror-0.3.0-universal.dmg`
2. Open the DMG file
3. Drag `Stoic Mirror` to your Applications folder (replace existing if upgrading)
4. Open the app

## Upgrading from v0.2.0

- Your data and settings will be preserved
- Evening wind-down notification: enabled by default at 22:00
- Wake-up notification: disabled by default (enable in Settings if desired)
- Customize notification times in Settings → Notifications

## System Requirements

- macOS 10.13 or later
- Intel or Apple Silicon Macs

## Notification Permissions

On first notification, macOS may ask for permission:
- Go to System Preferences > Notifications > Stoic Mirror
- Ensure notifications are enabled

---

**Full Changelog**: https://github.com/314yush/v0-stoic-mirror-v2-ui/compare/v0.2.0...v0.3.0

