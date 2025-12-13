# Icon Optimization for macOS

## Problem Identified
The original `icon.ico` file had a maximum resolution of 256×256 pixels. When macOS tried to display it at larger sizes (especially 1024×1024), it appeared blurry and didn't meet Apple's Human Interface Guidelines.

## Solution Implemented

### 1. High-Quality Upscaling
- **Source**: Extracts the largest frame from `icon.ico` (256×256, frame [7])
- **Target**: Creates a sharp 1024×1024 base icon using:
  - **Lanczos resampling filter**: Best quality for upscaling
  - **Unsharp mask**: Enhances edge definition (0x0.75+0.75+0.008)
  - **sRGB colorspace**: Ensures proper color representation

### 2. Optimized Downscaling
All icon sizes are now generated from the high-quality 1024×1024 base:
- **Lanczos filter** for medium/large sizes (32×32 and up)
- **Mitchell filter** for very small sizes (16×16) - smoother appearance
- **Additional sharpening** for small sizes to maintain clarity

### 3. Icon Sizes Generated (macOS Guidelines)
The script now generates all required sizes per Apple's specifications:

| Size | @1x | @2x (Retina) |
|------|-----|--------------|
| Small | 16×16 | 32×32 |
| Medium | 32×32 | 64×64 |
| Large | 128×128 | 256×256 |
| Extra Large | 256×256 | 512×512 |
| Extra Extra Large | 512×512 | **1024×1024** |

### 4. Compliance with Apple Guidelines
✅ **1024×1024 resolution** - Required for modern macOS  
✅ **Square format** - macOS automatically applies rounded corners  
✅ **Sharp at all sizes** - Uses proper resampling algorithms  
✅ **No transparency** - Opaque icon design  
✅ **Proper color space** - sRGB for consistent display  

## Usage

To regenerate optimized icons:
```bash
npm run generate:icons
```

Or directly:
```bash
./scripts/convert-icon-ico.sh
```

## Files Generated

- `build/icon.icns` - macOS app icon bundle (460KB, includes all sizes)
- `build/icon.ico` - Windows app icon (401KB)
- `build/icon.png` - Linux app icon (85KB, 512×512)
- `assets/tray-icon.png` - Menu bar icon (22×22, optimized)
- `assets/tray-icon-white.png` - macOS menu bar template icon

## Technical Details

### Resampling Filters Used
- **Lanczos**: High-quality upscaling and downscaling (most sizes)
- **Mitchell**: Smoother results for very small sizes (16×16)
- **Unsharp Mask**: Applied during upscaling to enhance sharpness

### Quality Settings
- Base icon: 1024×1024 with 0.75 radius sharpening
- Small icons: Additional 0.5 radius sharpening for clarity
- All icons: sRGB colorspace for consistent rendering

## Verification

The generated ICNS file contains all required sizes:
- ✅ icon_16x16.png (524B)
- ✅ icon_16x16@2x.png (1.0KB - 32×32)
- ✅ icon_32x32.png (1.3KB)
- ✅ icon_32x32@2x.png (2.1KB - 64×64)
- ✅ icon_128x128.png (8.2KB)
- ✅ icon_128x128@2x.png (26KB - 256×256)
- ✅ icon_256x256.png (26KB)
- ✅ icon_256x256@2x.png (81KB - 512×512)
- ✅ icon_512x512.png (81KB)
- ✅ icon_512x512@2x.png (223KB - **1024×1024**)

## References

- [Apple Human Interface Guidelines - App Icons](https://developer.apple.com/design/human-interface-guidelines/app-icons)
- Apple recommends 1024×1024 for all modern macOS app icons
- Icon should be sharp and recognizable at sizes from 16×16 to 1024×1024
