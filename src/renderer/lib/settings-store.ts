import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import { storage } from "./storage"
import { useThemeStore } from "./theme-store"
import { sanitizeOllamaUrl } from "./url-validation"

export interface UserSettings {
  aiProvider: "ollama" | "gemini"
  ollamaUrl: string
  ollamaModel: string
  geminiApiKey: string
  theme: "dark" | "light"
}

interface SettingsState {
  settings: UserSettings
  updateSettings: (updates: Partial<UserSettings>) => void
}

// Custom storage adapter for Zustand
const zustandStorage = {
  getItem: (name: string): string | null => {
    const value = storage.get(name)
    return value ? JSON.stringify(value) : null
  },
  setItem: (name: string, value: string): void => {
    storage.set(name, JSON.parse(value))
  },
  removeItem: (name: string): void => {
    storage.remove(name)
  },
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      settings: {
        aiProvider: "ollama",
        ollamaUrl: "http://localhost:11434",
        ollamaModel: "llama3.2:1b",
        geminiApiKey: "", // Users must enter their own API key - never bundle keys
        theme: "dark",
      },
      updateSettings: (updates) => {
        // Sanitize Ollama URL if provided
        const sanitizedUpdates = { ...updates }
        if (updates.ollamaUrl !== undefined) {
          sanitizedUpdates.ollamaUrl = sanitizeOllamaUrl(updates.ollamaUrl)
        }

        set({
          settings: { ...get().settings, ...sanitizedUpdates },
        })
        // Also update theme if changed
        if (updates.theme) {
          const { setTheme } = useThemeStore.getState()
          setTheme(updates.theme)
        }
      },
    }),
    {
      name: "user_settings_v1",
      storage: createJSONStorage(() => zustandStorage),
    }
  )
)

