import React, { useState, useEffect } from "react"
import { AppShell } from "./components/app-shell"
import { TodayTab } from "./components/today/today-tab"
import { JournalTab } from "./components/journal/journal-tab"
import { WeeklyTab } from "./components/weekly/weekly-tab"
import { TasksTab } from "./components/tasks/tasks-tab"
import { MinimalWidget } from "./components/widget/minimal-widget"
import { Toasts } from "./components/toasts"
import { LoginScreen } from "./components/auth/login-screen"
import { ErrorBoundary } from "./components/error-boundary"
import { NetworkStatus } from "./components/network-status"
import { useAuthStore } from "./lib/auth-store"
import { useThemeStore } from "./lib/theme-store"
import { useToastStore } from "./components/toasts"
import { checkEveningNudgeTime, checkWakeUpNudgeTime, hasBeenNudgedToday, markNudged, snoozeNudge } from "./lib/nudge-service"
import { useSettingsStore } from "./lib/settings-store"
import { OnboardingModal } from "./components/onboarding/onboarding-modal"
import { useOnboardingStore } from "./lib/onboarding-store"
import { useAnalyticsSync, useLoadAnalytics } from "./lib/use-analytics-sync"
import { useHabitsSync } from "./lib/use-habits-sync"

// Import debug utilities (only in dev mode)
if (import.meta.env.DEV) {
  import("./lib/debug-backend")
}

type Tab = "today" | "journal" | "weekly" | "tasks"

export default function App() {
  // Check if we're in widget mode (from URL hash)
  const [isWidgetMode, setIsWidgetMode] = useState(false)

  useEffect(() => {
    // Check URL hash or pathname for widget mode
    const hash = window.location.hash
    const pathname = window.location.pathname
    const isWidget = hash === '#/widget' || hash === '#widget' || pathname === '/widget' || pathname.includes('/widget')
    setIsWidgetMode(isWidget)
    
    // Also listen for hash changes
    const handleHashChange = () => {
      const newHash = window.location.hash
      const newPath = window.location.pathname
      setIsWidgetMode(newHash === '#/widget' || newHash === '#widget' || newPath === '/widget' || newPath.includes('/widget'))
    }
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])
  const [activeTab, setActiveTab] = useState<Tab>("today")
  const { user, loading, initialized, initialize } = useAuthStore()
  const { theme } = useThemeStore()
  const { addToast } = useToastStore()
  const { hasCompletedOnboarding, setOnboardingComplete } = useOnboardingStore()
  const [showOnboardingFromSettings, setShowOnboardingFromSettings] = useState(false)

  // Background sync for analytics (Fitbit-like data sync)
  useAnalyticsSync()
  useLoadAnalytics()
  
  // Load habits from Supabase
  useHabitsSync()

  // Apply theme to document - Tailwind uses "dark" class for dark mode
  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }
  }, [theme])

  // Sync widget enabled state with main process on startup
  // This ensures the tray respects the saved setting, but defaults to enabled
  useEffect(() => {
    if (initialized && window.electronAPI) {
      const settings = useSettingsStore.getState().settings
      // Default to true if not set - widget should always appear by default
      const widgetEnabled = settings.widgetEnabled !== false // Only false if explicitly false
      console.log('📱 Syncing widget state:', { widgetEnabled, saved: settings.widgetEnabled })
      
      // Check tray status after a brief delay (give main process time to register handlers)
      setTimeout(() => {
        if (window.electronAPI) {
          window.electronAPI.invoke('tray:status').then((status: any) => {
            console.log('📱 Tray status:', status)
            if (!status.exists && widgetEnabled) {
              console.warn('⚠️ Tray should exist but does not! Attempting to create...')
              window.electronAPI?.invoke('widget:toggle', true).catch(console.error)
            }
          }).catch((error: any) => {
            // Handler might not be registered yet, that's okay - widget:toggle will still work
            console.log('📱 Could not get tray status (handler may not be ready yet):', error.message)
          })
        }
      }, 2000) // Increased delay to ensure handlers are registered
      
      window.electronAPI.invoke('widget:toggle', widgetEnabled).catch(console.error)
    }
  }, [initialized])

  const { settings } = useSettingsStore()

  // Notification system - check every minute for wake-up and evening nudges
  useEffect(() => {
    if (!user) return // Only show nudges when logged in

    const checkNudges = () => {
      // Evening wind-down notification
      if (checkEveningNudgeTime() && hasBeenNudgedToday('evening')) {
        markNudged('evening')
        
        const message = "🌙 Evening wind-down: Time to set your routine for tomorrow!"
        
        // Show desktop notification if Electron API is available
        if (window.electronAPI?.notification) {
          window.electronAPI.notification.show(
            "Stoic Mirror - Evening Reminder",
            message
          ).catch(console.error)
        }
        
        // Also show in-app toast
        addToast(message, "info", {
          showSnooze: true,
          onSnooze: () => {
            snoozeNudge()
            addToast("Nudge snoozed for 20 minutes", "success")
          },
        })
        
        // Switch to Today tab to set routine
        setActiveTab("today")
      }

      // Wake-up notification
      if (checkWakeUpNudgeTime() && hasBeenNudgedToday('wakeup')) {
        markNudged('wakeup')
        
        const message = "☀️ Good morning! Time to review today's schedule."
        
        // Show desktop notification if Electron API is available
        if (window.electronAPI?.notification) {
          window.electronAPI.notification.show(
            "Stoic Mirror - Wake Up",
            message
          ).catch(console.error)
        }
        
        // Also show in-app toast
        addToast(message, "info")
        
        // Switch to Today tab to see schedule
        setActiveTab("today")
      }
    }

    // Check immediately
    checkNudges()

    // Check every minute
    const interval = setInterval(checkNudges, 60000)
    return () => clearInterval(interval)
  }, [user, addToast, settings.eveningWindDownEnabled, settings.eveningWindDownTime, settings.wakeUpEnabled, settings.wakeUpTime])

  useEffect(() => {
    if (!initialized) {
      initialize()
    }
  }, [initialized, initialize])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey

      // Quick tab shortcuts (Cmd/Ctrl + J/T/W, no Shift needed)
      if (isMod && !e.shiftKey) {
        if (e.key === "j" || e.key === "J") {
          e.preventDefault()
          setActiveTab("journal")
        } else if (e.key === "t" || e.key === "T") {
          e.preventDefault()
          setActiveTab("today")
        } else         if (e.key === "w" || e.key === "W") {
          e.preventDefault()
          setActiveTab("weekly")
        } else if (e.key === "k" || e.key === "K") {
          e.preventDefault()
          setActiveTab("tasks")
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  // Listen for update events
  useEffect(() => {
    if (!window.electronAPI) return

    const handleUpdateAvailable = (version: string) => {
      addToast(`Update ${version} available! Downloading in background...`, "info")
    }

    const handleUpdateDownloaded = (version: string) => {
      addToast(
        `Update ${version} downloaded! Will install when you quit the app.`,
        "success",
        {
          showAction: true,
          actionLabel: "Restart Now",
          onAction: () => {
            window.electronAPI?.update?.install().catch(console.error)
          },
        }
      )
    }

    window.electronAPI.update?.onUpdateAvailable(handleUpdateAvailable)
    window.electronAPI.update?.onUpdateDownloaded(handleUpdateDownloaded)

    return () => {
      // Cleanup listeners if needed
    }
  }, [addToast])

  if (loading || !initialized) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  // Widget mode - minimal, actionable widget
  if (isWidgetMode) {
    return (
      <ErrorBoundary>
        <div className="w-screen h-screen bg-transparent flex items-center justify-center p-4">
          <div className="w-full max-w-sm">
            <MinimalWidget />
          </div>
        </div>
        <Toasts isWidget={true} />
      </ErrorBoundary>
    )
  }

  // Full app mode
  if (!user) {
    return <LoginScreen />
  }

  return (
    <ErrorBoundary>
      <AppShell 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
        user={user}
        onShowTutorial={() => setShowOnboardingFromSettings(true)}
      >
        {activeTab === "today" && <TodayTab />}
        {activeTab === "journal" && <JournalTab />}
        {activeTab === "weekly" && <WeeklyTab />}
        {activeTab === "tasks" && <TasksTab />}
      </AppShell>
      <OnboardingModal 
        isOpen={(user && !hasCompletedOnboarding) || showOnboardingFromSettings} 
        onComplete={() => {
          setOnboardingComplete()
          setShowOnboardingFromSettings(false)
        }} 
      />
      <Toasts />
      <NetworkStatus />
    </ErrorBoundary>
  )
}
