import React, { useState } from "react"
import { useAuthStore } from "../lib/auth-store"
import { useToastStore } from "./toasts"
import { SettingsModal } from "./settings-modal"
import type { User } from "@supabase/supabase-js"

type Tab = "today" | "journal" | "weekly" | "tasks"

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
      <header className="flex items-center justify-between border-b border-border px-6 py-4 bg-background/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="flex items-center gap-8">
          <h1 className="text-xl font-semibold text-foreground tracking-tight">Stoic Mirror</h1>
          <nav className="flex gap-1">
            <button
              onClick={() => onTabChange("today")}
              className={`btn btn-sm ${
                activeTab === "today"
                  ? "btn-primary"
                  : "btn-ghost"
              }`}
            >
              Today
            </button>
            <button
              onClick={() => onTabChange("journal")}
              className={`btn btn-sm ${
                activeTab === "journal"
                  ? "btn-primary"
                  : "btn-ghost"
              }`}
            >
              Journal
            </button>
            <button
              onClick={() => onTabChange("weekly")}
              className={`btn btn-sm ${
                activeTab === "weekly"
                  ? "btn-primary"
                  : "btn-ghost"
              }`}
            >
              Weekly
            </button>
            <button
              onClick={() => onTabChange("tasks")}
              className={`btn btn-sm ${
                activeTab === "tasks"
                  ? "btn-primary"
                  : "btn-ghost"
              }`}
            >
              Tasks
            </button>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-muted-foreground font-medium">{user.email}</span>
          <button
            onClick={() => setShowSettings(true)}
            className="btn-ghost btn-sm p-2 rounded-md"
            title="Settings"
            aria-label="Settings"
          >
            ⚙️
          </button>
          <button
            onClick={handleSignOut}
            className="btn-ghost btn-sm"
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
