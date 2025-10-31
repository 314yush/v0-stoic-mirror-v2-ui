import { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, screen } from 'electron'
import * as path from 'path'
import * as fs from 'fs'

// Check if we're in development mode
// In dev mode, use Vite dev server; otherwise use built files
// Default to dev mode if not packaged (typical for development)
const isDev = !app.isPackaged

let mainWindow: BrowserWindow | null = null
let widgetWindow: BrowserWindow | null = null
let tray: Tray | null = null

/**
 * Create the main application window
 */
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
      preload: path.join(__dirname, '../preload/preload.cjs'),
    },
    show: false, // Don't show until ready
  })

  // Load the app
  console.log('Environment check:', { 
    isDev, 
    isPackaged: app.isPackaged, 
    NODE_ENV: process.env.NODE_ENV 
  })
  
  if (isDev) {
    // Development: load from Vite dev server
    // Retry loading until Vite is ready
    const loadDevURL = () => {
      if (!mainWindow || mainWindow.isDestroyed()) return
      
      mainWindow.loadURL('http://localhost:5173').catch(() => {
        // Vite not ready yet, retry after 500ms
        setTimeout(loadDevURL, 500)
      })
    }
    
    // Start trying to load after a short delay
    setTimeout(loadDevURL, 1000)
    
    // DevTools are not auto-opened in production
    // To open manually: Cmd+Option+I (macOS) or Ctrl+Shift+I
  } else {
    // Production: load from built files
    const indexPath = path.join(__dirname, '../../dist/index.html')
    mainWindow.loadFile(indexPath).catch((err) => {
      console.error('Failed to load production file:', err)
    })
  }

  mainWindow.once('ready-to-show', () => {
    // Window will show when user explicitly opens it
    if (mainWindow) {
      mainWindow.show()
    }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

/**
 * Create widget popover window (opens from menu bar)
 */
function createWidgetWindow(): void {
  // Check if widget window exists and is not destroyed
  if (widgetWindow && !widgetWindow.isDestroyed()) {
    if (widgetWindow.isVisible()) {
      widgetWindow.hide()
      return
    } else {
      showWidget()
      return
    }
  }

  // If window was destroyed, set to null and create new one
  if (widgetWindow && widgetWindow.isDestroyed()) {
    widgetWindow = null
  }

  // Get tray icon position for positioning widget
  const { screen } = require('electron')
  const primaryDisplay = screen.getPrimaryDisplay()
  const { width: screenWidth } = primaryDisplay.workAreaSize
  
  // Default position (top-right) if tray not available
  let x = screenWidth - 340
  let y = 30

  widgetWindow = new BrowserWindow({
    width: 320,
    height: 420,
    x,
    y,
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
      preload: path.join(__dirname, '../preload/preload.cjs'),
    },
  })

  // Clean up reference when window is closed
  widgetWindow.on('closed', () => {
    widgetWindow = null
  })

  // Auto-hide when clicking outside or losing focus
  widgetWindow.on('blur', () => {
    // Don't auto-hide immediately - let user interact first
    // widgetWindow?.hide()
  })

  // Load widget route
  if (isDev) {
    widgetWindow.loadURL('http://localhost:5173/#/widget')
  } else {
    widgetWindow.loadFile(path.join(__dirname, '../../dist/index.html'), {
      hash: '#/widget',
    })
  }
}

/**
 * Show widget window positioned below tray icon
 */
function showWidget(): void {
  if (!widgetWindow || widgetWindow.isDestroyed()) {
    // Window was destroyed, create a new one
    createWidgetWindow()
    return
  }
  
  const { screen } = require('electron')
  const primaryDisplay = screen.getPrimaryDisplay()
  const { width: screenWidth } = primaryDisplay.workAreaSize
  
  // Try to get tray bounds
  let x = screenWidth - 340 // Default to top-right
  let y = 30
  
  if (tray) {
    try {
      const bounds = tray.getBounds()
      const display = screen.getDisplayNearestPoint({ x: bounds.x, y: bounds.y })
      x = bounds.x - 160 // Center 320px widget below icon
      y = bounds.y + bounds.height + 5 // Below tray icon
    } catch (e) {
      console.log('Could not get tray bounds:', e)
    }
  }
  
  widgetWindow.setPosition(x, y)
  widgetWindow.show()
}

/**
 * Create tray icon (menu bar)
 */
function createTray(): void {
  // Try multiple possible paths for the icon
  const possiblePaths = [
    // Development: from dist/main/ to assets/
    path.join(__dirname, '../../assets/tray-icon.png'),
    // Alternative: absolute path from project root
    path.join(process.cwd(), 'assets', 'tray-icon.png'),
    // If built from src/main, go up more levels
    path.join(__dirname, '../../../assets/tray-icon.png'),
  ]

  let iconPath: string | null = null
  for (const possiblePath of possiblePaths) {
    if (fs.existsSync(possiblePath)) {
      iconPath = possiblePath
      console.log('Found tray icon at:', iconPath)
      break
    }
  }

  let icon: Electron.NativeImage | null = null
  
  if (iconPath) {
    try {
      icon = nativeImage.createFromPath(iconPath)
      
      // Check if icon is empty (loading failed)
      if (icon.isEmpty()) {
        console.error('Icon loaded but is empty, creating fallback')
        icon = createFallbackIcon()
      } else {
        const sizes = icon.getSize()
        console.log('Icon loaded successfully, size:', sizes)
        
        // Resize large icons for better menu bar appearance
        // macOS tray icons work best at 16-22px @1x
        if (sizes.width > 32 || sizes.height > 32) {
          icon = icon.resize({ width: 22, height: 22 })
          console.log('Icon resized to 22x22')
        }
        
        // On macOS, tray icons should be template images (monochrome white/transparent)
        // Template images adapt to light/dark menu bars
        // Note: Colored icons won't work well as templates, but we'll try
        if (process.platform === 'darwin') {
          try {
            icon.setTemplateImage(true)
            console.log('Icon set as template for macOS menu bar')
          } catch (e) {
            console.warn('Could not set icon as template:', e)
          }
        }
      }
    } catch (error) {
      console.error('Error loading icon:', error)
      icon = createFallbackIcon()
    }
  } else {
    console.warn('Tray icon not found at any path, using fallback')
    icon = createFallbackIcon()
  }

  tray = new Tray(icon)
  
  // Set tooltip
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
      label: 'Show Widget',
      click: () => {
        createWidgetWindow()
      },
    },
    {
      label: 'Quick Journal',
      click: () => {
        // Ensure widget window exists and is not destroyed
        if (!widgetWindow || widgetWindow.isDestroyed()) {
          createWidgetWindow()
        }
        // Send IPC message to widget to open journal input
        if (widgetWindow && !widgetWindow.isDestroyed()) {
          widgetWindow.webContents.send('quick-action', 'journal')
          if (!widgetWindow.isVisible()) {
            showWidget()
          }
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
  
  console.log('Tray icon created successfully')
}

/**
 * Create a fallback icon programmatically
 */
function createFallbackIcon(): Electron.NativeImage {
  // Create a simple 16x16 icon with a circle/dot
  const size = 16
  const canvas = Buffer.alloc(size * size * 4) // RGBA
  
  // Draw a simple circle (for macOS menu bar)
  const center = size / 2
  const radius = 5
  
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4
      const dx = x - center
      const dy = y - center
      const dist = Math.sqrt(dx * dx + dy * dy)
      
      if (dist <= radius) {
        // White circle with alpha
        canvas[idx] = 255     // R
        canvas[idx + 1] = 255 // G
        canvas[idx + 2] = 255 // B
        canvas[idx + 3] = 255 // A
      } else {
        // Transparent
        canvas[idx] = 0
        canvas[idx + 1] = 0
        canvas[idx + 2] = 0
        canvas[idx + 3] = 0
      }
    }
  }
  
  const icon = nativeImage.createFromBuffer(canvas, {
    width: size,
    height: size,
  })
  
  if (process.platform === 'darwin') {
    icon.setTemplateImage(true)
  }
  
  return icon
}

/**
 * Set up IPC handlers for renderer process
 */
function setupIpcHandlers(): void {
  // Storage handlers (for future Electron storage adapter)
  ipcMain.handle('storage:get', async (_, key: string) => {
    // For now, just return null - we'll implement with electron-store later
    return null
  })
  
  ipcMain.handle('storage:set', async (_, key: string, value: any) => {
    // For now, no-op - we'll implement with electron-store later
  })
  
  ipcMain.handle('storage:remove', async (_, key: string) => {
    // For now, no-op - we'll implement with electron-store later
  })
  
  // Window management handlers
  ipcMain.handle('window:close', () => {
    const focusedWindow = BrowserWindow.getFocusedWindow()
    if (focusedWindow) {
      focusedWindow.close()
    }
  })
  
  ipcMain.handle('window:minimize', () => {
    const focusedWindow = BrowserWindow.getFocusedWindow()
    if (focusedWindow) {
      focusedWindow.minimize()
    }
  })
  
  ipcMain.handle('window:openMain', () => {
    if (mainWindow) {
      mainWindow.show()
      mainWindow.focus()
    } else {
      createMainWindow()
    }
  })
  
  // Handle quick actions from widget
  ipcMain.on('quick-action', (_, action: string) => {
    console.log('Quick action:', action)
    // Handle quick actions here if needed
  })
}

// App lifecycle
app.whenReady().then(() => {
  setupIpcHandlers()
  createTray() // Create tray icon first (app starts in menu bar)
  // Don't create main window on startup - start with tray only
  // Main window will open when user clicks "Open Mindful OS" in context menu

  app.on('activate', () => {
    // macOS: re-create window when dock icon is clicked
    if (mainWindow === null) {
      createMainWindow()
    } else {
      mainWindow.show()
      mainWindow.focus()
    }
  })
})

app.on('window-all-closed', () => {
  // macOS: Keep app running even when windows are closed
  // App stays alive in menu bar via tray icon
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  // Clean up
  widgetWindow?.destroy()
  mainWindow?.destroy()
})

