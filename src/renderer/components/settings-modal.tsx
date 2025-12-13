import { useState, useEffect } from "react"
import React from "react"
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
  hasValidTokens,
  revokeAccess,
  getValidAccessTokenForAccount,
  loadAccounts,
  saveAccount,
  removeAccount,
  getUserInfo,
  type GoogleAccount
} from "../lib/google-oauth-electron"

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
  onShowTutorial?: () => void
}

export function SettingsModal({ isOpen, onClose, onShowTutorial }: SettingsModalProps) {
  const { settings, updateSettings } = useSettingsStore()
  const { theme, setTheme } = useThemeStore()
  const { addToast } = useToastStore()
  const { pullAndMergeData } = useAuthStore()
  const [localSettings, setLocalSettings] = useState(settings)
  const [setupStatus, setSetupStatus] = useState<SetupStatus | null>(null)
  const [checkingOllama, setCheckingOllama] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["general", "ai-setup"]))
  
  // Google Calendar state - multi-account support
  const [connectedAccounts, setConnectedAccounts] = useState<GoogleAccount[]>([])
  const [connectingGoogleCalendar, setConnectingGoogleCalendar] = useState(false)
  
  // Goal setting state - initialize from current settings
  const currentGoals = settings.userGoals || {}
  const [northStar, setNorthStar] = useState(currentGoals.northStar || "")
  const [lifestyle, setLifestyle] = useState<string[]>(currentGoals.lifestyle || [])
  const [preferences, setPreferences] = useState<string[]>(currentGoals.preferences || [])
  const [otherLifestyle, setOtherLifestyle] = useState(currentGoals.otherLifestyle || "")
  const [otherPreferences, setOtherPreferences] = useState(currentGoals.otherPreferences || "")
  const [routineNames, setRoutineNames] = useState<string[]>(currentGoals.routineNames || [])
  const [customRoutine, setCustomRoutine] = useState("")

  useEffect(() => {
    if (isOpen) {
      setLocalSettings(settings)
      // Load goal state from settings - ensure we get the latest values
      // Only update if settings actually changed to avoid resetting scroll position
      const currentGoals = settings.userGoals || {}
      setNorthStar(currentGoals.northStar || "")
      setLifestyle(currentGoals.lifestyle || [])
      setPreferences(currentGoals.preferences || [])
      setOtherLifestyle(currentGoals.otherLifestyle || "")
      setOtherPreferences(currentGoals.otherPreferences || "")
      setRoutineNames(currentGoals.routineNames || [])
      setCustomRoutine("")
      // Auto-detect Ollama when settings open
      getSetupStatus().then(setSetupStatus)
      // Load connected Google Calendar accounts
      setConnectedAccounts(loadAccounts())
    }
  }, [isOpen]) // Only depend on isOpen, not settings, to avoid resetting scroll on every keystroke
  
  // Default colors for accounts
  const accountColors = [
    '#4285f4', // Google Blue (Personal)
    '#ea4335', // Google Red (Work)
    '#34a853', // Google Green
    '#fbbc04', // Google Yellow
    '#673ab7', // Purple
  ]
  
  const handleConnectGoogleCalendar = async () => {
    if (!isGoogleCalendarConfigured()) {
      addToast("Google Calendar not configured. Add VITE_GOOGLE_CLIENT_ID and VITE_GOOGLE_CLIENT_SECRET to .env", "error")
      return
    }
    
    setConnectingGoogleCalendar(true)
    
    try {
      // Start callback server
      await window.electronAPI?.oauth.startCallbackServer()
      
      // Generate auth URL and open in browser
      const authUrl = generateAuthUrl()
      await window.electronAPI?.oauth.openExternal(authUrl)
      
      addToast("Opening browser for Google Calendar authorization...", "info")
      
      // Wait for callback
      const result = await window.electronAPI?.oauth.waitForCallback()
      
      if (result?.code) {
        // Exchange code for tokens
        const tokens = await exchangeCodeForTokens(result.code)
        
        // Get user info to identify the account
        const userInfo = await getUserInfo(tokens.access_token)
        
        // Check if already connected
        const existingAccounts = loadAccounts()
        if (existingAccounts.some(a => a.email === userInfo.email)) {
          addToast(`${userInfo.email} is already connected`, "info")
          return
        }
        
        // Determine label based on existing accounts
        const accountCount = existingAccounts.length
        const defaultLabel = accountCount === 0 ? 'Personal' : 
                            accountCount === 1 ? 'Work' : 
                            `Account ${accountCount + 1}`
        
        // Create new account
        const newAccount: GoogleAccount = {
          id: userInfo.email,
          email: userInfo.email,
          name: userInfo.name,
          picture: userInfo.picture,
          tokens,
          label: defaultLabel,
          color: accountColors[accountCount % accountColors.length],
        }
        
        saveAccount(newAccount)
        setConnectedAccounts(loadAccounts())
        addToast(`✅ Connected ${userInfo.email} (${defaultLabel})!`, "success")
      } else if (result?.error) {
        addToast(`Failed to connect: ${result.error}`, "error")
      } else {
        addToast("Connection cancelled", "info")
      }
    } catch (error) {
      console.error("Google Calendar connection error:", error)
      addToast(`Failed to connect: ${error instanceof Error ? error.message : 'Unknown error'}`, "error")
    } finally {
      setConnectingGoogleCalendar(false)
      // Ensure server is stopped
      await window.electronAPI?.oauth.stopServer()
    }
  }
  
  const handleDisconnectAccount = async (email: string) => {
    try {
      const token = await getValidAccessTokenForAccount(email)
      if (token) {
        await revokeAccess(token)
      }
      removeAccount(email)
      setConnectedAccounts(loadAccounts())
      addToast(`Disconnected ${email}`, "success")
    } catch (error) {
      console.error("Error disconnecting Google Calendar:", error)
      // Still remove local account even if revoke fails
      removeAccount(email)
      setConnectedAccounts(loadAccounts())
      addToast(`Disconnected ${email}`, "success")
    }
  }
  
  const handleUpdateAccountLabel = (email: string, label: string) => {
    const accounts = loadAccounts()
    const account = accounts.find(a => a.email === email)
    if (account) {
      account.label = label
      saveAccount(account)
      setConnectedAccounts(loadAccounts())
    }
  }

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

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(section)) {
        next.delete(section)
      } else {
        next.add(section)
      }
      return next
    })
  }

  const isSectionExpanded = (section: string) => expandedSections.has(section)

  const SectionHeader = ({ icon, title, section }: { icon: string, title: string, section: string }) => (
    <button
      onClick={() => toggleSection(section)}
      className="w-full flex items-center justify-between p-4 hover:bg-secondary/50 rounded-lg transition-colors"
    >
      <div className="flex items-center gap-3">
        <span className="text-[1.15em]" style={{ fontSize: '1.15em' }}>{icon}</span>
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
      </div>
      <span className="text-muted-foreground">
        {isSectionExpanded(section) ? '▼' : '▶'}
      </span>
    </button>
  )

  const Section = ({ icon, title, section, children }: { icon: string, title: string, section: string, children: React.ReactNode }) => (
    <div className="border border-border rounded-lg overflow-hidden">
      <SectionHeader icon={icon} title={title} section={section} />
      {isSectionExpanded(section) && (
        <div className="px-4 pb-4 space-y-4 border-t border-border pt-4">
          {children}
        </div>
      )}
    </div>
  )

  const toggleLifestyle = (value: string) => {
    setLifestyle(prev => 
      prev.includes(value) 
        ? prev.filter(v => v !== value)
        : [...prev, value]
    )
  }

  const togglePreferences = (value: string) => {
    setPreferences(prev => 
      prev.includes(value) 
        ? prev.filter(v => v !== value)
        : [...prev, value]
    )
  }

  const toggleRoutine = (value: string) => {
    setRoutineNames(prev => 
      prev.includes(value) 
        ? prev.filter(v => v !== value)
        : [...prev, value]
    )
  }

  const addCustomRoutine = () => {
    const trimmed = customRoutine.trim()
    if (trimmed && !routineNames.includes(trimmed)) {
      setRoutineNames(prev => [...prev, trimmed])
      setCustomRoutine("")
    }
  }

  const removeRoutine = (routine: string) => {
    setRoutineNames(prev => prev.filter(r => r !== routine))
  }

  const lifestyleOptions = [
    "Fixed work hours (9-5)",
    "Flexible/remote work",
    "Shift work / irregular hours",
    "Student schedule",
    "Parent/caregiver responsibilities",
    "Early bird (morning energy)",
    "Night owl (evening energy)",
    "Limited free time (< 2 hours/day)",
    "Lots of interruptions/unpredictable schedule",
    "Other",
  ]

  const preferencesOptions = [
    "Structured routines (same time daily)",
    "Flexible approach (adapt as needed)",
    "Visual progress tracking",
    "Accountability & checking in",
    "Minimal/low-friction systems",
    "Detailed planning",
    "Focus on habits over goals",
    "Goal-oriented (clear targets)",
    "Prefer gentle nudges",
    "Prefer direct accountability",
    "Other",
  ]

  const routineOptions = [
    "Morning Routine",
    "Exercise / Workout",
    "Reading",
    "Deep Work",
    "Evening Wind Down",
    "Meditation",
    "Learning / Study",
    "Writing / Journaling",
    "Meal Prep",
    "Social Time",
  ]

  const handleSave = () => {
    // Validate Ollama URL if provided
    if (localSettings.aiProvider === "ollama" && localSettings.ollamaUrl) {
      const validation = validateOllamaUrl(localSettings.ollamaUrl)
      if (!validation.valid) {
        addToast(validation.error || "Invalid Ollama URL", "error")
        return
      }
    }

    // Save user goals
    const userGoals: UserGoals = {
      northStar: northStar.trim() || undefined,
      lifestyle: lifestyle.length > 0 ? lifestyle : [],
      preferences: preferences.length > 0 ? preferences : [],
      otherLifestyle: otherLifestyle.trim() || undefined,
      otherPreferences: otherPreferences.trim() || undefined,
      routineNames: routineNames.length > 0 ? routineNames : [],
    }

    updateSettings({ ...localSettings, userGoals })
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
          <div className="flex items-center gap-3">
            {onShowTutorial && (
              <button
                onClick={() => {
                  onShowTutorial()
                  onClose()
                }}
                className="btn btn-sm btn-secondary flex items-center gap-2"
                title="View app tutorial"
              >
                <span className="text-[1.15em]" style={{ fontSize: '1.15em' }}>📖</span>
                <span>View Tutorial</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground transition-colors text-[1.15em]"
              style={{ fontSize: '1.15em' }}
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {/* General Section */}
          <Section icon="⚙️" title="General" section="general">
            {/* Theme */}
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

            {/* Widget Toggle */}
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <div className="flex-1">
                <label className="block text-sm font-medium text-foreground mb-1">
                  Menu Bar Widget
                </label>
                <p className="text-xs text-muted-foreground">
                  Show widget icon in menu bar for quick access
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
          </Section>

          {/* AI & Setup Section */}
          <Section icon="🤖" title="AI & Setup" section="ai-setup">
            {/* Setup Status */}
            <div className="bg-secondary/20 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-foreground text-sm">Setup Status</h4>
                {isSupabaseConfigured() && (
                  <button
                    onClick={handleSyncNow}
                    disabled={syncing}
                    className="btn btn-xs btn-secondary"
                    title="Sync data from server"
                  >
                    <span className="text-[1.15em]" style={{ fontSize: '1.15em' }}>🔄</span> {syncing ? "Syncing..." : "Sync"}
                  </button>
                )}
              </div>
              
              {/* Supabase */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Backend (Supabase):</span>
                <span className={isSupabaseConfigured() ? "text-primary font-medium" : "text-muted-foreground"}>
                  <span className="text-[1.15em]" style={{ fontSize: '1.15em' }}>{isSupabaseConfigured() ? "✅" : "⚠️"}</span> {isSupabaseConfigured() ? "Configured" : "Not Set"}
                </span>
              </div>

              {/* Ollama */}
              {setupStatus && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">AI (Ollama):</span>
                  <span className={setupStatus.ollama.running ? "text-primary font-medium" : "text-muted-foreground"}>
                    <span className="text-[1.15em]" style={{ fontSize: '1.15em' }}>{setupStatus.ollama.running ? "✅" : "⚠️"}</span> {setupStatus.ollama.running ? "Running" : "Not Running"}
                  </span>
                </div>
              )}

              {/* Gemini */}
              {setupStatus && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">AI (Gemini):</span>
                  <span className={setupStatus.gemini.configured ? "text-primary font-medium" : "text-muted-foreground"}>
                    <span className="text-[1.15em]" style={{ fontSize: '1.15em' }}>{setupStatus.gemini.configured ? "✅" : "⚠️"}</span> {setupStatus.gemini.configured ? "Configured" : "Not Set"}
                  </span>
                </div>
              )}
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
                      <span className="text-[1.15em]" style={{ fontSize: '1.15em' }}>💡</span> Tip: Install Ollama from <a href="https://ollama.ai" target="_blank" rel="noopener noreferrer" className="underline">ollama.ai</a> and run <code className="bg-secondary px-1 rounded">ollama serve</code>
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
          </Section>

          {/* Notifications Section */}
          <Section icon="🔔" title="Notifications" section="notifications">
            {/* Evening Wind-Down Notification */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Evening Wind-Down Reminder
                  </label>
                  <p className="text-xs text-muted-foreground">
                    Get a desktop notification to set your routine for tomorrow
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer ml-4">
                  <input
                    type="checkbox"
                    checked={localSettings.eveningWindDownEnabled}
                    onChange={(e) => {
                      setLocalSettings({ ...localSettings, eveningWindDownEnabled: e.target.checked })
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-secondary peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>
              {localSettings.eveningWindDownEnabled && (
                <div>
                  <label className="block text-xs text-muted-foreground mb-2">
                    Time (24-hour format)
                  </label>
                  <input
                    type="time"
                    value={localSettings.eveningWindDownTime}
                    onChange={(e) => {
                      setLocalSettings({ ...localSettings, eveningWindDownTime: e.target.value })
                    }}
                    className="input text-sm"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    You'll be notified 30 minutes before and after this time
                  </p>
                </div>
              )}
            </div>

            {/* Wake-Up Notification */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Wake-Up Reminder
                  </label>
                  <p className="text-xs text-muted-foreground">
                    Get a desktop notification to review today's schedule
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer ml-4">
                  <input
                    type="checkbox"
                    checked={localSettings.wakeUpEnabled}
                    onChange={(e) => {
                      setLocalSettings({ ...localSettings, wakeUpEnabled: e.target.checked })
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-secondary peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>
              {localSettings.wakeUpEnabled && (
                <div>
                  <label className="block text-xs text-muted-foreground mb-2">
                    Time (24-hour format)
                  </label>
                  <input
                    type="time"
                    value={localSettings.wakeUpTime}
                    onChange={(e) => {
                      setLocalSettings({ ...localSettings, wakeUpTime: e.target.value })
                    }}
                    className="input text-sm"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    You'll be notified 30 minutes before and after this time
                  </p>
                </div>
              )}
            </div>
          </Section>

          {/* Goals & Preferences Section */}
          <Section icon="🎯" title="Goals & Preferences" section="goals">
            <p className="text-sm text-muted-foreground mb-4">
              Customize your AI experience by sharing your north star, lifestyle, and preferences.
            </p>

            {/* North Star */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-foreground">
                North Star / Identity Vision
              </label>
              <textarea
                value={northStar}
                onChange={(e) => setNorthStar(e.target.value)}
                placeholder="e.g., 'I want to become a person that's a world-class athlete, a startup employee, and passionate reader/researcher'"
                className="input resize-none"
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                Describe who you're striving to become. This helps the AI personalize conversations and suggestions.
              </p>
            </div>

            {/* Lifestyle */}
            <div className="space-y-3 pt-2 border-t border-border">
              <label className="block text-sm font-medium text-foreground">
                Lifestyle & Constraints
              </label>
              <div className="space-y-2 max-h-48 overflow-y-auto border border-border rounded-md p-3">
                {lifestyleOptions.map((option) => (
                  <label key={option} className="flex items-center gap-2 cursor-pointer hover:bg-secondary/50 p-2 rounded">
                    <input
                      type="checkbox"
                      checked={lifestyle.includes(option)}
                      onChange={() => toggleLifestyle(option)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-foreground">{option}</span>
                  </label>
                ))}
              </div>
              {lifestyle.includes("Other") && (
                <input
                  type="text"
                  value={otherLifestyle}
                  onChange={(e) => setOtherLifestyle(e.target.value)}
                  placeholder="Describe your lifestyle..."
                  className="input text-sm"
                />
              )}
            </div>

            {/* Preferences */}
            <div className="space-y-3 pt-2 border-t border-border">
              <label className="block text-sm font-medium text-foreground">
                Preferences & Motivations
              </label>
              <div className="space-y-2 max-h-48 overflow-y-auto border border-border rounded-md p-3">
                {preferencesOptions.map((option) => (
                  <label key={option} className="flex items-center gap-2 cursor-pointer hover:bg-secondary/50 p-2 rounded">
                    <input
                      type="checkbox"
                      checked={preferences.includes(option)}
                      onChange={() => togglePreferences(option)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-foreground">{option}</span>
                  </label>
                ))}
              </div>
              {preferences.includes("Other") && (
                <input
                  type="text"
                  value={otherPreferences}
                  onChange={(e) => setOtherPreferences(e.target.value)}
                  placeholder="Describe your preferences..."
                  className="input text-sm"
                />
              )}
            </div>

            {/* Routine Names */}
            <div className="space-y-3 pt-2 border-t border-border">
              <label className="block text-sm font-medium text-foreground">
                Your Current Routines
              </label>
              <p className="text-xs text-muted-foreground">
                Select your routines to help us suggest better names and track patterns accurately.
              </p>
              <div className="space-y-2 max-h-64 overflow-y-auto border border-border rounded-md p-3">
                {routineOptions.map((option) => (
                  <label key={option} className="flex items-center gap-2 cursor-pointer hover:bg-secondary/50 p-2 rounded">
                    <input
                      type="checkbox"
                      checked={routineNames.includes(option)}
                      onChange={() => toggleRoutine(option)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-foreground">{option}</span>
                  </label>
                ))}
              </div>
              
              {/* Custom routine input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customRoutine}
                  onChange={(e) => setCustomRoutine(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addCustomRoutine()}
                  placeholder="Add custom routine..."
                  className="input text-sm flex-1"
                />
                <button
                  onClick={addCustomRoutine}
                  disabled={!customRoutine.trim()}
                  className="btn btn-sm btn-secondary"
                >
                  Add
                </button>
              </div>
              
              {/* Selected routines display */}
              {routineNames.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {routineNames.map((routine) => (
                    <span
                      key={routine}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm"
                    >
                      {routine}
                      <button
                        onClick={() => removeRoutine(routine)}
                        className="ml-1 hover:text-primary/70"
                        aria-label={`Remove ${routine}`}
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </Section>

          {/* Schedule Section */}
          <Section icon="📅" title="Schedule" section="schedule">
            <div className="space-y-3">
              <div className="flex-1">
                <label className="block text-sm font-medium text-foreground mb-1">
                  Commit Cutoff Time
                </label>
                <p className="text-xs text-muted-foreground">
                  After this time, you can commit your schedule for the next day. Before this time, you commit for today.
                </p>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-2">
                  Time (24-hour format)
                </label>
                <input
                  type="time"
                  value={localSettings.commitCutoffTime}
                  onChange={(e) => {
                    setLocalSettings({ ...localSettings, commitCutoffTime: e.target.value })
                  }}
                  className="input text-sm"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Default: 10:00 PM (22:00). After this time, you can set tomorrow's routine.
                </p>
              </div>
            </div>
          </Section>

          {/* Google Calendar Section */}
          <Section icon="📆" title="Calendar Integration" section="calendar">
            <div className="space-y-4">
              {/* Connected Accounts */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-foreground">Connected Accounts</h4>
                  <span className="text-xs text-muted-foreground">
                    {connectedAccounts.length} {connectedAccounts.length === 1 ? 'account' : 'accounts'}
                  </span>
                </div>
                
                {connectedAccounts.length === 0 ? (
                  <div className="bg-secondary/20 rounded-lg p-4 text-center">
                    <span className="text-2xl">📆</span>
                    <p className="text-sm text-muted-foreground mt-2">
                      No Google Calendar accounts connected
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Connect your personal and work calendars to see all your events
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {connectedAccounts.map((account) => (
                      <div 
                        key={account.email}
                        className="bg-secondary/20 rounded-lg p-3 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          {/* Color indicator */}
                          <div 
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: account.color || '#4285f4' }}
                          />
                          {/* Account info */}
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-foreground">
                                {account.email}
                              </span>
                              <select
                                value={account.label || 'Personal'}
                                onChange={(e) => handleUpdateAccountLabel(account.email, e.target.value)}
                                className="text-xs bg-secondary/50 border border-border rounded px-2 py-0.5 text-muted-foreground"
                              >
                                <option value="Personal">Personal</option>
                                <option value="Work">Work</option>
                                <option value="School">School</option>
                                <option value="Other">Other</option>
                              </select>
                            </div>
                            {account.name && (
                              <p className="text-xs text-muted-foreground">{account.name}</p>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => handleDisconnectAccount(account.email)}
                          className="btn btn-xs btn-ghost text-red-500 hover:text-red-600 hover:bg-red-500/10"
                          title={`Disconnect ${account.email}`}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Add Account Button */}
                <button
                  onClick={handleConnectGoogleCalendar}
                  disabled={connectingGoogleCalendar || !isGoogleCalendarConfigured()}
                  className="btn btn-sm btn-secondary w-full"
                >
                  {connectingGoogleCalendar ? (
                    <span className="flex items-center gap-2 justify-center">
                      <span className="animate-spin">⏳</span>
                      Connecting...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2 justify-center">
                      <span>+</span>
                      {connectedAccounts.length === 0 ? 'Connect Google Calendar' : 'Add Another Account'}
                    </span>
                  )}
                </button>
              </div>

              {/* Configuration Status */}
              {!isGoogleCalendarConfigured() && (
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                  <p className="text-xs text-yellow-500">
                    <span className="font-semibold">⚠️ Setup Required:</span> Add Google OAuth credentials to your <code className="bg-secondary px-1 rounded">.env</code> file:
                  </p>
                  <pre className="mt-2 text-xs bg-secondary/50 p-2 rounded overflow-x-auto">
{`VITE_GOOGLE_CLIENT_ID=your-client-id
VITE_GOOGLE_CLIENT_SECRET=your-secret`}
                  </pre>
                  <p className="text-xs text-muted-foreground mt-2">
                    See <code className="bg-secondary px-1 rounded">GOOGLE_OAUTH_SETUP.md</code> for detailed instructions.
                  </p>
                </div>
              )}

              {/* Sync Options (when connected) */}
              {connectedAccounts.length > 0 && (
                <div className="space-y-3 pt-2 border-t border-border">
                  <h4 className="text-sm font-medium text-foreground">Sync Options</h4>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <label className="block text-sm text-foreground mb-1">
                        Auto-import events
                      </label>
                      <p className="text-xs text-muted-foreground">
                        Automatically import events from all connected calendars
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer ml-4">
                      <input
                        type="checkbox"
                        checked={localSettings.googleCalendarAutoImport ?? true}
                        onChange={(e) => {
                          setLocalSettings({ 
                            ...localSettings, 
                            googleCalendarAutoImport: e.target.checked 
                          })
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-secondary peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <label className="block text-sm text-foreground mb-1">
                        Export Stoic Mirror blocks
                      </label>
                      <p className="text-xs text-muted-foreground">
                        Create Google Calendar events from your blocks
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer ml-4">
                      <input
                        type="checkbox"
                        checked={localSettings.googleCalendarExport ?? false}
                        onChange={(e) => {
                          setLocalSettings({ 
                            ...localSettings, 
                            googleCalendarExport: e.target.checked 
                          })
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-secondary peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>
                </div>
              )}
            </div>
          </Section>

          {/* About Section */}
          <Section icon="ℹ️" title="About" section="about">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <label className="block text-sm font-medium text-foreground mb-1">
                  App Version
                </label>
                <p className="text-xs text-muted-foreground">
                  Current version: 0.3.0
                </p>
              </div>
              {window.electronAPI && (
                <button
                  onClick={async () => {
                    try {
                      addToast("Checking for updates...", "info")
                      const result = await window.electronAPI?.update?.check()
                      if (result?.updateInfo) {
                        addToast(`Update available: ${result.updateInfo.version}. Downloading...`, "success")
                      } else {
                        addToast("You're on the latest version!", "success")
                      }
                    } catch (error) {
                      console.error("Update check failed:", error)
                      addToast("Failed to check for updates", "error")
                    }
                  }}
                  className="btn btn-sm btn-ghost"
                  title="Check for updates"
                >
                  Check for Updates
                </button>
              )}
            </div>
          </Section>

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

