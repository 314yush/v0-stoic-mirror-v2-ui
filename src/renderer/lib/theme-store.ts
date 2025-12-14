import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import { storage } from "./storage"

type Theme = "dark" | "light" | "system"

interface ThemeState {
  theme: Theme
  resolvedTheme: "dark" | "light"  // The actual theme being applied
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

// Get system preference
function getSystemTheme(): "dark" | "light" {
  if (typeof window !== "undefined" && window.matchMedia) {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
  }
  return "dark"
}

// Apply theme to document
function applyTheme(resolved: "dark" | "light") {
  if (resolved === "dark") {
    document.documentElement.classList.add("dark")
    document.documentElement.classList.remove("light")
  } else {
    document.documentElement.classList.remove("dark")
    document.documentElement.classList.add("light")
  }
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: "system",
      resolvedTheme: getSystemTheme(),
      setTheme: (theme) => {
        const resolved = theme === "system" ? getSystemTheme() : theme
        set({ theme, resolvedTheme: resolved })
        applyTheme(resolved)
      },
      toggleTheme: () => {
        const current = get().theme
        // Cycle: system -> light -> dark -> system
        const next = current === "system" ? "light" : current === "light" ? "dark" : "system"
        get().setTheme(next)
      },
    }),
    {
      name: "theme_preference_v2",
      storage: createJSONStorage(() => zustandStorage),
      onRehydrateStorage: () => (state) => {
        if (state) {
          const resolved = state.theme === "system" ? getSystemTheme() : state.theme
          state.resolvedTheme = resolved
          applyTheme(resolved)
        }
      },
    }
  )
)

// Listen for system theme changes
if (typeof window !== "undefined" && window.matchMedia) {
  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
  
  mediaQuery.addEventListener("change", (e) => {
    const state = useThemeStore.getState()
    if (state.theme === "system") {
      const resolved = e.matches ? "dark" : "light"
      useThemeStore.setState({ resolvedTheme: resolved })
      applyTheme(resolved)
    }
  })
}

// Initialize theme on load
if (typeof window !== "undefined") {
  const savedTheme = storage.get<{ state: { theme: Theme } }>("theme_preference_v2")
  const theme = savedTheme?.state?.theme || "system"
  const resolved = theme === "system" ? getSystemTheme() : theme
  applyTheme(resolved)
}
