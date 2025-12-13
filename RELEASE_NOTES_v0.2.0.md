# v0.2.0 - Widget Toggle & Visibility Fixes

## New Features

### Menu Bar Widget Toggle
- **Settings Control**: Added toggle in Settings to enable/disable menu bar widget
- **Default Enabled**: Widget appears automatically on app startup (enabled by default)
- **Persistent Setting**: Your widget preference is saved and restored on app restart

## Improvements

### Widget Visibility
- **Smart Icon Loading**: Tries colored icon first for better visibility, falls back to white template icon
- **Auto-Fallback**: Automatically switches to non-template icon if template icon isn't visible
- **Enhanced Debugging**: Added comprehensive logging for troubleshooting tray icon issues
- **Better Error Handling**: Graceful handling of icon loading failures

### IPC Communication
- **Fixed Handler Registration**: `tray:status` handler now properly registers on startup
- **Better Timing**: Handlers are registered before windows are created
- **Error Recovery**: Automatic tray recreation if missing when widget is enabled

## Bug Fixes

- Fixed TypeScript errors (`getToolTip()` method doesn't exist on Tray)
- Fixed IPC handler registration timing issues
- Improved tray icon visibility on macOS
- Fixed tray bounds detection for zero-size scenarios

## Technical Changes

- Added `widgetEnabled` setting to user preferences (default: `true`)
- Enhanced `createTray()` with better error handling and fallback logic
- Added `tray:status` IPC handler for debugging
- Improved icon path resolution with multiple fallback paths
- Added icon refresh logic to ensure visibility

## Installation

1. Download `Stoic Mirror-0.2.0-universal.dmg`
2. Open the DMG file
3. Drag `Stoic Mirror` to your Applications folder (replace existing if upgrading)
4. Open the app

## Upgrading from v0.1.0

- Your data and settings will be preserved
- Widget will be enabled by default
- You can disable it in Settings → Menu Bar Widget if desired

## System Requirements

- macOS 10.13 or later
- Intel or Apple Silicon Macs

---

**Full Changelog**: https://github.com/314yush/v0-stoic-mirror-v2-ui/compare/v0.1.0...v0.2.0

