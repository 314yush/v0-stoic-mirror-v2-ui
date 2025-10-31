# Electron Migration Guide

This document outlines how to transition from web app to Electron desktop app.

## Current Structure

```
src/
  renderer/          # React app (works in both web and Electron)
  main/              # (Placeholder for Electron main process)
  preload/           # (Placeholder for Electron preload scripts)
```

## Key Abstraction Layers

### 1. Storage (`src/renderer/lib/storage.ts`)

**Current:** Uses `localStorage` via `LocalStorageAdapter`

**For Electron:** 
- Replace with file-based storage (recommend `electron-store` or custom fs adapter)
- Main process handles file I/O, renderer communicates via IPC
- Update `setStorageAdapter()` to use Electron storage

Example:
```typescript
// In preload script
window.electronAPI = NexposedAPI({
  storage: {
    get: (key: string) => ipcRenderer.invoke('storage:get', key),
    set: (key: string, value: any) => ipcRenderer.invoke('storage:set', key, value),
  }
})

// Then in storage.ts
if (isElectron()) {
  storageAdapter = new ElectronStorageAdapter(window.electronAPI)
}
```

### 2. Platform Detection (`src/renderer/lib/platform.ts`)

Already set up to detect Electron via `window.electronAPI`. 

**To add:** Preload script exposing `window.electronAPI` from main process.

### 3. Data Persistence

Journal entries are stored via Zustand with custom storage adapter.
- Web: localStorage
- Electron: Can switch to file-based via storage adapter

## Steps to Add Electron

1. **Install dependencies:**
   ```bash
   npm install -D electron electron-builder
   npm install electron-store  # Recommended for storage
   ```

2. **Create main process** (`src/main/main.ts`):
   - Handle window creation
   - Set up IPC handlers for storage
   - Configure app menu, shortcuts

3. **Create preload script** (`src/preload/preload.ts`):
   - Expose safe APIs to renderer via `window.electronAPI`
   - Never expose Node.js directly to renderer

4. **Update Vite config:**
   - Build both renderer and main
   - Configure Electron entry point

5. **Update package.json:**
   - Add `main` field pointing to built main process
   - Add Electron builder config

## Browser APIs to Watch

These currently work in web but may need IPC in Electron:

- ✅ `localStorage` - Already abstracted
- ✅ `Date` - Works in both
- ⚠️ File dialogs - Will need Electron dialog APIs
- ⚠️ System notifications - Use Electron notifications API
- ⚠️ External links - Use `shell.openExternal()`

## Testing Strategy

1. Keep web dev server (`npm run dev`) for rapid development
2. Test Electron build separately (`npm run dev:electron`)
3. Ensure all features work in both modes

## Resources

- [Electron + Vite guide](https://www.electronforge.io/guides/framework-integration/vite)
- [Electron security best practices](https://www.electronjs.org/docs/latest/tutorial/security)

