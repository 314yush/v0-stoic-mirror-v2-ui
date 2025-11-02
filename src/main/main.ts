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
    title: 'Stoic Mirror', // Set window title
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, '../preload/preload.cjs'),
    },
    show: false, // Don't show until ready
    icon: isDev 
      ? path.join(__dirname, '../../assets/icon.ico')
      : undefined, // Use bundled icon in production
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
    backgroundColor: '#00000000', // Fully transparent - let CSS handle glass effect
    vibrancy: process.platform === 'darwin' ? 'under-window' : undefined, // macOS blur effect - under-window for better glass effect
    icon: isDev 
      ? path.join(__dirname, '../../assets/icon.ico')
      : undefined, // Use bundled icon in production
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, '../preload/preload.cjs'),
      backgroundThrottling: false, // Ensure smooth animations
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
 * Destroy tray icon (if it exists)
 */
function destroyTray(): void {
  if (tray) {
    tray.destroy()
    tray = null
    console.log('Tray icon destroyed')
  }
}

/**
 * Create tray icon (menu bar)
 */
function createTray(): void {
  // Don't create if already exists
  if (tray) {
    console.log('🟡 Tray already exists, skipping creation')
    return
  }
  
  console.log('🟢 Creating tray icon...')
  console.log('Current __dirname:', __dirname)
  console.log('Current process.cwd():', process.cwd())
  // Try multiple possible paths for the icon
  // Prefer white/template icon for better menu bar appearance
  const possiblePaths = [
    // Try regular icon first (colored, more visible)
    path.join(__dirname, '../../assets/tray-icon.png'),
    path.join(process.cwd(), 'assets', 'tray-icon.png'),
    // Then try white icon (template, adapts to menu bar)
    path.join(__dirname, '../../assets/tray-icon-white.png'),
    path.join(process.cwd(), 'assets', 'tray-icon-white.png'),
    // If built from src/main, go up more levels
    path.join(__dirname, '../../../assets/tray-icon.png'),
    path.join(__dirname, '../../../assets/tray-icon-white.png'),
  ]

  let iconPath: string | null = null
  console.log('Searching for tray icon in paths:')
  for (const possiblePath of possiblePaths) {
    const exists = fs.existsSync(possiblePath)
    console.log(`  ${exists ? '✅' : '❌'} ${possiblePath}`)
    if (exists) {
      iconPath = possiblePath
      console.log('✅ Found tray icon at:', iconPath)
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
        // Only set as template if it's a white/transparent icon
        if (process.platform === 'darwin') {
          // Check if we're using the white icon (better for templates)
          const isWhiteIcon = iconPath && iconPath.includes('tray-icon-white')
          if (isWhiteIcon) {
            try {
              icon.setTemplateImage(true)
              console.log('✅ Icon set as template for macOS menu bar')
            } catch (e) {
              console.warn('⚠️ Could not set icon as template:', e)
            }
          } else {
            // For colored icons, don't set as template (will show as-is)
            console.log('✅ Using colored icon (not template)')
          }
        }
        
        // DEBUG: Icon details for troubleshooting
        console.log('🔍 Icon details:', {
          isEmpty: icon.isEmpty(),
          size: icon.getSize(),
          isTemplate: icon.isTemplateImage(),
        })
      }
    } catch (error) {
      console.error('Error loading icon:', error)
      icon = createFallbackIcon()
    }
  } else {
    console.warn('⚠️ Tray icon not found at any path, using fallback')
    icon = createFallbackIcon()
  }

  try {
    tray = new Tray(icon)
    console.log('✅ Tray object created')
  } catch (error) {
    console.error('❌ Failed to create Tray object:', error)
    return
  }
  
  // Set tooltip
  tray.setToolTip('Stoic Mirror - Click to open widget')
  tray.setIgnoreDoubleClickEvents(true)
  
  // Force tray to be visible - sometimes macOS hides it
  // Try setting context menu immediately to make it "active"
  try {
    // Create a minimal context menu to ensure tray appears
    const tempMenu = Menu.buildFromTemplate([
      { label: 'Loading...', enabled: false }
    ])
    // On macOS, setting context menu can help make tray visible
    if (process.platform === 'darwin') {
      // Don't set it as default menu, but the tray should still be visible
      console.log('✅ Tray configured for macOS')
    } else {
      tray.setContextMenu(tempMenu)
    }
  } catch (e) {
    console.warn('⚠️ Could not set temporary menu:', e)
  }
  
  // On macOS: left-click opens widget, right-click shows menu
  // Don't set context menu by default - handle clicks separately
  tray.on('click', (event, bounds) => {
    // Left click - open widget
    createWidgetWindow()
  })

  // Right-click context menu (only shows on right-click)
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open Stoic Mirror',
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

  // On macOS, we need to use 'right-click' event for context menu
  // On other platforms, context menu shows on right-click automatically
  if (process.platform === 'darwin') {
    tray.on('right-click', () => {
      tray?.popUpContextMenu(contextMenu)
    })
  } else {
    tray.setContextMenu(contextMenu)
  }
  
  console.log('✅ Tray icon created successfully and should be visible in menu bar')
  
  // Verify tray is actually visible
  try {
    const bounds = tray.getBounds()
    console.log('✅ Tray bounds:', bounds)
    console.log('✅ Tray tooltip: Stoic Mirror - Click to open widget')
    
    // Additional debugging info
    if (bounds.width === 0 || bounds.height === 0) {
      console.warn('⚠️ WARNING: Tray bounds show zero size - tray might not be visible!')
      console.warn('⚠️ This usually means macOS is hiding the icon or menu bar is full')
      console.warn('⚠️ Try: System Preferences > Dock & Menu Bar > Check menu bar visibility')
    }
    
    // Try to ensure tray is displayed - refresh icon
    console.log('🔍 Attempting to ensure tray visibility...')
    try {
      tray.setImage(icon)
      console.log('✅ Tray icon refreshed')
    } catch (e) {
      console.warn('⚠️ Could not refresh tray icon:', e)
    }
    
    // Alternative: If template icon isn't visible, try non-template
    if (icon.isTemplateImage() && (bounds.width === 0 || bounds.height === 0)) {
      console.log('⚠️ Template icon may not be visible, trying non-template fallback...')
      try {
        const regularIconPath = iconPath?.replace('tray-icon-white.png', 'tray-icon.png') || 
                                path.join(__dirname, '../../assets/tray-icon.png')
        if (fs.existsSync(regularIconPath)) {
          const regularIcon = nativeImage.createFromPath(regularIconPath)
          if (!regularIcon.isEmpty()) {
            const regSize = regularIcon.getSize()
            const finalIcon = (regSize.width > 32 || regSize.height > 32) 
              ? regularIcon.resize({ width: 22, height: 22 })
              : regularIcon
            tray.setImage(finalIcon)
            console.log('✅ Switched to non-template icon for better visibility')
          }
        }
      } catch (e) {
        console.warn('⚠️ Could not switch to non-template icon:', e)
      }
    }
  } catch (error) {
    console.error('❌ Error getting tray info:', error)
  }
}

/**
 * Create a fallback icon programmatically
 * Creates a simple philosopher bust silhouette for menu bar (white, template-compatible)
 */
function createFallbackIcon(): Electron.NativeImage {
  // Create a 22x22 icon (optimal for macOS menu bar)
  const size = 22
  const canvas = Buffer.alloc(size * size * 4) // RGBA
  
  // Draw a simple philosopher bust silhouette (white on transparent)
  const centerX = size / 2
  const headY = 7
  const headRadius = 4
  const neckWidth = 3
  const neckHeight = 4
  const shouldersY = size - 3
  
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4
      const dx = x - centerX
      const dy = y - headY
      
      // Head (circle)
      const headDist = Math.sqrt(dx * dx + dy * dy)
      if (headDist <= headRadius) {
        canvas[idx] = 255     // R (white)
        canvas[idx + 1] = 255 // G
        canvas[idx + 2] = 255 // B
        canvas[idx + 3] = 255 // A (fully opaque)
      }
      // Neck (rectangle)
      else if (y >= headY + headRadius && y < headY + headRadius + neckHeight) {
        if (Math.abs(dx) <= neckWidth / 2) {
          canvas[idx] = 255
          canvas[idx + 1] = 255
          canvas[idx + 2] = 255
          canvas[idx + 3] = 255
        }
      }
      // Shoulders (trapezoid)
      else if (y >= headY + headRadius + neckHeight && y < shouldersY) {
        const shoulderWidth = 6 - ((y - (headY + headRadius + neckHeight)) * 1.5) / (shouldersY - (headY + headRadius + neckHeight))
        if (Math.abs(dx) <= shoulderWidth / 2) {
          canvas[idx] = 255
          canvas[idx + 1] = 255
          canvas[idx + 2] = 255
          canvas[idx + 3] = 255
        }
      }
      // Transparent background
      else {
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
  
  // Widget toggle handler
  ipcMain.handle('widget:toggle', (_, enabled: boolean) => {
    console.log('📱 Widget toggle requested:', enabled)
    if (enabled) {
      // Ensure tray exists
      if (!tray) {
        console.log('✅ Creating tray (widget enabled)')
        createTray()
      } else {
        console.log('✅ Tray already exists (widget enabled)')
      }
    } else {
      // Only destroy if explicitly disabled
      if (tray) {
        console.log('❌ Destroying tray (widget disabled)')
        tray.destroy()
        tray = null
        // Also close widget window if open
        if (widgetWindow && !widgetWindow.isDestroyed()) {
          widgetWindow.close()
        }
      }
    }
  })
  
  // Debug handler - send tray status to renderer
  ipcMain.handle('tray:status', () => {
    try {
      const status = {
        exists: !!tray,
        isDestroyed: tray ? tray.isDestroyed() : true,
        tooltip: tray ? 'Stoic Mirror' : null, // Tooltip is set during creation
        bounds: tray && !tray.isDestroyed() ? tray.getBounds() : null,
      }
      console.log('📱 Tray status requested, returning:', status)
      return status
    } catch (error) {
      console.error('❌ Error getting tray status:', error)
      return {
        exists: false,
        isDestroyed: true,
        tooltip: null,
        bounds: null,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  })
  
  console.log('✅ All IPC handlers registered, including tray:status')
}

// Set app name (overrides Electron default)
app.setName('Stoic Mirror')

// App lifecycle
app.whenReady().then(() => {
  console.log('🚀 App ready, initializing...')
  console.log('Platform:', process.platform)
  console.log('isDev:', isDev)
  console.log('isPackaged:', app.isPackaged)
  
  // IMPORTANT: Set up IPC handlers FIRST before creating windows
  // This ensures handlers are registered before renderer tries to use them
  console.log('📡 Setting up IPC handlers...')
  setupIpcHandlers()
  console.log('✅ IPC handlers setup complete')
  
  // Always create tray icon on startup (default enabled)
  // Settings sync will handle disabling it if needed
  console.log('📱 Creating tray icon...')
  createTray()
  console.log('✅ Tray creation completed')
  
  // Don't create main window on startup - start with tray only
  // Main window will open when user clicks "Open Stoic Mirror" in context menu

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

