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
  
  // Quick actions from menu bar
  onQuickAction: (callback: (action: string) => void) => {
    ipcRenderer.on('quick-action', (_, action) => callback(action))
  },
  
  // Remove listeners (cleanup)
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel)
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
      onQuickAction: (callback: (action: string) => void) => void
      removeAllListeners: (channel: string) => void
    }
  }
}


