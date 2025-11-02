# Quick Icon Fix Guide

## The Problem

You're seeing the Electron default icon because:
1. The app bundle needs `build/icon.icns` (doesn't exist yet)
2. The tray icon `assets/tray-icon.png` may be outdated

## Quick Solution

### Option 1: Use Online Tool (Fastest)

1. **Convert SVG to PNG**:
   - Open `assets/app-icon.svg` in browser or design tool
   - Export/screenshot as 512x512 PNG
   - Save as `assets/tray-icon.png` (for menu bar)

2. **Generate App Icon**:
   - Go to https://icon.kitchen/
   - Upload your 512x512 PNG
   - Download `.icns` file
   - Place in `build/icon.icns`

### Option 2: Use macOS Tools

```bash
# 1. Convert SVG to PNG (if you have ImageMagick or similar)
# Or use Preview: File > Export > PNG (512x512)

# 2. Generate .icns from PNG
mkdir -p build/icon.iconset

# Generate all required sizes
sips -z 16 16 assets/tray-icon.png --out build/icon.iconset/icon_16x16.png
sips -z 32 32 assets/tray-icon.png --out build/icon.iconset/icon_16x16@2x.png
sips -z 32 32 assets/tray-icon.png --out build/icon.iconset/icon_32x32.png
sips -z 64 64 assets/tray-icon.png --out build/icon.iconset/icon_32x32@2x.png
sips -z 128 128 assets/tray-icon.png --out build/icon.iconset/icon_128x128.png
sips -z 256 256 assets/tray-icon.png --out build/icon.iconset/icon_128x128@2x.png
sips -z 256 256 assets/tray-icon.png --out build/icon.iconset/icon_256x256.png
sips -z 512 512 assets/tray-icon.png --out build/icon.iconset/icon_256x256@2x.png
sips -z 512 512 assets/tray-icon.png --out build/icon.iconset/icon_512x512.png
sips -z 1024 1024 assets/tray-icon.png --out build/icon.iconset/icon_512x512@2x.png

# Create .icns
iconutil -c icns build/icon.iconset -o build/icon.icns

# Clean up
rm -rf build/icon.iconset
```

### Option 3: Temporary Quick Fix

For development, you can create a simple colored circle icon:

```bash
# Create a simple 22x22 PNG for tray (using ImageMagick or similar)
# Or just update assets/tray-icon.png with a simple design
```

## Files Needed

After setup, you should have:
- ✅ `assets/tray-icon.png` (22x22 or 32x32, for menu bar)
- ✅ `build/icon.icns` (for app bundle/Dock icon)

## Testing

After creating icons:
1. Restart the Electron app
2. Check menu bar - should show your icon
3. After building (`npm run build:app`), check Dock - should show your icon

## Current Status

- ✅ SVG source created: `assets/app-icon.svg`
- ❌ PNG versions needed: `assets/tray-icon.png`, `build/icon.png`
- ❌ ICNS file needed: `build/icon.icns`
