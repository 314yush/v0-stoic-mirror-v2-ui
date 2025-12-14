import { useState, useEffect } from "react"
import { useSettingsStore, type UserGoals } from "../lib/settings-store"
import { useThemeStore } from "../lib/theme-store"
import { useToastStore } from "./toasts"
import { useAuthStore } from "../lib/auth-store"
import { validateOllamaUrl } from "../lib/url-validation"
import { getSetupStatus, testOllamaConnection } from "../lib/setup-detection"
import { isSupabaseConfigured } from "../lib/supabase"
import type { SetupStatus } from "../lib/setup-detection"
import { 
  isGoogleCalendarConfigured, 
  generateAuthUrl, 
  exchangeCodeForTokens, 
  getValidAccessTokenForAccount,
  loadAccounts,
  saveAccount,
  removeAccount,
  getUserInfo,
  revokeAccess,
  type GoogleAccount
} from "../lib/google-oauth-electron"
import { pushGoogleAccountsToSupabase, removeGoogleAccountFromSupabase } from "../lib/google-accounts-sync"

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
  onShowTutorial?: () => void
}

type SettingsTab = "general" | "identity" | "calendar" | "ai"

export function SettingsModal({ isOpen, onClose, onShowTutorial }: SettingsModalProps) {
  const { settings, updateSettings } = useSettingsStore()
  const { theme, setTheme } = useThemeStore()
  const { addToast } = useToastStore()
  const { pullAndMergeData } = useAuthStore()
  
  const [activeTab, setActiveTab] = useState<SettingsTab>("general")
  const [localSettings, setLocalSettings] = useState(settings)
  const [setupStatus, setSetupStatus] = useState<SetupStatus | null>(null)
  const [checkingOllama, setCheckingOllama] = useState(false)
  const [saved, setSaved] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  
  // Google Calendar state
  const [connectedAccounts, setConnectedAccounts] = useState<GoogleAccount[]>([])
  const [connectingGoogleCalendar, setConnectingGoogleCalendar] = useState(false)
  
  // Identity state
  const [northStar, setNorthStar] = useState(settings.userGoals?.northStar || "")

  useEffect(() => {
    if (isOpen) {
      setLocalSettings(settings)
      setNorthStar(settings.userGoals?.northStar || "")
      getSetupStatus().then(setSetupStatus)
      setConnectedAccounts(loadAccounts())
      setSaved(false)
      setHasChanges(false)
    }
  }, [isOpen, settings])

  // Track changes
  useEffect(() => {
    const settingsChanged = JSON.stringify(localSettings) !== JSON.stringify(settings)
    const northStarChanged = northStar !== (settings.userGoals?.northStar || "")
    setHasChanges(settingsChanged || northStarChanged)
    setSaved(false)
  }, [localSettings, northStar, settings])

  const accountColors = ['#4285f4', '#ea4335', '#34a853', '#fbbc04', '#673ab7']

  const handleConnectGoogleCalendar = async () => {
    if (!isGoogleCalendarConfigured()) {
      addToast("Google Calendar not configured", "error")
      return
    }
    
    setConnectingGoogleCalendar(true)
    try {
      await window.electronAPI?.oauth.startCallbackServer()
      const authUrl = generateAuthUrl()
      await window.electronAPI?.oauth.openExternal(authUrl)
      
      const result = await window.electronAPI?.oauth.waitForCallback()
      
      if (result?.code) {
        const tokens = await exchangeCodeForTokens(result.code)
        const userInfo = await getUserInfo(tokens.access_token)
        
        const existingAccounts = loadAccounts()
        if (existingAccounts.some(a => a.email === userInfo.email)) {
          addToast(`${userInfo.email} is already connected`, "info")
          return
        }
        
        const newAccount: GoogleAccount = {
          id: userInfo.email,
          email: userInfo.email,
          name: userInfo.name,
          picture: userInfo.picture,
          tokens,
          label: existingAccounts.length === 0 ? 'Personal' : 'Work',
          color: accountColors[existingAccounts.length % accountColors.length],
        }
        
        saveAccount(newAccount)
        setConnectedAccounts(loadAccounts())
        addToast(`Connected ${userInfo.email}`, "success")
        
        // Sync to Supabase in background
        pushGoogleAccountsToSupabase().catch(console.error)
      }
    } catch (error) {
      addToast("Failed to connect", "error")
    } finally {
      setConnectingGoogleCalendar(false)
      await window.electronAPI?.oauth.stopServer()
    }
  }

  const handleDisconnectAccount = async (email: string) => {
    try {
      const token = await getValidAccessTokenForAccount(email)
      if (token) await revokeAccess(token)
    } catch {}
    removeAccount(email)
    setConnectedAccounts(loadAccounts())
    addToast(`Disconnected ${email}`, "success")
    
    // Remove from Supabase in background
    removeGoogleAccountFromSupabase(email).catch(console.error)
  }

  const handleTestOllama = async () => {
    setCheckingOllama(true)
    const result = await testOllamaConnection(localSettings.ollamaUrl || "http://localhost:11434")
    setCheckingOllama(false)
    addToast(result.success ? "Ollama is running!" : "Cannot connect to Ollama", result.success ? "success" : "error")
    getSetupStatus().then(setSetupStatus)
  }

  const handleSave = () => {
    if (localSettings.aiProvider === "ollama" && localSettings.ollamaUrl) {
      const validation = validateOllamaUrl(localSettings.ollamaUrl)
      if (!validation.valid) {
        addToast(validation.error || "Invalid Ollama URL", "error")
        return
      }
    }

    const userGoals: UserGoals = {
      northStar: northStar.trim() || undefined,
      lifestyle: settings.userGoals?.lifestyle || [],
      preferences: settings.userGoals?.preferences || [],
      otherLifestyle: settings.userGoals?.otherLifestyle,
      otherPreferences: settings.userGoals?.otherPreferences,
      routineNames: settings.userGoals?.routineNames || [],
    }

    updateSettings({ ...localSettings, userGoals })
    if (localSettings.theme !== theme) {
      setTheme(localSettings.theme)
    }
    setSaved(true)
    setHasChanges(false)
  }

  if (!isOpen) return null

  const tabs: { id: SettingsTab; label: string }[] = [
    { id: "general", label: "General" },
    { id: "identity", label: "Identity" },
    { id: "calendar", label: "Calendar" },
    { id: "ai", label: "AI" },
  ]

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div 
        className="bg-card border border-border rounded-xl w-full max-w-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Settings</h2>
          <div className="flex items-center gap-2">
            {onShowTutorial && (
              <button
                onClick={() => {
                  onShowTutorial()
                  onClose()
                }}
                className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-secondary transition-colors"
              >
                Tutorial
              </button>
            )}
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-lg">✕</button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border px-5">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeTab === tab.id
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-5 max-h-[60vh] overflow-y-auto">
          {/* General Tab */}
          {activeTab === "general" && (
            <div className="space-y-6">
              {/* Theme */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Theme</label>
                <div className="flex gap-2">
                  {(["system", "light", "dark"] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => {
                        setLocalSettings({ ...localSettings, theme: t })
                        setTheme(t)
                      }}
                      className={`px-4 py-2 rounded-lg text-sm capitalize transition-colors ${
                        localSettings.theme === t
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reminders */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-foreground">Reminders</h3>
                
                {/* Morning */}
                <div className="bg-secondary/30 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm text-foreground">Morning check-in</div>
                    <Toggle
                      checked={localSettings.wakeUpEnabled}
                      onChange={(v) => setLocalSettings({ ...localSettings, wakeUpEnabled: v })}
                    />
                  </div>
                  {localSettings.wakeUpEnabled && (
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs text-muted-foreground">Time:</span>
                      <input
                        type="time"
                        value={localSettings.wakeUpTime}
                        onChange={(e) => setLocalSettings({ ...localSettings, wakeUpTime: e.target.value })}
                        className="text-sm bg-background border border-border rounded px-2 py-1"
                      />
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">
                    {localSettings.wakeUpEnabled 
                      ? "You'll get a reminder to review today's schedule" 
                      : "Enable to get morning schedule reminders"}
                  </p>
                </div>

                {/* Evening */}
                <div className="bg-secondary/30 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm text-foreground">Evening planning</div>
                    <Toggle
                      checked={localSettings.eveningWindDownEnabled}
                      onChange={(v) => setLocalSettings({ ...localSettings, eveningWindDownEnabled: v })}
                    />
                  </div>
                  {localSettings.eveningWindDownEnabled && (
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs text-muted-foreground">Time:</span>
                      <input
                        type="time"
                        value={localSettings.eveningWindDownTime}
                        onChange={(e) => setLocalSettings({ ...localSettings, eveningWindDownTime: e.target.value })}
                        className="text-sm bg-background border border-border rounded px-2 py-1"
                      />
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">
                    {localSettings.eveningWindDownEnabled 
                      ? "You'll get a reminder to plan tomorrow" 
                      : "Enable to get evening planning reminders"}
                  </p>
                </div>
              </div>

              {/* Schedule */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Day transition</label>
                <div className="flex items-center gap-3">
                  <input
                    type="time"
                    value={localSettings.commitCutoffTime}
                    onChange={(e) => setLocalSettings({ ...localSettings, commitCutoffTime: e.target.value })}
                    className="bg-secondary border border-border rounded-lg px-3 py-2 text-sm"
                  />
                  <span className="text-xs text-muted-foreground">
                    After this, commits are for tomorrow
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Identity Tab */}
          {activeTab === "identity" && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">North Star Identity</label>
                <p className="text-xs text-muted-foreground mb-3">
                  Who are you becoming? This shapes your habits and insights.
                </p>
                <textarea
                  value={northStar}
                  onChange={(e) => setNorthStar(e.target.value)}
                  placeholder="e.g., I want to become a world-class athlete, successful founder, and lifelong learner..."
                  className="w-full bg-secondary border border-border rounded-lg px-4 py-3 text-sm resize-none placeholder:text-muted-foreground/50"
                  rows={4}
                />
              </div>
              
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                <div className="text-xs text-foreground">
                  <strong>Tip:</strong> Include identities like <span className="text-primary">"athlete"</span>, <span className="text-primary">"founder"</span>, <span className="text-primary">"creator"</span> to unlock habit categories.
                </div>
              </div>
            </div>
          )}

          {/* Calendar Tab */}
          {activeTab === "calendar" && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-3">Google Calendar</label>
                
                {connectedAccounts.length === 0 ? (
                  <div className="bg-secondary/30 rounded-lg p-6 text-center">
                    <div className="text-2xl mb-2">📅</div>
                    <p className="text-sm text-muted-foreground mb-1">No accounts connected</p>
                    <p className="text-xs text-muted-foreground">Connect to see your events in the timeline</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {connectedAccounts.map((account) => (
                      <div key={account.email} className="flex items-center justify-between bg-secondary/30 rounded-lg px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-2.5 h-2.5 rounded-full" 
                            style={{ backgroundColor: account.color || '#4285f4' }} 
                          />
                          <div>
                            <div className="text-sm text-foreground">{account.email}</div>
                            <div className="text-xs text-muted-foreground">{account.label}</div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDisconnectAccount(account.email)}
                          className="text-xs text-muted-foreground hover:text-red-500 transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                
                <button
                  onClick={handleConnectGoogleCalendar}
                  disabled={connectingGoogleCalendar || !isGoogleCalendarConfigured()}
                  className="mt-3 w-full bg-secondary hover:bg-secondary/80 text-foreground rounded-lg px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {connectingGoogleCalendar ? "Connecting..." : "+ Add Google Account"}
                </button>
                
                {!isGoogleCalendarConfigured() && (
                  <p className="text-xs text-amber-500 mt-2">
                    Requires Google OAuth credentials in .env
                  </p>
                )}
              </div>

              {connectedAccounts.length > 0 && (
                <div className="bg-secondary/30 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-foreground">Auto-import events</div>
                      <div className="text-xs text-muted-foreground">Show calendar events in timeline</div>
                    </div>
                    <Toggle
                      checked={localSettings.googleCalendarAutoImport ?? true}
                      onChange={(v) => setLocalSettings({ ...localSettings, googleCalendarAutoImport: v })}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* AI Tab */}
          {activeTab === "ai" && (
            <div className="space-y-4">
              {/* Status */}
              <div className="bg-secondary/30 rounded-lg p-4">
                <div className="text-sm font-medium text-foreground mb-3">Status</div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Ollama (local)</span>
                    <span className={`flex items-center gap-1.5 ${setupStatus?.ollama.running ? "text-green-500" : "text-muted-foreground"}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${setupStatus?.ollama.running ? "bg-green-500" : "bg-muted-foreground/50"}`} />
                      {setupStatus?.ollama.running ? "Running" : "Not running"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Gemini (cloud)</span>
                    <span className={`flex items-center gap-1.5 ${setupStatus?.gemini.configured ? "text-green-500" : "text-muted-foreground"}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${setupStatus?.gemini.configured ? "bg-green-500" : "bg-muted-foreground/50"}`} />
                      {setupStatus?.gemini.configured ? "Configured" : "Not set"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Provider */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Provider</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setLocalSettings({ ...localSettings, aiProvider: "ollama" })}
                    className={`flex-1 px-4 py-2 rounded-lg text-sm transition-colors ${
                      localSettings.aiProvider === "ollama"
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Ollama
                  </button>
                  <button
                    onClick={() => setLocalSettings({ ...localSettings, aiProvider: "gemini" })}
                    className={`flex-1 px-4 py-2 rounded-lg text-sm transition-colors ${
                      localSettings.aiProvider === "gemini"
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Gemini
                  </button>
                </div>
              </div>

              {localSettings.aiProvider === "ollama" && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">URL</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={localSettings.ollamaUrl}
                        onChange={(e) => setLocalSettings({ ...localSettings, ollamaUrl: e.target.value })}
                        placeholder="http://localhost:11434"
                        className="flex-1 bg-secondary border border-border rounded-lg px-3 py-2 text-sm"
                      />
                      <button
                        onClick={handleTestOllama}
                        disabled={checkingOllama}
                        className="px-3 py-2 bg-secondary hover:bg-secondary/80 rounded-lg text-sm transition-colors"
                      >
                        {checkingOllama ? "..." : "Test"}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Model</label>
                    <input
                      type="text"
                      value={localSettings.ollamaModel}
                      onChange={(e) => setLocalSettings({ ...localSettings, ollamaModel: e.target.value })}
                      placeholder="gemma3:4b"
                      className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              )}

              {localSettings.aiProvider === "gemini" && (
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">API Key</label>
                  <input
                    type="password"
                    value={localSettings.geminiApiKey}
                    onChange={(e) => setLocalSettings({ ...localSettings, geminiApiKey: e.target.value })}
                    placeholder="Enter your Gemini API key"
                    className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Get key from{" "}
                    <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                      Google AI Studio
                    </a>
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-border bg-secondary/20">
          <div className="text-xs text-muted-foreground">v0.3.0</div>
          <div className="flex items-center gap-2">
            {saved && (
              <span className="text-xs text-green-500 flex items-center gap-1">
                <span>✓</span> Saved
              </span>
            )}
            <button onClick={onClose} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground">
              Close
            </button>
            <button
              onClick={handleSave}
              disabled={!hasChanges}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                hasChanges
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "bg-secondary text-muted-foreground cursor-not-allowed"
              }`}
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Toggle component
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-10 h-5 rounded-full transition-colors ${
        checked ? "bg-primary" : "bg-secondary"
      }`}
    >
      <div
        className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform shadow-sm ${
          checked ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  )
}
