import React, { useState } from "react"
import { useAuthStore } from "../lib/auth-store"
import { useToastStore } from "./toasts"
import { SettingsModal } from "./settings-modal"
import type { User } from "@supabase/supabase-js"

type Tab = "today" | "journal" | "weekly"

interface AppShellProps {
  activeTab: Tab
  onTabChange: (tab: Tab) => void
  children: React.ReactNode
  user: User
}

export function AppShell({ activeTab, onTabChange, children, user }: AppShellProps) {
  const { signOut } = useAuthStore()
  const { addToast } = useToastStore()
  const [showSettings, setShowSettings] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    addToast("Signed out")
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="flex items-center justify-between border-b border-border px-6 py-3">
        <div className="flex items-center gap-6">
          <h1 className="text-lg font-semibold text-foreground">Mindful OS</h1>
          <nav className="flex gap-1">
            <button
              onClick={() => onTabChange("today")}
              className={`px-4 py-2 text-sm font-medium transition-colors rounded-md ${
                activeTab === "today"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              Today
            </button>
            <button
              onClick={() => onTabChange("journal")}
              className={`px-4 py-2 text-sm font-medium transition-colors rounded-md ${
                activeTab === "journal"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              Journal
            </button>
            <button
              onClick={() => onTabChange("weekly")}
              className={`px-4 py-2 text-sm font-medium transition-colors rounded-md ${
                activeTab === "weekly"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              Weekly
            </button>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">{user.email}</span>
          <button
            onClick={() => setShowSettings(true)}
            className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            title="Settings"
          >
            ⚙️
          </button>
          <button
            onClick={handleSignOut}
            className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Sign Out
          </button>
        </div>
      </header>
      <main className="flex-1 overflow-auto">{children}</main>
      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  )
}
