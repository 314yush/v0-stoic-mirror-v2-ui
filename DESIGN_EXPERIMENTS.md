# Design Experiments Branch - Liquid Glass

## Overview
This branch is for experimenting with Apple's Liquid Glass design system, implementing translucent materials, dynamic refraction, and fluid interactions.

## Current Status
✅ **Foundation Created**
- Liquid Glass CSS system (`liquid-glass.css`)
- Implementation guide (`LIQUID_GLASS_IMPLEMENTATION.md`)
- Design system classes ready to use

## Available Classes

### Material Classes
- `.liquid-glass` - Base translucent material
- `.liquid-thin` - Ultra-thin material (5% opacity)
- `.liquid-regular` - Regular material (12% opacity)
- `.liquid-thick` - Thick material (20% opacity)

### Component Classes
- `.liquid-card` - Glass card with hover effects
- `.liquid-btn` - Glass button with refraction
- `.liquid-input` - Glass input field
- `.liquid-nav` - Glass navigation bar
- `.liquid-modal-backdrop` - Modal backdrop
- `.liquid-modal-content` - Modal content

### Interactive Classes
- `.liquid-interactive` - Adds hover refraction effect
- `.liquid-light-sweep` - Animated light sweep (optional)

## Testing Checklist

### Phase 1: Navigation Bar
- [ ] Apply `.liquid-nav` to header
- [ ] Test blur performance
- [ ] Adjust opacity if needed

### Phase 2: Cards
- [ ] Apply `.liquid-card` to journal entries
- [ ] Apply `.liquid-card` to tasks
- [ ] Test hover interactions

### Phase 3: Buttons
- [ ] Replace button classes with `.liquid-btn`
- [ ] Test primary/secondary variants
- [ ] Check accessibility contrast

### Phase 4: Inputs
- [ ] Apply `.liquid-input` to all inputs
- [ ] Test focus states
- [ ] Verify text readability

### Phase 5: Modals
- [ ] Update Settings modal
- [ ] Update routine editor modal
- [ ] Test backdrop blur

### Phase 6: Performance
- [ ] Test on different devices
- [ ] Check FPS during animations
- [ ] Optimize blur values if needed

## Implementation Examples

### Example 1: Convert Card
```tsx
// Before
<div className="card card-hover">
  Content
</div>

// After
<div className="liquid-card">
  Content
</div>
```

### Example 2: Convert Button
```tsx
// Before
<button className="btn btn-primary">
  Click me
</button>

// After
<button className="liquid-btn">
  Click me
</button>
```

### Example 3: Convert Navigation
```tsx
// Before
<header className="... bg-background/95 backdrop-blur-sm ...">
  Navigation
</header>

// After
<header className="liquid-nav ...">
  Navigation
</header>
```

## Performance Notes

- Blur values: Start with 30-40px, reduce if performance issues
- Use `will-change` only on animated elements
- Test on low-end devices
- Consider reducing blur on mobile (< 768px)

## Next Steps

1. Start with navigation bar (low risk, high impact)
2. Test performance
3. Apply to cards incrementally
4. Gather feedback
5. Refine opacity and blur values

## Rollback Plan

If performance or visual issues arise:
1. Keep liquid-glass.css file for future use
2. Revert component classes back to original
3. Document lessons learned

