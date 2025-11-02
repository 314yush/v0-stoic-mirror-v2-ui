#!/bin/bash

# Convert icon.ico to all required formats for Stoic Mirror
# This script uses the icon.ico file from assets/ as the source

echo "🔨 Converting icon.ico to required formats..."

# Check if icon.ico exists
if [ ! -f "assets/icon.ico" ]; then
    echo "❌ Error: assets/icon.ico not found"
    exit 1
fi

# Check if ImageMagick is available (v7 uses 'magick', v6 uses 'convert')
if command -v magick &> /dev/null; then
    CONVERT_CMD="magick"
elif command -v convert &> /dev/null; then
    CONVERT_CMD="convert"
else
    echo "❌ Error: ImageMagick not found"
    echo "   Install with: brew install imagemagick"
    exit 1
fi

# Create directories
mkdir -p build/icon.iconset
mkdir -p assets

echo "📐 Extracting and optimizing icon from ICO file..."

# Find the largest frame in the ICO file (should be 256x256)
# Use the largest frame [7] which is 256x256 for best quality
# First, create a high-quality 1024x1024 base from the largest frame
# Use Lanczos resampling for high-quality upscaling, then sharpen

echo "🎯 Creating high-quality 1024x1024 base icon..."

# Extract largest frame (256x256) and upscale to 1024x1024 with high quality
# Use Lanczos filter for best upscaling quality, then apply unsharp mask for sharpness
$CONVERT_CMD "assets/icon.ico[7]" \
  -filter Lanczos \
  -resize 1024x1024 \
  -unsharp 0x0.75+0.75+0.008 \
  -colorspace sRGB \
  build/icon-1024-base.png

# Now generate all required sizes from the 1024x1024 base using optimal resampling
# For downscaling, use Lanczos or Mitchell filter
# For very small sizes, apply extra sharpening

echo "📏 Generating optimized sizes for macOS iconset..."

# 16x16 @1x (use Mitchell for smoother downscaling at small sizes)
$CONVERT_CMD build/icon-1024-base.png -filter Mitchell -resize 16x16 build/icon.iconset/icon_16x16.png

# 16x16 @2x (32x32)
$CONVERT_CMD build/icon-1024-base.png -filter Lanczos -resize 32x32 build/icon.iconset/icon_16x16@2x.png

# 32x32 @1x
$CONVERT_CMD build/icon-1024-base.png -filter Lanczos -resize 32x32 build/icon.iconset/icon_32x32.png

# 32x32 @2x (64x64)
$CONVERT_CMD build/icon-1024-base.png -filter Lanczos -resize 64x64 build/icon.iconset/icon_32x32@2x.png

# 128x128 @1x
$CONVERT_CMD build/icon-1024-base.png -filter Lanczos -resize 128x128 build/icon.iconset/icon_128x128.png

# 128x128 @2x (256x256)
$CONVERT_CMD build/icon-1024-base.png -filter Lanczos -resize 256x256 build/icon.iconset/icon_128x128@2x.png

# 256x256 @1x
$CONVERT_CMD build/icon-1024-base.png -filter Lanczos -resize 256x256 build/icon.iconset/icon_256x256.png

# 256x256 @2x (512x512)
$CONVERT_CMD build/icon-1024-base.png -filter Lanczos -resize 512x512 build/icon.iconset/icon_256x256@2x.png

# 512x512 @1x
$CONVERT_CMD build/icon-1024-base.png -filter Lanczos -resize 512x512 build/icon.iconset/icon_512x512.png

# 512x512 @2x (1024x1024) - use the base directly
cp build/icon-1024-base.png build/icon.iconset/icon_512x512@2x.png

echo "📦 Generating .icns file for macOS..."
# Generate .icns from iconset
iconutil -c icns build/icon.iconset -o build/icon.icns

# Clean up iconset directory (keep base for PNG generation)
rm -rf build/icon.iconset

echo "🖼️  Creating PNG versions..."

# Create 512x512 PNG for Linux from the high-quality base
$CONVERT_CMD build/icon-1024-base.png -filter Lanczos -resize 512x512 build/icon.png

# Create tray icons from high-quality base
# Regular tray icon (22x22 for menu bar) - use high-quality downscaling
$CONVERT_CMD build/icon-1024-base.png -filter Lanczos -resize 22x22 -unsharp 0x0.5+0.5+0.01 assets/tray-icon.png

# White tray icon for macOS menu bar
# Create a clean white silhouette version suitable for template images
# First convert to grayscale, then invert, then threshold to create crisp white shape
$CONVERT_CMD build/icon-1024-base.png \
  -resize 22x22 \
  -colorspace Gray \
  -threshold 30% \
  -negate \
  -alpha copy \
  -channel A -fx "u.a > 0.1 ? 1 : 0" \
  assets/tray-icon-white.png 2>/dev/null || \
$CONVERT_CMD build/icon-1024-base.png \
  -resize 22x22 \
  -colorspace Gray \
  -threshold 40% \
  -negate \
  -alpha on \
  assets/tray-icon-white.png

echo "🎨 Creating widget-optimized icons..."

# Generate widget-optimized sizes from the high-quality base
# 20x20 - Current widget size (used in widget header)
$CONVERT_CMD build/icon-1024-base.png -filter Lanczos -resize 20x20 -unsharp 0x0.5+0.5+0.01 assets/widget-icon-20.png

# 24x24 - Standard small icon size
$CONVERT_CMD build/icon-1024-base.png -filter Lanczos -resize 24x24 -unsharp 0x0.5+0.5+0.01 assets/widget-icon-24.png

# 32x32 - @2x for Retina displays
$CONVERT_CMD build/icon-1024-base.png -filter Lanczos -resize 32x32 -unsharp 0x0.5+0.5+0.01 assets/widget-icon-32.png

# 40x40 - @2x for 20px on Retina
$CONVERT_CMD build/icon-1024-base.png -filter Lanczos -resize 40x40 -unsharp 0x0.5+0.5+0.01 assets/widget-icon-40.png

# Copy widget icons to public folder for Vite/Electron build
echo "📁 Copying widget icons to public folder..."
mkdir -p src/renderer/public/assets
cp assets/widget-icon-*.png src/renderer/public/assets/ 2>/dev/null || echo "⚠️  Note: src/renderer/public/assets/ not found, icons will need to be copied manually"

# Clean up temporary base
rm -f build/icon-1024-base.png

# Copy ICO for Windows (already in correct format)
echo "📋 Copying ICO for Windows..."
cp assets/icon.ico build/icon.ico

echo "✅ Icon conversion complete!"
echo "   - build/icon.icns (macOS app icon)"
echo "   - build/icon.ico (Windows app icon)"
echo "   - build/icon.png (Linux app icon, 512x512)"
echo "   - assets/tray-icon.png (menu bar icon)"
echo "   - assets/tray-icon-white.png (macOS menu bar template icon)"
echo "   - assets/widget-icon-20.png (widget icon, optimized)"
echo "   - assets/widget-icon-24.png (widget icon, 24px)"
echo "   - assets/widget-icon-32.png (widget icon, 32px)"
echo "   - assets/widget-icon-40.png (widget icon, @2x for Retina)"
