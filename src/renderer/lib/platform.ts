/**
 * Platform utilities for Electron transition
 * 
 * When Electron is added:
 * - window.electronAPI will be exposed via preload script
 * - Use IPC for file operations, native dialogs, etc.
 * - Check isElectron() before using browser-specific APIs
 */

export interface ElectronAPI {
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
  onQuickAction: (callback: (action: string) => void) => void
  removeAllListeners: (channel: string) => void
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}

export function isElectron(): boolean {
  return typeof window !== "undefined" && window.electronAPI !== undefined
}

/**
 * Get platform info for debugging/logging
 */
export function getPlatformInfo(): { platform: "web" | "electron"; userAgent: string } {
  return {
    platform: isElectron() ? "electron" : "web",
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
  }
}

