# Electron ES Module Fix

## Problem
- `package.json` has `"type": "module"` which makes all `.js` files ES modules
- Electron main process compiles to CommonJS (uses `exports`, `require`)
- CommonJS files need `.cjs` extension when in ES module project

## Solution
1. ✅ Rename compiled files from `.js` to `.cjs`
2. ✅ Update `package.json` `main` field to point to `.cjs`
3. ✅ Update main.ts to reference `preload.cjs`
4. ✅ Add rename step to build scripts

## Build Commands Now:
- `npm run build:main` - Compiles and renames to `.cjs`
- `npm run build:preload` - Compiles and renames to `.cjs`
- `npm run build:electron` - Builds everything

## Testing:
1. Make sure no process is on port 5173 (or kill it)
2. Run `npm run dev:electron`

The app should now load correctly!


