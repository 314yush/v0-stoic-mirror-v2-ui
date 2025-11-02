import React, { useState } from "react"
import { useAuthStore } from "../lib/auth-store"
import { useToastStore } from "./toasts"
import { SettingsModal } from "./settings-modal"
import type { User } from "@supabase/supabase-js"
import { HourglassIcon } from "./icons/hourglass-icon"
import { ScrollIcon } from "./icons/scroll-icon"
import { ChartIcon } from "./icons/chart-icon"
import { CheckmarkIcon } from "./icons/checkmark-icon"

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
      <header className="flex items-center justify-between border-b border-border px-6 pt-10 pb-4 bg-background/95 backdrop-blur-sm sticky top-0 z-50" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}>
        <div className="flex items-center gap-12">
          <h1 className="text-xl font-semibold text-foreground tracking-tight">Stoic Mirror</h1>
          <nav className="flex gap-1" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
            <button
              onClick={() => onTabChange("today")}
              className={`btn btn-sm flex items-center gap-2 ${
                activeTab === "today"
                  ? "btn-primary"
                  : "btn-ghost"
              }`}
            >
              <HourglassIcon size={16} />
              <span>Today</span>
            </button>
            <button
              onClick={() => onTabChange("journal")}
              className={`btn btn-sm flex items-center gap-2 ${
                activeTab === "journal"
                  ? "btn-primary"
                  : "btn-ghost"
              }`}
            >
              <ScrollIcon size={16} />
              <span>Journal</span>
            </button>
            <button
              onClick={() => onTabChange("weekly")}
              className={`btn btn-sm flex items-center gap-2 ${
                activeTab === "weekly"
                  ? "btn-primary"
                  : "btn-ghost"
              }`}
            >
              <ChartIcon size={16} />
              <span>Weekly</span>
            </button>
            <button
              onClick={() => onTabChange("tasks")}
              className={`btn btn-sm flex items-center gap-2 ${
                activeTab === "tasks"
                  ? "btn-primary"
                  : "btn-ghost"
              }`}
            >
              <CheckmarkIcon size={16} />
              <span>Tasks</span>
            </button>
          </nav>
        </div>
        <div className="flex items-center gap-4" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
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
