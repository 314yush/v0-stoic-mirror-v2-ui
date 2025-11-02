import { useState, useEffect } from "react"
import { useSettingsStore } from "../lib/settings-store"
import { useThemeStore } from "../lib/theme-store"
import { useToastStore } from "./toasts"
import { useAuthStore } from "../lib/auth-store"
import { validateOllamaUrl } from "../lib/url-validation"
import { getSetupStatus, testOllamaConnection } from "../lib/setup-detection"
import { isSupabaseConfigured } from "../lib/supabase"
import type { SetupStatus } from "../lib/setup-detection"

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { settings, updateSettings } = useSettingsStore()
  const { theme, setTheme } = useThemeStore()
  const { addToast } = useToastStore()
  const { pullAndMergeData } = useAuthStore()
  const [localSettings, setLocalSettings] = useState(settings)
  const [setupStatus, setSetupStatus] = useState<SetupStatus | null>(null)
  const [checkingOllama, setCheckingOllama] = useState(false)
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setLocalSettings(settings)
      // Auto-detect Ollama when settings open
      getSetupStatus().then(setSetupStatus)
    }
  }, [isOpen, settings])

  const handleTestOllama = async () => {
    setCheckingOllama(true)
    const url = localSettings.ollamaUrl || "http://localhost:11434"
    const result = await testOllamaConnection(url)
    setCheckingOllama(false)
    
    if (result.success) {
      addToast("✅ Ollama is running!", "success")
    } else {
      addToast(result.error || "❌ Cannot connect to Ollama", "error")
    }
    
    // Refresh status
    setTimeout(() => getSetupStatus().then(setSetupStatus), 500)
  }

  const handleSyncNow = async () => {
    if (!isSupabaseConfigured()) {
      addToast("Supabase not configured - cannot sync", "error")
      return
    }
    
    setSyncing(true)
    try {
      await pullAndMergeData()
      addToast("✅ Data synced from server", "success")
      await getSetupStatus().then(setSetupStatus) // Refresh status
    } catch (error) {
      console.error("Sync error:", error)
      addToast("❌ Sync failed - check console for details", "error")
    } finally {
      setSyncing(false)
    }
  }

  if (!isOpen) return null

  const handleSave = () => {
    // Validate Ollama URL if provided
    if (localSettings.aiProvider === "ollama" && localSettings.ollamaUrl) {
      const validation = validateOllamaUrl(localSettings.ollamaUrl)
      if (!validation.valid) {
        addToast(validation.error || "Invalid Ollama URL", "error")
        return
      }
    }

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
          {/* Setup Status Overview */}
          <div className="border border-border rounded-lg p-4 space-y-3 bg-secondary/20">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-foreground text-sm">Setup Status</h3>
              {isSupabaseConfigured() && (
                <button
                  onClick={handleSyncNow}
                  disabled={syncing}
                  className="btn btn-xs btn-secondary"
                  title="Sync data from server"
                >
                  {syncing ? "Syncing..." : "🔄 Sync Now"}
                </button>
              )}
            </div>
            
            {/* Supabase */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Backend (Supabase):</span>
              <span className={isSupabaseConfigured() ? "text-primary font-medium" : "text-muted-foreground"}>
                {isSupabaseConfigured() ? "✅ Configured" : "⚠️ Not Set"}
              </span>
            </div>

            {/* Ollama */}
            {setupStatus && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">AI (Ollama):</span>
                <span className={setupStatus.ollama.running ? "text-primary font-medium" : "text-muted-foreground"}>
                  {setupStatus.ollama.running ? "✅ Running" : "⚠️ Not Running"}
                </span>
              </div>
            )}

            {/* Gemini */}
            {setupStatus && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">AI (Gemini):</span>
                <span className={setupStatus.gemini.configured ? "text-primary font-medium" : "text-muted-foreground"}>
                  {setupStatus.gemini.configured ? "✅ Configured" : "⚠️ Not Set"}
                </span>
              </div>
            )}
          </div>

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
              className="input"
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
                  onBlur={(e) => {
                    // Validate on blur
                    if (e.target.value) {
                      const validation = validateOllamaUrl(e.target.value)
                      if (!validation.valid) {
                        addToast(validation.error || "Invalid URL", "error")
                      }
                    }
                  }}
                  placeholder="http://localhost:11434"
                  className="input"
                />
                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs text-muted-foreground">
                    Must be localhost or 127.0.0.1 (local only for security)
                  </p>
                  <button
                    type="button"
                    onClick={handleTestOllama}
                    disabled={checkingOllama}
                    className="btn btn-xs btn-secondary"
                  >
                    {checkingOllama ? "Checking..." : "Test Connection"}
                  </button>
                </div>
                {setupStatus && !setupStatus.ollama.running && (
                  <p className="text-xs text-primary mt-1">
                    💡 Tip: Install Ollama from <a href="https://ollama.ai" target="_blank" rel="noopener noreferrer" className="underline">ollama.ai</a> and run <code className="bg-secondary px-1 rounded">ollama serve</code>
                  </p>
                )}
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
                  className="input"
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
                className="input"
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

          {/* Widget Toggle */}
          <div className="border-t border-border pt-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <label className="block text-sm font-medium text-foreground mb-1">
                  Menu Bar Widget
                </label>
                <p className="text-xs text-muted-foreground">
                  Show widget icon in menu bar for quick access to your schedule and journal
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer ml-4">
                <input
                  type="checkbox"
                  checked={localSettings.widgetEnabled}
                  onChange={(e) => {
                    setLocalSettings({ ...localSettings, widgetEnabled: e.target.checked })
                  }}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-secondary peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <button
              onClick={onClose}
              className="btn-ghost btn-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="btn btn-primary btn-sm"
            >
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

