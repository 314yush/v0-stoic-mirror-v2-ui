# Stoic Mirror Icon Design Specification

## App Icon Concept

### Primary Concept: Classical Bust with Mirror
- **Main Element**: Silhouette/profile of a classical philosopher bust (inspired by Marcus Aurelius)
- **Secondary Element**: Subtle mirror/reflection effect
- **Style**: Minimalist, modern interpretation of classical sculpture
- **Color**: Bronze/stone tones (#8B7355, #D4AF37) on subtle marble background
- **Alternative**: Classical column with mirrored effect

### Design Requirements
- **Format**: 1024×1024 PNG (source), exported as .icns/.ico
- **Style**: Clean, recognizable at 16×16px
- **Palette**: 
  - Primary: Bronze/Copper (#8B7355, #A0826D)
  - Accent: Gold (#D4AF37, #F4A460)
  - Background: Marble white (#F5F5DC) or Dark slate (#2C2C2C)

### Reference Images (Public Domain)
- Marcus Aurelius bust sculptures (Metropolitan Museum, Capitoline Museums)
- Classical Greek/Roman philosopher busts
- Roman coins with philosopher profiles

## Tab Icons (Feature Icons)

### Today Tab - Marcus Aurelius
- **Icon**: ⏳ Hourglass or 🏛️ Column
- **Represents**: Time, duty, daily discipline
- **Quote**: "Time is a sort of river of passing events, and strong is its current"
- **Style**: Classical hourglass or Doric column silhouette

### Journal Tab - Seneca
- **Icon**: 📜 Scroll or ✍️ Quill
- **Represents**: Reflection, letters, introspection
- **Quote**: "We should every night call ourselves to an account"
- **Style**: Classical scroll or feather quill (minimalist line art)

### Tasks Tab - Epictetus
- **Icon**: ✅ Classical checkmark or 📋 Wax tablet
- **Represents**: What's in our control, action
- **Quote**: "We cannot choose our external circumstances, but we can always choose how we respond"
- **Style**: Roman tablet or classical mark/inscription

### Weekly Tab - Zeno/Overview
- **Icon**: 📊 Chart or 🎯 Target
- **Represents**: Overview, philosophy foundation
- **Style**: Classical column chart or circular target (geometric, architectural)

## Icon Style Guide

### Visual Principles
1. **Classical but Modern**: Inspired by ancient art, executed with modern minimalism
2. **Monochrome with Bronze Accents**: Primary icons in single color (bronze/stone), gold accents
3. **Geometric Precision**: Clean lines, architectural curves
4. **Subtle Texture**: Marble or stone-like background (very subtle)

### Technical Specs
- **Format**: SVG (source) or 512×512 PNG
- **Style**: Line art, silhouette, or low-poly
- **Color Mode**: Monochrome + single accent color
- **Thickness**: 2-3px for line art icons
- **Padding**: 20% around icon for small-size clarity

## Implementation

### Recommended Tools
1. **Design**: Figma, Illustrator, or Canva
2. **Sources**: 
   - Wikimedia Commons (classical art, public domain)
   - Metropolitan Museum API (public domain sculptures)
   - British Museum (classical artifacts)
3. **Icon Generation**:
   - IconKitchen.app (generate .icns from PNG)
   - Image2icon (macOS app)
   - Online .icns generators

### Quick Start Options

**Option 1: Use Public Domain Classical Art**
1. Find public domain bust/column image (Wikimedia Commons)
2. Trace/create minimalist version
3. Add mirror effect or reflection
4. Export as PNG → convert to .icns

**Option 2: Commission/Create Original**
1. Design original classical-inspired icon
2. Reference Marcus Aurelius bust for app icon
3. Create minimalist tab icons (column, scroll, tablet, chart)
4. Export in all required formats

**Option 3: Use AI-Generated (with copyright check)**
1. Generate classical philosopher icon with AI tools
2. Ensure commercial use rights
3. Refine and export

## Color Palette for Icons

### Light Mode
- **Icon Color**: Deep bronze (#8B7355)
- **Background**: Marble white (#F5F5DC)
- **Accent**: Gold (#D4AF37)

### Dark Mode
- **Icon Color**: Light bronze (#D4AF37)
- **Background**: Dark slate (#2C2C2C)
- **Accent**: Amber (#F4A460)

## File Structure Needed

```
assets/
  icons/
    app-icon/
      icon-1024.png (source)
      icon-512.png
      icon-256.png
      icon-128.png
      icon-64.png
      icon-32.png
      icon-16.png
      icon.icns (macOS bundle)
      icon.ico (Windows bundle)
    tabs/
      today.svg (or PNG)
      journal.svg
      tasks.svg
      weekly.svg
```

## Next Steps

1. **Create/Obtain App Icon**: Design or source classical-inspired icon
2. **Create Tab Icons**: Design 4 minimalist classical icons
3. **Generate Formats**: Convert to .icns, .ico, PNG sizes
4. **Update Build Config**: Point electron-builder to icon files
5. **Add to UI**: Replace text-only tabs with icon+text tabs
