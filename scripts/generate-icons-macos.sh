#!/usr/bin/env bash
set -euo pipefail

# Generates macOS .icns (and fallback png/ico) into ./build for electron-builder.
# Source of truth: ./assets/app-icon.svg

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

mkdir -p build

SRC_SVG="assets/app-icon.svg"
OUT_PNG_1024="build/icon-1024.png"
ICONSET_DIR="build/icon.iconset"
OUT_ICNS="build/icon.icns"

if [[ ! -f "$SRC_SVG" ]]; then
  echo "Missing $SRC_SVG"
  exit 1
fi

rm -f "$OUT_ICNS"
rm -rf "$ICONSET_DIR"
mkdir -p "$ICONSET_DIR"

echo "Generating base PNG (1024x1024) from $SRC_SVG..."
sips -s format png "$SRC_SVG" --out "$OUT_PNG_1024" >/dev/null

echo "Building iconset..."
sips -z 16 16   "$OUT_PNG_1024" --out "$ICONSET_DIR/icon_16x16.png" >/dev/null
sips -z 32 32   "$OUT_PNG_1024" --out "$ICONSET_DIR/icon_16x16@2x.png" >/dev/null
sips -z 32 32   "$OUT_PNG_1024" --out "$ICONSET_DIR/icon_32x32.png" >/dev/null
sips -z 64 64   "$OUT_PNG_1024" --out "$ICONSET_DIR/icon_32x32@2x.png" >/dev/null
sips -z 128 128 "$OUT_PNG_1024" --out "$ICONSET_DIR/icon_128x128.png" >/dev/null
sips -z 256 256 "$OUT_PNG_1024" --out "$ICONSET_DIR/icon_128x128@2x.png" >/dev/null
sips -z 256 256 "$OUT_PNG_1024" --out "$ICONSET_DIR/icon_256x256.png" >/dev/null
sips -z 512 512 "$OUT_PNG_1024" --out "$ICONSET_DIR/icon_256x256@2x.png" >/dev/null
sips -z 512 512 "$OUT_PNG_1024" --out "$ICONSET_DIR/icon_512x512.png" >/dev/null
cp "$OUT_PNG_1024" "$ICONSET_DIR/icon_512x512@2x.png"

echo "Generating $OUT_ICNS..."
iconutil -c icns "$ICONSET_DIR" -o "$OUT_ICNS"

echo "Generating fallbacks..."
cp "$OUT_PNG_1024" build/icon.png
if [[ -f "assets/icon.ico" ]]; then
  cp assets/icon.ico build/icon.ico
fi

echo "Done:"
ls -la build | sed -n '1,25p'

