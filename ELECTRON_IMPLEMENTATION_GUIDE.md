# Electron Implementation Guide for macOS

## 🎯 **Implementation Order**

**Yes, you convert to Electron FIRST, then add menu bar features.** Here's the step-by-step process:

### **Phase 1: Convert Web App → Electron** (Foundation)
1. Install Electron dependencies
2. Create main process (window management)
3. Create preload script (secure IPC)
4. Update build config
5. Test app runs in Electron window

### **Phase 2: Add Menu Bar Integration** (macOS Features)
1. Add Tray icon (menu bar)
2. Create popover widget window
3. Handle positioning and window management
4. Add context menu

### **Phase 3: Build Widget UI** (React Component)
1. Create `/widget` route in React app
2. Design minimal, actionable widget
3. Connect to existing stores
4. Handle IPC communication

---

## 📋 **Step-by-Step Implementation**

### **STEP 1: Install Electron Dependencies**

```bash
npm install -D electron electron-builder
npm install electron-store  # For file-based storage
```

### **STEP 2: Project Structure**

```
mindful-OS/
├── src/
│   ├── main/              # Electron main process (NEW)
│   │   ├── main.ts
│   │   └── window-manager.ts
│   ├── preload/           # Preload scripts (NEW)
│   │   └── preload.ts
│   └── renderer/          # Your existing React app (EXISTING)
│       └── ...
├── electron-builder.yml    # Build config (NEW)
├── package.json
└── vite.config.ts         # Update for Electron
```

### **STEP 3: Create Main Process**

Create `src/main/main.ts`:

```typescript
import { app, BrowserWindow, Tray, Menu, nativeImage, screen } from 'electron'
import * as path from 'path'
import * as url from 'url'

let mainWindow: BrowserWindow | null = null
let widgetWindow: BrowserWindow | null = null
let tray: Tray | null = null

const isDev = process.env.NODE_ENV === 'development'
const isProd = !isDev

// Create main application window
function createMainWindow(): void {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    minWidth: 600,
    minHeight: 400,
    backgroundColor: '#1a1a1a', // Dark theme default
    titleBarStyle: 'hiddenInset', // macOS native title bar
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, '../preload/preload.js'),
    },
    show: false, // Don't show until ready
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173/app')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(
      path.join(__dirname, '../../dist/index.html'),
      { hash: '/app' }
    )
  }

  mainWindow.once('ready-to-show', () => {
    // Window will show when user explicitly opens it
    // (not on app launch)
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// Create widget popover window
function createWidgetWindow(): void {
  if (widgetWindow) {
    if (widgetWindow.isVisible()) {
      widgetWindow.hide()
      return
    } else {
      showWidget()
      return
    }
  }

  const { screen } = require('electron')
  const bounds = tray?.getBounds() || { x: 0, y: 0 }
  
  widgetWindow = new BrowserWindow({
    width: 320,
    height: 420,
    x: bounds.x - 160, // Center below tray icon
    y: bounds.y + 25,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    movable: false,
    hasShadow: true,
    backgroundColor: '#00000000', // Transparent
    vibrancy: 'sidebar', // macOS blur effect
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, '../preload/preload.js'),
    },
  })

  // Auto-hide when clicking outside
  widgetWindow.on('blur', () => {
    widgetWindow?.hide()
  })

  if (isDev) {
    widgetWindow.loadURL('http://localhost:5173/widget')
  } else {
    widgetWindow.loadFile(
      path.join(__dirname, '../../dist/index.html'),
      { hash: '/widget' }
    )
  }
}

function showWidget(): void {
  if (!widgetWindow) return
  
  const { screen } = require('electron')
  const bounds = tray?.getBounds() || { x: 0, y: 0 }
  const display = screen.getDisplayNearestPoint({ x: bounds.x, y: bounds.y })
  
  // Position widget below tray icon
  widgetWindow.setPosition(
    bounds.x - 160, // Center 320px widget
    bounds.y + 25
  )
  widgetWindow.show()
}

// Create tray icon (menu bar)
function createTray(): void {
  // Create icon (you'll need to add an icon file)
  const iconPath = path.join(__dirname, '../../assets/tray-icon.png')
  const icon = nativeImage.createFromPath(iconPath)
  
  // If icon doesn't exist, create a simple one
  if (icon.isEmpty()) {
    // Fallback: create a simple template image
    const templateIcon = nativeImage.createEmpty()
    tray = new Tray(templateIcon)
  } else {
    tray = new Tray(icon)
  }

  tray.setToolTip('Mindful OS')
  tray.setIgnoreDoubleClickEvents(true)

  // Click to toggle widget
  tray.on('click', () => {
    createWidgetWindow()
  })

  // Right-click context menu
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open Mindful OS',
      click: () => {
        if (!mainWindow) {
          createMainWindow()
        }
        mainWindow?.show()
        mainWindow?.focus()
      },
    },
    {
      label: 'Quick Journal',
      click: () => {
        // Send IPC message to widget to open journal input
        widgetWindow?.webContents.send('quick-action', 'journal')
        if (!widgetWindow?.isVisible()) {
          createWidgetWindow()
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.quit()
      },
    },
  ])

  tray.setContextMenu(contextMenu)
}

// App lifecycle
app.whenReady().then(() => {
  createTray()
  // Don't create main window on startup - start with tray only
  
  app.on('activate', () => {
    // macOS: re-create window when dock icon is clicked
    if (!mainWindow && !widgetWindow?.isVisible()) {
      createMainWindow()
      mainWindow?.show()
    }
  })
})

app.on('window-all-closed', () => {
  // macOS: Keep app running even when windows are closed
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
```

### **STEP 4: Create Preload Script**

Create `src/preload/preload.ts`:

```typescript
import { contextBridge, ipcRenderer } from 'electron'

// Expose safe APIs to renderer
contextBridge.exposeInMainWorld('electronAPI', {
  // Storage (for Electron adapter)
  storage: {
    get: (key: string) => ipcRenderer.invoke('storage:get', key),
    set: (key: string, value: any) => ipcRenderer.invoke('storage:set', key, value),
    remove: (key: string) => ipcRenderer.invoke('storage:remove', key),
  },
  
  // Window management
  window: {
    close: () => ipcRenderer.invoke('window:close'),
    minimize: () => ipcRenderer.invoke('window:minimize'),
    openMain: () => ipcRenderer.invoke('window:openMain'),
  },
  
  // Quick actions
  onQuickAction: (callback: (action: string) => void) => {
    ipcRenderer.on('quick-action', (_, action) => callback(action))
  },
  
  // Platform info
  platform: process.platform,
})
```

### **STEP 5: Update Vite Config**

Update `vite.config.ts`:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const envDirPath = resolve(__dirname)

export default defineConfig({
  root: 'src/renderer',
  envDir: envDirPath,
  plugins: [react()],
  build: {
    outDir: '../../dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'src/renderer/index.html'),
      },
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    open: false,
  },
  base: './', // Important for Electron
})
```

### **STEP 6: Update package.json**

```json
{
  "name": "mindful-os",
  "version": "0.1.0",
  "main": "dist/main/main.js",
  "scripts": {
    "dev": "vite",
    "dev:electron": "concurrently \"npm run dev\" \"wait-on http://localhost:5173 && electron .\"",
    "build": "vite build && tsc -p tsconfig.main.json",
    "build:electron": "npm run build && electron-builder",
    "preview": "vite preview"
  },
  "devDependencies": {
    "electron": "^latest",
    "electron-builder": "^latest",
    "concurrently": "^latest",
    "wait-on": "^latest"
  }
}
```

---

## 🎨 **Minimal, Actionable Widget Design**

### **Widget UI Specification:**

```
┌─────────────────────────────┐
│ ⚡ Mindful OS          [×]  │
├─────────────────────────────┤
│                             │
│  Current Block              │
│  ┌───────────────────────┐ │
│  │ 🎯 Deep Work          │ │
│  │ 09:00 - 12:00         │ │
│  │ ⏱️ 2h 19m remaining  │ │
│  └───────────────────────┘ │
│                             │
│  Quick Actions              │
│  ┌───────────────────────┐ │
│  │ [✓] Mark Complete    │ │ ← One tap
│  │ [📝] Quick Journal   │ │ ← One tap
│  └───────────────────────┘ │
│                             │
│  Today's Progress           │
│  ┌───────────────────────┐ │
│  │ ▓▓▓▓▓▓▓▓░░ 85%        │ │
│  │ 🔥 12 day streak      │ │
│  └───────────────────────┘ │
│                             │
│  Next: Exercise (5:00 PM)   │
└─────────────────────────────┘
```

### **Key Principles:**

1. **One-tap actions** - Everything is actionable
2. **Current context first** - What matters NOW
3. **Minimal info** - Only essentials
4. **No scrolling** - Everything fits in viewport
5. **Clear hierarchy** - Most important at top

### **Widget React Component**

Create `src/renderer/components/widget/minimal-widget.tsx`:

```typescript
import { useScheduleStore } from '../../lib/schedule-store'
import { useJournalStore } from '../../lib/journal-store'
import { useState } from 'react'

export function MinimalWidget() {
  const { getTodayCommit, updateBlockCompletion } = useScheduleStore()
  const { addEntry } = useJournalStore()
  const [quickJournal, setQuickJournal] = useState('')
  
  const commit = getTodayCommit()
  const currentTime = new Date()
  const currentHour = currentTime.getHours()
  const currentMinute = currentTime.getMinutes()
  
  // Find current active block
  const activeBlock = commit?.blocks.find((block) => {
    const [startH, startM] = block.start.split(':').map(Number)
    const [endH, endM] = block.end.split(':').map(Number)
    const startTime = startH * 60 + startM
    const endTime = endH * 60 + endM
    const currentTimeMinutes = currentHour * 60 + currentMinute
    return currentTimeMinutes >= startTime && currentTimeMinutes < endTime
  })
  
  // Find next block
  const nextBlock = commit?.blocks.find((block) => {
    const [startH] = block.start.split(':').map(Number)
    const currentTimeMinutes = currentHour * 60 + currentMinute
    return startH * 60 > currentTimeMinutes
  })
  
  // Calculate today's adherence
  const completedBlocks = commit?.blocks.filter(b => b.completed === true).length || 0
  const totalBlocks = commit?.blocks.length || 0
  const adherence = totalBlocks > 0 ? Math.round((completedBlocks / totalBlocks) * 100) : 0
  
  // Calculate streak (simplified)
  const streak = 12 // TODO: Calculate from store
  
  const handleMarkComplete = () => {
    if (activeBlock) {
      updateBlockCompletion(activeBlock.id, true)
    }
  }
  
  const handleQuickJournal = () => {
    if (quickJournal.trim()) {
      addEntry({
        content: quickJournal,
        tags: [],
        is_sensitive: false,
        visibility: 'private'
      })
      setQuickJournal('')
    }
  }
  
  return (
    <div className="w-full h-full bg-background/95 backdrop-blur-lg rounded-lg border border-border shadow-xl p-4 text-foreground">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">⚡ Mindful OS</h2>
        <button 
          onClick={() => window.electronAPI?.window.close()}
          className="text-muted-foreground hover:text-foreground"
        >
          ×
        </button>
      </div>
      
      {/* Current Block */}
      {activeBlock ? (
        <div className="mb-4 p-3 bg-primary/10 border border-primary/30 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium">🎯 {activeBlock.identity}</span>
            <span className="text-xs text-muted-foreground">
              {activeBlock.start} - {activeBlock.end}
            </span>
          </div>
          {/* Time remaining calculation */}
          <div className="text-sm text-muted-foreground mb-3">
            ⏱️ {calculateTimeRemaining(activeBlock.end)} remaining
          </div>
          <button
            onClick={handleMarkComplete}
            disabled={activeBlock.completed === true}
            className="w-full py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
          >
            {activeBlock.completed ? '✓ Completed' : 'Mark Complete'}
          </button>
        </div>
      ) : (
        <div className="mb-4 p-3 bg-secondary/50 rounded-lg text-center text-muted-foreground">
          No active block
        </div>
      )}
      
      {/* Quick Journal */}
      <div className="mb-4">
        <textarea
          value={quickJournal}
          onChange={(e) => setQuickJournal(e.target.value)}
          placeholder="Quick journal entry..."
          rows={2}
          className="w-full p-2 bg-secondary border border-border rounded-md text-sm mb-2 resize-none"
        />
        <button
          onClick={handleQuickJournal}
          disabled={!quickJournal.trim()}
          className="w-full py-2 bg-secondary text-foreground rounded-md hover:bg-secondary/80 disabled:opacity-50"
        >
          📝 Save Journal
        </button>
      </div>
      
      {/* Stats */}
      <div className="mb-4 p-3 bg-secondary/30 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">Progress</span>
          <span className="text-sm font-medium">{adherence}%</span>
        </div>
        <div className="w-full bg-secondary rounded-full h-2 mb-2">
          <div 
            className="bg-primary h-2 rounded-full transition-all"
            style={{ width: `${adherence}%` }}
          />
        </div>
        <div className="text-xs text-muted-foreground">
          🔥 {streak} day streak
        </div>
      </div>
      
      {/* Next Block */}
      {nextBlock && (
        <div className="text-xs text-muted-foreground">
          Next: {nextBlock.identity} at {nextBlock.start}
        </div>
      )}
      
      {/* Open Full App */}
      <button
        onClick={() => window.electronAPI?.window.openMain()}
        className="w-full mt-4 py-2 text-sm text-muted-foreground hover:text-foreground border border-border rounded-md"
      >
        Open Full App →
      </button>
    </div>
  )
}

function calculateTimeRemaining(endTime: string): string {
  const [endH, endM] = endTime.split(':').map(Number)
  const now = new Date()
  const end = new Date()
  end.setHours(endH, endM, 0, 0)
  
  const diff = end.getTime() - now.getTime()
  if (diff <= 0) return '0m'
  
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  return `${minutes}m`
}
```

---

## 🚀 **Implementation Checklist**

### **Phase 1: Electron Setup**
- [ ] Install Electron dependencies
- [ ] Create `src/main/main.ts`
- [ ] Create `src/preload/preload.ts`
- [ ] Update `vite.config.ts`
- [ ] Update `package.json`
- [ ] Test app opens in Electron window

### **Phase 2: Menu Bar**
- [ ] Create tray icon asset
- [ ] Implement `createTray()` function
- [ ] Test tray icon appears in menu bar
- [ ] Add context menu
- [ ] Test click handlers

### **Phase 3: Widget Window**
- [ ] Create `createWidgetWindow()` function
- [ ] Position widget below tray icon
- [ ] Test widget opens/closes
- [ ] Handle auto-hide on blur
- [ ] Test multi-monitor positioning

### **Phase 4: Widget UI**
- [ ] Create `/widget` route in React
- [ ] Build `MinimalWidget` component
- [ ] Connect to stores
- [ ] Add one-tap actions
- [ ] Style with blur/transparency

### **Phase 5: Integration**
- [ ] Connect widget to IPC
- [ ] Update storage adapter for Electron
- [ ] Test all features work
- [ ] Polish UI/UX

---

## 🎯 **Next Steps**

Want me to:
1. **Start implementing** - Set up Electron foundation?
2. **Create widget component first** - Design the minimal UI?
3. **Both** - Full implementation?

Let me know and I'll start building! 🚀


