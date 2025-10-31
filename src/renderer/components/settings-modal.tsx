import { useState, useEffect } from "react"
import { useSettingsStore } from "../lib/settings-store"
import { useThemeStore } from "../lib/theme-store"
import { useToastStore } from "./toasts"

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { settings, updateSettings } = useSettingsStore()
  const { theme, setTheme } = useThemeStore()
  const { addToast } = useToastStore()
  const [localSettings, setLocalSettings] = useState(settings)

  useEffect(() => {
    if (isOpen) {
      setLocalSettings(settings)
    }
  }, [isOpen, settings])

  if (!isOpen) return null

  const handleSave = () => {
    updateSettings(localSettings)
    if (localSettings.theme !== theme) {
      setTheme(localSettings.theme)
    }
    addToast("Settings saved")
    onClose()
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-foreground">Settings</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Theme Toggle */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-3">Theme</label>
            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  setLocalSettings({ ...localSettings, theme: "dark" })
                  setTheme("dark")
                }}
                className={`px-4 py-2 rounded-md transition-colors ${
                  localSettings.theme === "dark"
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                Dark
              </button>
              <button
                onClick={() => {
                  setLocalSettings({ ...localSettings, theme: "light" })
                  setTheme("light")
                }}
                className={`px-4 py-2 rounded-md transition-colors ${
                  localSettings.theme === "light"
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                Light
              </button>
            </div>
          </div>

          {/* AI Provider Preference */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-3">
              Preferred AI Provider
            </label>
            <select
              value={localSettings.aiProvider}
              onChange={(e) =>
                setLocalSettings({
                  ...localSettings,
                  aiProvider: e.target.value as "ollama" | "gemini",
                })
              }
              className="w-full px-3 py-2 bg-secondary border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="ollama">Ollama (Local - Recommended)</option>
              <option value="gemini">Gemini (Cloud Fallback)</option>
            </select>
            <p className="text-xs text-muted-foreground mt-2">
              If Ollama is unavailable, the app will automatically fallback to Gemini
            </p>
          </div>

          {/* Ollama Configuration */}
          {localSettings.aiProvider === "ollama" && (
            <>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Ollama URL
                </label>
                <input
                  type="text"
                  value={localSettings.ollamaUrl}
                  onChange={(e) =>
                    setLocalSettings({ ...localSettings, ollamaUrl: e.target.value })
                  }
                  placeholder="http://localhost:11434"
                  className="w-full px-3 py-2 bg-secondary border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Ollama Model
                </label>
                <input
                  type="text"
                  value={localSettings.ollamaModel}
                  onChange={(e) =>
                    setLocalSettings({ ...localSettings, ollamaModel: e.target.value })
                  }
                  placeholder="gemma3:4b"
                  className="w-full px-3 py-2 bg-secondary border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </>
          )}

          {/* Gemini API Key (if using Gemini) */}
          {localSettings.aiProvider === "gemini" && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Gemini API Key
              </label>
              <input
                type="password"
                value={localSettings.geminiApiKey}
                onChange={(e) =>
                  setLocalSettings({ ...localSettings, geminiApiKey: e.target.value })
                }
                placeholder="Enter your Gemini API key"
                className="w-full px-3 py-2 bg-secondary border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Get your API key from{" "}
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Google AI Studio
                </a>
                <br />
                Using Gemini 2.5 Flash (from official docs)
              </p>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

