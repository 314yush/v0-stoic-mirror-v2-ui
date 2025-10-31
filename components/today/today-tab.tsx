"use client"

import { useState, useEffect } from "react"
import { RoutinePresetPicker } from "./routine-preset-picker"
import { DayTimeline } from "./day-timeline"
import { QuickAddBlock } from "./quick-add-block"
import { ValidationHints } from "./validation-hints"
import { useToastStore } from "@/components/toasts"

export interface TimeBlock {
  id: string
  identity: string
  start: string
  end: string
  optional?: boolean
  streak?: number
}

const WEEKDAY_PRESET: TimeBlock[] = [
  { id: "1", identity: "Morning Routine", start: "06:00", end: "07:00", streak: 12 },
  { id: "2", identity: "Deep Work", start: "09:00", end: "12:00", streak: 8 },
  { id: "3", identity: "Exercise", start: "17:00", end: "18:00", streak: 15 },
  { id: "4", identity: "Evening Wind Down", start: "21:00", end: "22:00", streak: 20 },
]

const WEEKEND_PRESET: TimeBlock[] = [
  { id: "1", identity: "Morning Routine", start: "08:00", end: "09:00", streak: 12 },
  { id: "2", identity: "Creative Work", start: "10:00", end: "13:00", streak: 5 },
  { id: "3", identity: "Social Time", start: "15:00", end: "18:00", optional: true },
  { id: "4", identity: "Reflection", start: "20:00", end: "21:00", streak: 18 },
]

export function TodayTab() {
  const [blocks, setBlocks] = useState<TimeBlock[]>([])
  const [committed, setCommitted] = useState(false)
  const [commitTime, setCommitTime] = useState<string | null>(null)
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const { addToast } = useToastStore()

  const handleUseRoutine = (preset: "weekday" | "weekend") => {
    setBlocks(preset === "weekday" ? [...WEEKDAY_PRESET] : [...WEEKEND_PRESET])
    setCommitted(false)
    setCommitTime(null)
    addToast(`${preset === "weekday" ? "Weekday" : "Weekend"} routine loaded`)
  }

  const handleUseYesterday = () => {
    addToast("Yesterday's schedule loaded")
  }

  const handleClearDay = () => {
    setBlocks([])
    setCommitted(false)
    setCommitTime(null)
    addToast("Day cleared")
  }

  const handleCommitDay = () => {
    if (blocks.length === 0) {
      addToast("Add some blocks before committing", "error")
      return
    }
    setCommitted(true)
    setCommitTime(new Date().toLocaleTimeString())
    addToast("Day committed! Stay accountable.")
  }

  const handleAddBlock = (block: Omit<TimeBlock, "id">) => {
    const newBlock = { ...block, id: Math.random().toString(36).substring(7) }
    setBlocks([...blocks, newBlock])
    setShowQuickAdd(false)
    addToast("Block added")
  }

  const handleUpdateBlock = (id: string, updates: Partial<TimeBlock>) => {
    setBlocks(blocks.map((b) => (b.id === id ? { ...b, ...updates } : b)))
  }

  const handleDeleteBlock = (id: string) => {
    setBlocks(blocks.filter((b) => b.id !== id))
    addToast("Block deleted")
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        handleCommitDay()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [blocks])

  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-border px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-foreground">Today's Schedule</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handleUseYesterday}
              className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Use Yesterday
            </button>
            <button
              onClick={handleClearDay}
              className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Clear Day
            </button>
            <button
              onClick={handleCommitDay}
              disabled={committed}
              className="px-4 py-1.5 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {committed ? "Committed" : "Commit Day"}
            </button>
          </div>
        </div>
        {committed && commitTime && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="px-2 py-0.5 bg-primary/20 text-primary rounded text-xs font-medium">COMMITTED</span>
            <span>at {commitTime}</span>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-auto px-6 py-6">
        {blocks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-lg font-medium text-foreground mb-2">No blocks scheduled yet</p>
            <p className="text-sm text-muted-foreground mb-6">
              Start by loading a routine preset or adding your first block
            </p>
            <RoutinePresetPicker onSelect={handleUseRoutine} />
          </div>
        ) : (
          <div className="space-y-6">
            <RoutinePresetPicker onSelect={handleUseRoutine} />
            <ValidationHints blocks={blocks} />
            <DayTimeline blocks={blocks} onUpdateBlock={handleUpdateBlock} onDeleteBlock={handleDeleteBlock} />
            <button
              onClick={() => setShowQuickAdd(!showQuickAdd)}
              className="w-full py-2 text-sm text-muted-foreground hover:text-foreground border border-dashed border-border rounded-md hover:border-primary transition-colors"
            >
              + New Block
            </button>
            {showQuickAdd && <QuickAddBlock onAdd={handleAddBlock} onCancel={() => setShowQuickAdd(false)} />}
          </div>
        )}
      </div>
    </div>
  )
}
