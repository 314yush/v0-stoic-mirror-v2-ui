import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import { storage } from "./storage"
import { useThemeStore } from "./theme-store"
import { sanitizeOllamaUrl } from "./url-validation"
import { syncUserSettings } from "./sync-service"

export interface UserGoals {
  northStar?: string // Free-form identity vision: "I want to become a person that's..."
  lifestyle: string[] // Selected lifestyle patterns
  preferences: string[] // Selected preferences
  otherLifestyle?: string // Free text if "Other" selected
  otherPreferences?: string
  routineNames: string[] // User's current routines (for canonical naming)
}

export interface UserSettings {
  aiProvider: "ollama" | "gemini"
  ollamaUrl: string
  ollamaModel: string
  geminiApiKey: string
  theme: "dark" | "light" | "system"
  widgetEnabled: boolean
  // Notification settings
  wakeUpTime: string // Format: "HH:MM" (24-hour), e.g. "07:00"
  wakeUpEnabled: boolean
  eveningWindDownTime: string // Format: "HH:MM" (24-hour), e.g. "22:00"
  eveningWindDownEnabled: boolean
  // Schedule commit settings
  commitCutoffTime: string // Format: "HH:MM" (24-hour), e.g. "22:00" - after this time, you can commit for next day
  // User goals and preferences
  userGoals?: UserGoals
  // Google Calendar settings
  googleCalendarAutoImport?: boolean // Auto-import events from Google Calendar
  googleCalendarExport?: boolean // Export Stoic Mirror blocks to Google Calendar
}

interface SettingsState {
  settings: UserSettings
  updateSettings: (updates: Partial<UserSettings>, skipSync?: boolean) => void
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
        widgetEnabled: true, // Widget enabled by default
        // Notification defaults
        wakeUpTime: "07:00",
        wakeUpEnabled: false,
        eveningWindDownTime: "22:00",
        eveningWindDownEnabled: true,
        // Schedule commit default
        commitCutoffTime: "22:00", // Default 10pm cutoff
        // User goals - optional, will be set during onboarding
        userGoals: {
          routineNames: [], // Required, will be set during onboarding
        },
      },
      updateSettings: (updates, skipSync = false) => {
        // Sanitize Ollama URL if provided
        const sanitizedUpdates = { ...updates }
        if (updates.ollamaUrl !== undefined) {
          sanitizedUpdates.ollamaUrl = sanitizeOllamaUrl(updates.ollamaUrl)
        }

        const newSettings = { ...get().settings, ...sanitizedUpdates }
        set({
          settings: newSettings,
        })
        
        // Also update theme if changed
        if (updates.theme) {
          const { setTheme } = useThemeStore.getState()
          setTheme(updates.theme)
        }
        // Notify main process about widget setting change
        if (updates.widgetEnabled !== undefined && window.electronAPI) {
          window.electronAPI.invoke('widget:toggle', updates.widgetEnabled).catch(console.error)
        }
        
        // Sync to Supabase in background (unless explicitly skipped)
        if (!skipSync) {
          syncUserSettings(newSettings).catch(console.error)
        }
      },
    }),
    {
      name: "user_settings_v1",
      storage: createJSONStorage(() => zustandStorage),
    }
  )
)

