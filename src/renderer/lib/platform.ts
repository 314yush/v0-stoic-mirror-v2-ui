/**
 * Platform utilities for Electron transition
 * 
 * When Electron is added:
 * - window.electronAPI will be exposed via preload script
 * - Use IPC for file operations, native dialogs, etc.
 * - Check isElectron() before using browser-specific APIs
 */

export interface ElectronAPI {
  // Future IPC methods for Electron
  // saveFile: (path: string, content: string) => Promise<void>
  // loadFile: (path: string) => Promise<string>
  // showSaveDialog: (options: any) => Promise<string | null>
  // getAppPath: () => Promise<string>
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

