import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import { storage } from "./storage"

type Theme = "dark" | "light"

interface ThemeState {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
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

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: "dark",
      setTheme: (theme) => {
        set({ theme })
        // Apply theme to document - Tailwind uses "dark" class for dark mode
        if (theme === "dark") {
          document.documentElement.classList.add("dark")
        } else {
          document.documentElement.classList.remove("dark")
        }
      },
      toggleTheme: () => {
        const newTheme = get().theme === "dark" ? "light" : "dark"
        get().setTheme(newTheme)
      },
    }),
    {
      name: "theme_preference_v1",
      storage: createJSONStorage(() => zustandStorage),
      onRehydrateStorage: () => (state) => {
        // Apply theme on rehydrate - Tailwind uses "dark" class for dark mode
        if (state?.theme === "dark") {
          document.documentElement.classList.add("dark")
        } else {
          document.documentElement.classList.remove("dark")
        }
      },
    }
  )
)

// Initialize theme on load
if (typeof window !== "undefined") {
  const savedTheme = storage.get<{ theme: Theme }>("theme_preference_v1")
  if (savedTheme?.theme === "dark") {
    document.documentElement.classList.add("dark")
  } else {
    document.documentElement.classList.remove("dark")
  }
}

