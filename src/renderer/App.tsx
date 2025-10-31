import React, { useState, useEffect } from "react"
import { AppShell } from "./components/app-shell"
import { TodayTab } from "./components/today/today-tab"
import { JournalTab } from "./components/journal/journal-tab"
import { WeeklyTab } from "./components/weekly/weekly-tab"
import { Toasts } from "./components/toasts"
import { LoginScreen } from "./components/auth/login-screen"
import { ErrorBoundary } from "./components/error-boundary"
import { NetworkStatus } from "./components/network-status"
import { useAuthStore } from "./lib/auth-store"
import { useThemeStore } from "./lib/theme-store"
import { useToastStore } from "./components/toasts"
import { checkNudgeTime, hasBeenNudgedToday, markNudged, snoozeNudge } from "./lib/nudge-service"

type Tab = "today" | "journal" | "weekly"

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("today")
  const { user, loading, initialized, initialize } = useAuthStore()
  const { theme } = useThemeStore()
  const { addToast } = useToastStore()

  // Apply theme to document - Tailwind uses "dark" class for dark mode
  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }
  }, [theme])

  // Evening nudge system (10pm) - check every minute
  useEffect(() => {
    if (!user) return // Only show nudges when logged in

    const checkNudge = () => {
      // hasBeenNudgedToday() returns true if we should show nudge (haven't nudged yet)
      if (checkNudgeTime() && hasBeenNudgedToday()) {
        markNudged()
        addToast(
          "🌙 Evening wind-down: Time to set your routine for tomorrow!",
          "info",
          {
            showSnooze: true,
            onSnooze: () => {
              snoozeNudge()
              addToast("Nudge snoozed for 20 minutes", "success")
            },
          }
        )
        // Switch to Today tab to set routine
        setActiveTab("today")
      }
    }

    // Check immediately
    checkNudge()

    // Check every minute
    const interval = setInterval(checkNudge, 60000)
    return () => clearInterval(interval)
  }, [user, addToast])

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
        } else if (e.key === "w" || e.key === "W") {
          e.preventDefault()
          setActiveTab("weekly")
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  if (loading || !initialized) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return <LoginScreen />
  }

  return (
    <ErrorBoundary>
      <AppShell activeTab={activeTab} onTabChange={setActiveTab} user={user}>
        {activeTab === "today" && <TodayTab />}
        {activeTab === "journal" && <JournalTab />}
        {activeTab === "weekly" && <WeeklyTab />}
      </AppShell>
      <Toasts />
      <NetworkStatus />
    </ErrorBoundary>
  )
}
