/**
 * Storage abstraction layer
 * 
 * Currently uses localStorage (web app mode)
 * Easy transition to file-based storage in Electron:
 * - Replace with Electron's fs APIs or electron-store
 * - Main process can handle file I/O, renderer communicates via IPC
 */

import { isElectron } from "./platform"

export interface StorageAdapter {
  get<T>(key: string): T | null
  set<T>(key: string, value: T): void
  remove(key: string): void
  clear(): void
}

class LocalStorageAdapter implements StorageAdapter {
  get<T>(key: string): T | null {
    try {
      const item = localStorage.getItem(key)
      return item ? JSON.parse(item) : null
    } catch {
      return null
    }
  }

  set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch (error: any) {
      // Handle quota exceeded errors specifically
      if (error?.name === "QuotaExceededError" || error?.code === 22) {
        console.error(`Storage quota exceeded for key "${key}". Attempting cleanup...`)
        
        // Try to clear sync queue if that's what's causing the issue
        if (key === "sync_queue") {
          try {
            // Clear old items from sync queue
            const queue = this.get<any[]>("sync_queue") || []
            const now = Date.now()
            const cleaned = queue.filter((item: any) => {
              const age = now - (item.timestamp || 0)
              return age < 7 * 24 * 60 * 60 * 1000 // Keep only last 7 days
            })
            
            if (cleaned.length < queue.length) {
              // Retry with cleaned queue
              localStorage.setItem(key, JSON.stringify(cleaned))
              console.log(`Cleaned sync queue: ${queue.length} -> ${cleaned.length} items`)
              return
            }
          } catch (cleanupError) {
            // If cleanup fails, remove the key entirely
            console.warn("Cleanup failed, removing sync queue")
            this.remove(key)
          }
        }
        
        // If still failing, log and don't crash
        console.error(`Storage set failed after cleanup for key "${key}":`, error)
      } else {
        console.error("Storage set failed:", error)
      }
    }
  }

  remove(key: string): void {
    localStorage.removeItem(key)
  }

  clear(): void {
    localStorage.clear()
  }
}

// Storage adapter - easy to swap for Electron file-based storage later
let storageAdapter: StorageAdapter = new LocalStorageAdapter()

/**
 * Switch to Electron storage adapter when transitioning
 * Example for future:
 * 
 * if (isElectron()) {
 *   storageAdapter = new ElectronStorageAdapter(window.electronAPI)
 * }
 */
export function setStorageAdapter(adapter: StorageAdapter) {
  storageAdapter = adapter
}

export const storage = {
  get: <T>(key: string): T | null => storageAdapter.get<T>(key),
  set: <T>(key: string, value: T): void => storageAdapter.set(key, value),
  remove: (key: string): void => storageAdapter.remove(key),
  clear: (): void => storageAdapter.clear(),
}
