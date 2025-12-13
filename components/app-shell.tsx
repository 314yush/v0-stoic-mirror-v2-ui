"use client"

import type React from "react"

import type { Tab } from "@/app/page"

interface AppShellProps {
  activeTab: Tab
  onTabChange: (tab: Tab) => void
  children: React.ReactNode
}

export function AppShell({ activeTab, onTabChange, children }: AppShellProps) {
  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="flex items-center justify-between border-b border-border px-6 py-3">
        <div className="flex items-center gap-6">
          <h1 className="text-lg font-semibold text-foreground">Stoic Mirror v2</h1>
          <nav className="flex gap-1">
            <button
              onClick={() => onTabChange("today")}
              className={`px-4 py-2 text-sm font-medium transition-colors rounded-md ${
                activeTab === "today"
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              }`}
            >
              Today
            </button>
            <button
              onClick={() => onTabChange("journal")}
              className={`px-4 py-2 text-sm font-medium transition-colors rounded-md ${
                activeTab === "journal"
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              }`}
            >
              Journal
            </button>
            <button
              onClick={() => onTabChange("weekly")}
              className={`px-4 py-2 text-sm font-medium transition-colors rounded-md ${
                activeTab === "weekly"
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              }`}
            >
              Weekly
            </button>
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <button className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            Settings
          </button>
        </div>
      </header>
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
