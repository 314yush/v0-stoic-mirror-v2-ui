"use client"

import { useState, useEffect } from "react"
import { AppShell } from "@/components/app-shell"
import { TodayTab } from "@/components/today/today-tab"
import { JournalTab } from "@/components/journal/journal-tab"
import { WeeklyTab } from "@/components/weekly/weekly-tab"
import { Toasts } from "@/components/toasts"

export type Tab = "today" | "journal" | "weekly"

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("today")

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey

      if (isMod && e.shiftKey && e.key === "P") {
        e.preventDefault()
        setActiveTab("today")
      } else if (isMod && e.shiftKey && e.key === "J") {
        e.preventDefault()
        setActiveTab("journal")
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  return (
    <>
      <AppShell activeTab={activeTab} onTabChange={setActiveTab}>
        {activeTab === "today" && <TodayTab />}
        {activeTab === "journal" && <JournalTab />}
        {activeTab === "weekly" && <WeeklyTab />}
      </AppShell>
      <Toasts />
    </>
  )
}
