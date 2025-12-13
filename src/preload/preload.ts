import { contextBridge, ipcRenderer } from 'electron'

/**
 * Expose safe APIs to renderer process
 * This is the bridge between Electron main process and React app
 */
contextBridge.exposeInMainWorld('electronAPI', {
  // Platform detection
  platform: process.platform,
  
  // Storage operations (for future Electron storage adapter)
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
  
  // Widget management
  invoke: (channel: string, ...args: any[]) => ipcRenderer.invoke(channel, ...args),
  
  // Notifications
  notification: {
    show: (title: string, body: string, icon?: string) => 
      ipcRenderer.invoke('notification:show', { title, body, icon }),
  },
  
  // Updates
  update: {
    check: () => ipcRenderer.invoke('update:check'),
    install: () => ipcRenderer.invoke('update:install'),
    onUpdateAvailable: (callback: (version: string) => void) => {
      ipcRenderer.on('update-available', (_, version) => callback(version))
    },
    onUpdateProgress: (callback: (percent: number) => void) => {
      ipcRenderer.on('update-progress', (_, percent) => callback(percent))
    },
    onUpdateDownloaded: (callback: (version: string) => void) => {
      ipcRenderer.on('update-downloaded', (_, version) => callback(version))
    },
  },
  
  // Quick actions from menu bar
  onQuickAction: (callback: (action: string) => void) => {
    ipcRenderer.on('quick-action', (_, action) => callback(action))
  },
  
  // Remove listeners (cleanup)
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel)
  },
  
  // OAuth handlers for Google Calendar
  oauth: {
    openExternal: (url: string) => ipcRenderer.invoke('oauth:openExternal', url),
    startCallbackServer: () => ipcRenderer.invoke('oauth:startCallbackServer'),
    waitForCallback: () => ipcRenderer.invoke('oauth:waitForCallback'),
    stopServer: () => ipcRenderer.invoke('oauth:stopServer'),
  },
})

// Type declaration for TypeScript
declare global {
  interface Window {
    electronAPI?: {
      platform: string
      storage: {
        get: (key: string) => Promise<any>
        set: (key: string, value: any) => Promise<void>
        remove: (key: string) => Promise<void>
      }
      window: {
        close: () => Promise<void>
        minimize: () => Promise<void>
        openMain: () => Promise<void>
      }
      invoke: (channel: string, ...args: any[]) => Promise<any>
      notification: {
        show: (title: string, body: string, icon?: string) => Promise<boolean>
      }
      update: {
        check: () => Promise<any>
        install: () => Promise<any>
        onUpdateAvailable: (callback: (version: string) => void) => void
        onUpdateProgress: (callback: (percent: number) => void) => void
        onUpdateDownloaded: (callback: (version: string) => void) => void
      }
      onQuickAction: (callback: (action: string) => void) => void
      removeAllListeners: (channel: string) => void
      oauth: {
        openExternal: (url: string) => Promise<boolean>
        startCallbackServer: () => Promise<{ port: number }>
        waitForCallback: () => Promise<{ code: string; error?: string }>
        stopServer: () => Promise<boolean>
      }
    }
  }
}


