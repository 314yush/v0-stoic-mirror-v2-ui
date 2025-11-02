# App Icon Generation Guide

## Current Status

- ✅ SVG icon created: `assets/app-icon.svg` (512x512 source)
- ⚠️ PNG/ICNS needed: Electron builder needs icon files

## App Icon Design

The app icon is inspired by classical Stoic philosophy, featuring:
- Classical philosopher bust silhouette (representing Marcus Aurelius)
- Mirror/reflection effect at bottom
- Bronze/stone color palette (#8B7355)

## Generating Icon Files

### Option 1: Using Image Tools

1. **Export SVG to PNG**:
   - Open `assets/app-icon.svg` in Illustrator, Figma, or Inkscape
   - Export as PNG at 512x512px
   - Save as `build/icon.png`

2. **Generate .icns file** (macOS):
   - Use [IconKitchen](https://icon.kitchen/) - upload 512x512 PNG, download .icns
   - Or use macOS `iconutil` command:
     ```bash
     # Create iconset directory
     mkdir -p build/icon.iconset
     
     # Generate different sizes from 512x512 PNG
     sips -z 16 16 build/icon.png --out build/icon.iconset/icon_16x16.png
     sips -z 32 32 build/icon.png --out build/icon.iconset/icon_16x16@2x.png
     sips -z 32 32 build/icon.png --out build/icon.iconset/icon_32x32.png
     sips -z 64 64 build/icon.png --out build/icon.iconset/icon_32x32@2x.png
     sips -z 128 128 build/icon.png --out build/icon.iconset/icon_128x128.png
     sips -z 256 256 build/icon.png --out build/icon.iconset/icon_128x128@2x.png
     sips -z 256 256 build/icon.png --out build/icon.iconset/icon_256x256.png
     sips -z 512 512 build/icon.png --out build/icon.iconset/icon_256x256@2x.png
     sips -z 512 512 build/icon.png --out build/icon.iconset/icon_512x512.png
     sips -z 1024 1024 build/icon.png --out build/icon.iconset/icon_512x512@2x.png
     
     # Generate .icns
     iconutil -c icns build/icon.iconset -o build/icon.icns
     ```

3. **Generate .ico file** (Windows):
   - Use online converter or ImageMagick
   - Or use `png2ico` tool

### Option 2: Using Online Tools

1. **IconKitchen** (https://icon.kitchen/)
   - Upload 512x512 PNG
   - Download .icns for macOS
   - Download .ico for Windows

2. **Image2icon** (macOS app)
   - Drag & drop PNG
   - Export as .icns

### Option 3: Using Node.js Script

Create a script to automate icon generation:

```javascript
// scripts/generate-icons.js
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// This would use sharp or similar to resize and generate icons
// See: https://github.com/lovell/sharp
```

## File Structure

After generation, you should have:

```
build/
  icon.png (512x512 source)
  icon.icns (macOS icon set)
  icon.ico (Windows icon - optional)
```

## electron-builder Configuration

The `electron-builder.yml` is already configured to use:
- `build/icon.icns` for macOS
- Icon will be embedded in the .app bundle

## Current SVG Source

The SVG icon is in `assets/app-icon.svg`. You can:
- Edit it in any vector graphics editor
- Export to PNG for icon generation
- Adjust colors, details as needed

## Next Steps

1. Convert SVG to 512x512 PNG
2. Generate .icns file using one of the methods above
3. Place files in `build/` directory
4. Test build: `npm run build:app`

The icon will appear in:
- macOS Dock
- macOS menu bar (tray)
- App bundle (Finder)
- Installer
