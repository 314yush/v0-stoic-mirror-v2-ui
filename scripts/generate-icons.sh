#!/bin/bash

# Generate icons for Stoic Mirror from SVG
# This script converts SVG to PNG and generates .icns for macOS

echo "🔨 Generating icons for Stoic Mirror..."

# Check if we have required tools
if ! command -v rsvg-convert &> /dev/null && ! command -v inkscape &> /dev/null; then
    echo "❌ Error: Need rsvg-convert (librsvg) or inkscape installed"
    echo "   Install with: brew install librsvg-tools or brew install inkscape"
    exit 1
fi

# Create directories
mkdir -p build/icon.iconset
mkdir -p assets

# Determine converter
if command -v rsvg-convert &> /dev/null; then
    CONVERTER="rsvg-convert"
elif command -v inkscape &> /dev/null; then
    CONVERTER="inkscape"
fi

echo "📐 Converting SVG to PNG sizes..."

# Generate different PNG sizes from SVG
if [ "$CONVERTER" = "rsvg-convert" ]; then
    rsvg-convert -w 16 -h 16 assets/app-icon.svg -o build/icon.iconset/icon_16x16.png
    rsvg-convert -w 32 -h 32 assets/app-icon.svg -o build/icon.iconset/icon_16x16@2x.png
    rsvg-convert -w 32 -h 32 assets/app-icon.svg -o build/icon.iconset/icon_32x32.png
    rsvg-convert -w 64 -h 64 assets/app-icon.svg -o build/icon.iconset/icon_32x32@2x.png
    rsvg-convert -w 128 -h 128 assets/app-icon.svg -o build/icon.iconset/icon_128x128.png
    rsvg-convert -w 256 -h 256 assets/app-icon.svg -o build/icon.iconset/icon_128x128@2x.png
    rsvg-convert -w 256 -h 256 assets/app-icon.svg -o build/icon.iconset/icon_256x256.png
    rsvg-convert -w 512 -h 512 assets/app-icon.svg -o build/icon.iconset/icon_256x256@2x.png
    rsvg-convert -w 512 -h 512 assets/app-icon.svg -o build/icon.iconset/icon_512x512.png
    rsvg-convert -w 1024 -h 1024 assets/app-icon.svg -o build/icon.iconset/icon_512x512@2x.png
    
    # Also create tray icon (22x22 for menu bar)
    rsvg-convert -w 22 -h 22 assets/app-icon.svg -o assets/tray-icon.png
elif [ "$CONVERTER" = "inkscape" ]; then
    inkscape -w 16 -h 16 assets/app-icon.svg -o build/icon.iconset/icon_16x16.png
    inkscape -w 32 -h 32 assets/app-icon.svg -o build/icon.iconset/icon_16x16@2x.png
    inkscape -w 32 -h 32 assets/app-icon.svg -o build/icon.iconset/icon_32x32.png
    inkscape -w 64 -h 64 assets/app-icon.svg -o build/icon.iconset/icon_32x32@2x.png
    inkscape -w 128 -h 128 assets/app-icon.svg -o build/icon.iconset/icon_128x128.png
    inkscape -w 256 -h 256 assets/app-icon.svg -o build/icon.iconset/icon_128x128@2x.png
    inkscape -w 256 -h 256 assets/app-icon.svg -o build/icon.iconset/icon_256x256.png
    inkscape -w 512 -h 512 assets/app-icon.svg -o build/icon.iconset/icon_256x256@2x.png
    inkscape -w 512 -h 512 assets/app-icon.svg -o build/icon.iconset/icon_512x512.png
    inkscape -w 1024 -h 1024 assets/app-icon.svg -o build/icon.iconset/icon_512x512@2x.png
    
    # Tray icon
    inkscape -w 22 -h 22 assets/app-icon.svg -o assets/tray-icon.png
fi

# Also create 512x512 PNG source
if [ "$CONVERTER" = "rsvg-convert" ]; then
    rsvg-convert -w 512 -h 512 assets/app-icon.svg -o build/icon.png
elif [ "$CONVERTER" = "inkscape" ]; then
    inkscape -w 512 -h 512 assets/app-icon.svg -o build/icon.png
fi

echo "📦 Generating .icns file..."

# Generate .icns from iconset
iconutil -c icns build/icon.iconset -o build/icon.icns

# Clean up iconset directory
rm -rf build/icon.iconset

echo "✅ Icons generated successfully!"
echo "   - build/icon.icns (macOS app icon)"
echo "   - assets/tray-icon.png (menu bar icon)"
echo "   - build/icon.png (512x512 source)"
