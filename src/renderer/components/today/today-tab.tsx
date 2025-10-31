
import { useState, useEffect } from "react"
import { RoutinePresetPicker } from "./routine-preset-picker"
import { DayTimeline } from "./day-timeline"
import { QuickAddBlock } from "./quick-add-block"
import { ValidationHints } from "./validation-hints"
import { RoutineSelectorModal } from "../routine-selector-modal"
import { useToastStore } from "../toasts"
import { useJournalStore } from "../../lib/journal-store"
import { useScheduleStore, type TimeBlock } from "../../lib/schedule-store"

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
  const { getTodayCommit, getCommitByDate, commitDay: saveCommit, commits } = useScheduleStore()
  const [viewingDate, setViewingDate] = useState(new Date()) // Current date being viewed
  const viewingDateStr = viewingDate.toISOString().split('T')[0] // YYYY-MM-DD
  const viewingCommit = getCommitByDate(viewingDateStr)
  const todayCommit = getTodayCommit()
  const isToday = viewingDateStr === new Date().toISOString().split('T')[0]
  
  const [blocks, setBlocks] = useState<TimeBlock[]>(viewingCommit?.blocks || [])
  const [committed, setCommitted] = useState(viewingCommit?.committed || false)
  const [commitTime, setCommitTime] = useState<string | null>(
    viewingCommit?.committed_at ? new Date(viewingCommit.committed_at).toLocaleTimeString() : null
  )
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const [showRoutineSelector, setShowRoutineSelector] = useState(false)
  const { addToast } = useToastStore()
  const { addEntry } = useJournalStore()
  const [showQuickJournal, setShowQuickJournal] = useState(false)
  const [quickJournalText, setQuickJournalText] = useState("")
  const [currentTime, setCurrentTime] = useState(new Date())
  
  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000)
    return () => clearInterval(interval)
  }, [])

  // Load commit for viewing date on mount and when viewing date or store updates
  useEffect(() => {
    const currentCommit = getCommitByDate(viewingDateStr)
    if (currentCommit && currentCommit.blocks.length > 0) {
      // Only update if the commit actually changed (e.g., completion status updated)
      const blocksChanged = JSON.stringify(blocks) !== JSON.stringify(currentCommit.blocks)
      const committedChanged = committed !== currentCommit.committed
      
      if (blocksChanged || committedChanged) {
        setBlocks(currentCommit.blocks)
        setCommitted(currentCommit.committed)
        if (currentCommit.committed_at) {
          setCommitTime(new Date(currentCommit.committed_at).toLocaleTimeString())
        }
      }
    } else if (!currentCommit && blocks.length > 0 && committed) {
      // Commit was deleted from store
      setBlocks([])
      setCommitted(false)
      setCommitTime(null)
    }
  }, [commits, viewingDateStr, getCommitByDate]) // Re-run when commits array or viewing date changes

  // Reset blocks when switching dates
  useEffect(() => {
    const commit = getCommitByDate(viewingDateStr)
    setBlocks(commit?.blocks || [])
    setCommitted(commit?.committed || false)
    setCommitTime(commit?.committed_at ? new Date(commit.committed_at).toLocaleTimeString() : null)
  }, [viewingDateStr, getCommitByDate])

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
    saveCommit(blocks, viewingDateStr)
    setCommitted(true)
    setCommitTime(new Date().toLocaleTimeString())
    addToast("Day committed! Stay accountable.")
  }
  
  const handleViewNextDay = () => {
    const nextDay = new Date(viewingDate)
    nextDay.setDate(nextDay.getDate() + 1)
    setViewingDate(nextDay)
  }
  
  const handleViewToday = () => {
    setViewingDate(new Date())
  }
  
  const formatDateDisplay = (date: Date): string => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
    return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}`
  }
  
  const formatTimeDisplay = (date: Date): string => {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
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
          <div>
            <div className="flex items-center gap-4 mb-2">
              <h2 className="text-xl font-semibold text-foreground">
                {isToday ? "Today's Schedule" : formatDateDisplay(viewingDate)}
              </h2>
              {isToday && (
                <span className="text-sm text-muted-foreground">
                  {formatTimeDisplay(currentTime)}
                </span>
              )}
              {!isToday && (
                <button
                  onClick={handleViewToday}
                  className="text-xs text-primary hover:text-primary/80 transition-colors"
                >
                  View Today →
                </button>
              )}
            </div>
            {blocks.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Total: {(() => {
                  const totalMinutes = blocks.reduce((sum, block) => {
                    const start = Number.parseInt(block.start.split(":")[0]) * 60 + Number.parseInt(block.start.split(":")[1])
                    const end = Number.parseInt(block.end.split(":")[0]) * 60 + Number.parseInt(block.end.split(":")[1])
                    return sum + (end - start)
                  }, 0)
                  const hours = Math.floor(totalMinutes / 60)
                  const minutes = totalMinutes % 60
                  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`
                })()}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowQuickJournal(true)}
              className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Add Journal
            </button>
            {isToday && (
              <button
                onClick={handleViewNextDay}
                className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Next Day →
              </button>
            )}
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
            <div className="flex items-center gap-3 flex-wrap">
              <RoutinePresetPicker onSelect={handleUseRoutine} />
              <button
                onClick={() => setShowRoutineSelector(true)}
                className="px-3 py-1.5 text-sm bg-secondary text-foreground rounded-md hover:bg-secondary/80 transition-colors"
              >
                Use Saved Routine
              </button>
            </div>
            <ValidationHints blocks={blocks} />
            <DayTimeline
              blocks={blocks}
              onUpdateBlock={handleUpdateBlock}
              onDeleteBlock={handleDeleteBlock}
              onAddBlock={handleAddBlock}
            />
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
      {showQuickJournal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg bg-card border border-border rounded-lg p-4 space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Quick journal</h3>
            <textarea
              value={quickJournalText}
              onChange={(e) => setQuickJournalText(e.target.value)}
              rows={6}
              placeholder="What's on your mind?"
              className="w-full p-3 bg-secondary text-foreground rounded-md border border-border"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setShowQuickJournal(false)}
                className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!quickJournalText.trim()) return setShowQuickJournal(false)
                  addEntry({ content: quickJournalText, tags: [], is_sensitive: false, visibility: "private" })
                  setQuickJournalText("")
                  setShowQuickJournal(false)
                  addToast("Saved. Future-You can return anytime.")
                }}
                className="px-4 py-1.5 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
      
      {showRoutineSelector && (
        <RoutineSelectorModal
          onSelect={(selectedBlocks) => {
            setBlocks(selectedBlocks)
            setCommitted(false)
            setCommitTime(null)
            setShowRoutineSelector(false)
            addToast("Routine loaded")
          }}
          onClose={() => setShowRoutineSelector(false)}
        />
      )}
    </div>
  )
}
