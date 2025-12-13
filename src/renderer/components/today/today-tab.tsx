
import { useState, useEffect, useMemo } from "react"
import { DayTimeline, type CalendarEvent } from "./day-timeline"
import { CalendarView } from "./calendar-view"
import { QuickAddBlock } from "./quick-add-block"
import { NaturalLanguageInput } from "./natural-language-input"
import { AIRoutineMaker } from "./ai-routine-maker"
import { TodayStrip } from "./today-strip"
import { ValidationHints } from "./validation-hints"
import { Drawer } from "../drawer"
import { useToastStore } from "../toasts"
import { useJournalStore } from "../../lib/journal-store"
import { useScheduleStore, type TimeBlock } from "../../lib/schedule-store"
import { useSettingsStore } from "../../lib/settings-store"
import { getEffectiveCommitDate, isDateLocked, getCommitTargetDate, isCommitWindowOpen } from "../../lib/schedule-date-utils"
import { getTodayDateStrLocal, getDateStrLocal } from "../../lib/date-utils"
import { loadAccounts } from "../../lib/google-oauth-electron"
import { importEventsFromAllAccounts, googleEventToTimeRange } from "../../lib/google-calendar-api"

export type ViewMode = 'day' | 'week'

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
  const { getTodayCommit, getCommitByDate, commitDay: saveCommit, commits, clearCommitByDate } = useScheduleStore()
  const { settings } = useSettingsStore()
  
  // Helper to get today's date string in local timezone (define early)
  const getTodayDateStr = () => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
  
  // Initialize viewing date to today - ensure we use local date, not UTC
  const [viewingDate, setViewingDate] = useState(() => {
    // Use local date to avoid timezone issues
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth()
    const day = now.getDate()
    return new Date(year, month, day)
  })
  // Convert viewing date to YYYY-MM-DD string using local date, not UTC
  const viewingDateStr = (() => {
    const year = viewingDate.getFullYear()
    const month = String(viewingDate.getMonth() + 1).padStart(2, '0')
    const day = String(viewingDate.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  })()
  const viewingCommit = getCommitByDate(viewingDateStr)
  const todayCommit = getTodayCommit()
  // Check if viewing today using local date comparison
  const isToday = (() => {
    const now = new Date()
    const todayYear = now.getFullYear()
    const todayMonth = now.getMonth()
    const todayDay = now.getDate()
    return viewingDate.getFullYear() === todayYear &&
           viewingDate.getMonth() === todayMonth &&
           viewingDate.getDate() === todayDay
  })()
  
  // Get the effective commit target date (what date you can currently commit for)
  const commitTargetDate = getCommitTargetDate(settings.commitCutoffTime)
  
  // Check if the viewing date is locked (has a commit)
  const viewingDateLocked = isDateLocked(viewingDateStr, viewingCommit?.committed || false, settings.commitCutoffTime)
  
  const [blocks, setBlocks] = useState<TimeBlock[]>(viewingCommit?.blocks || [])
  const [committed, setCommitted] = useState(viewingCommit?.committed || false)
  const [commitTime, setCommitTime] = useState<string | null>(
    viewingCommit?.committed_at ? new Date(viewingCommit.committed_at).toLocaleTimeString() : null
  )
  
  // Check if the commit window is open for the viewing date
  // Use committed state instead of viewingCommit?.committed to ensure we check the current state
  const commitWindowOpen = isCommitWindowOpen(viewingDateStr, committed, settings.commitCutoffTime)
  
  // Debug logging (remove after testing)
  if (import.meta.env.DEV) {
    const todayStr = getTodayDateStr()
    const allCommits = commits || []
    const todayCommit = allCommits.find(c => c.date === todayStr)
    console.log('Commit Window Debug:', {
      viewingDateStr,
      todayStr,
      isToday: viewingDateStr === todayStr,
      committed,
      commitWindowOpen,
      blocksLength: blocks.length,
      cutoffTime: settings.commitCutoffTime,
      todayCommitFound: !!todayCommit,
      todayCommitData: todayCommit ? {
        date: todayCommit.date,
        committed: todayCommit.committed,
        blocks: todayCommit.blocks?.length || 0,
        committed_at: todayCommit.committed_at,
        finalized: !!todayCommit.finalized_at,
      } : null,
      allCommitsDates: allCommits.map(c => ({ date: c.date, committed: c.committed, blocks: c.blocks?.length || 0 })),
    })
  }
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const [showNaturalLanguageInput, setShowNaturalLanguageInput] = useState(false)
  const [showAIRoutineMaker, setShowAIRoutineMaker] = useState(false)
  const [showDrawer, setShowDrawer] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('day')
  const { addToast } = useToastStore()
  const { addEntry } = useJournalStore()
  const [showQuickJournal, setShowQuickJournal] = useState(false)
  const [quickJournalText, setQuickJournalText] = useState("")
  const [currentTime, setCurrentTime] = useState(new Date())
  
  // Google Calendar events state
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([])
  const [loadingCalendarEvents, setLoadingCalendarEvents] = useState(false)
  
  // Undo/Redo history
  const [history, setHistory] = useState<TimeBlock[][]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  
  // Track the last date we checked to detect midnight transitions (using local date)
  const [lastCheckedDate, setLastCheckedDate] = useState(() => {
    return getTodayDateStr()
  })

  // Update current time every minute and check for midnight reset
  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      setCurrentTime(now)
      
      const todayStr = getTodayDateStr()
      
      // Check if we've crossed midnight into a new day
      if (todayStr !== lastCheckedDate) {
        setLastCheckedDate(todayStr)
        
        // Check if today has a commit - if not, reset viewing date to today
        const todayCommit = getCommitByDate(todayStr)
        if (!todayCommit || !todayCommit.committed) {
          // User hasn't committed for today - reset to basic state
          const year = now.getFullYear()
          const month = now.getMonth()
          const day = now.getDate()
          setViewingDate(new Date(year, month, day))
          setBlocks([])
          setCommitted(false)
          setCommitTime(null)
        } else {
          // User has committed - switch to viewing today
          const year = now.getFullYear()
          const month = now.getMonth()
          const day = now.getDate()
          setViewingDate(new Date(year, month, day))
        }
      }
      
      // Also update viewing date if we're viewing a past date, switch to today
      setViewingDate((currentViewingDate) => {
        const currentYear = currentViewingDate.getFullYear()
        const currentMonth = currentViewingDate.getMonth()
        const currentDay = currentViewingDate.getDate()
        const currentViewingDateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(currentDay).padStart(2, '0')}`
        
        // If we're viewing yesterday or earlier, switch to today
        if (currentViewingDateStr < todayStr) {
          const year = now.getFullYear()
          const month = now.getMonth()
          const day = now.getDate()
          return new Date(year, month, day)
        }
        return currentViewingDate
      })
    }
    
    // Update immediately
    updateTime()
    
    // Update every minute
    const interval = setInterval(updateTime, 60000)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastCheckedDate, settings.commitCutoffTime]) // Only depend on lastCheckedDate and cutoffTime

  // Load commit from store when viewing date or commits change
  // This is the single source of truth for what to display
  useEffect(() => {
    const commit = getCommitByDate(viewingDateStr)
    const hasCommit = commit?.committed || false
    const todayStr = getTodayDateStrLocal() // Use LOCAL timezone
    
    // Helpful hint: If viewing today and no commit, check if yesterday has a commit
    if (viewingDateStr === todayStr && (!commit || !hasCommit)) {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayStr = getDateStrLocal(yesterday) // Use LOCAL timezone
      const yesterdayCommit = getCommitByDate(yesterdayStr)
      
      // If yesterday has a commit, show a helpful message
      if (yesterdayCommit && yesterdayCommit.committed && yesterdayCommit.blocks.length > 0) {
        // Only show this once per session to avoid spam
        const lastHintShown = sessionStorage.getItem('commit_hint_yesterday')
        if (!lastHintShown || lastHintShown !== todayStr) {
          addToast(`💡 Your last commit was for yesterday (${yesterday.toLocaleDateString()}). Navigate to yesterday to see it.`, 'info')
          sessionStorage.setItem('commit_hint_yesterday', todayStr)
        }
      }
      
      setBlocks([])
      setCommitted(false)
      setCommitTime(null)
      setHistory([])
      setHistoryIndex(-1)
      return
    }
    
    const isLocked = isDateLocked(viewingDateStr, hasCommit, settings.commitCutoffTime)
    
    if (commit && commit.date === viewingDateStr && hasCommit) {
      // Load the commit - only if it's actually committed
      setBlocks(commit.blocks)
      setCommitted(true)
      setCommitTime(commit.committed_at ? new Date(commit.committed_at).toLocaleTimeString() : null)
    } else if (commit && commit.date === viewingDateStr && commit.blocks.length > 0) {
      // DEBUG: Commit exists but not marked as committed - this might be the issue
      if (import.meta.env.DEV) {
        console.warn('⚠️ Commit found but not marked as committed:', {
          date: commit.date,
          committed: commit.committed,
          blocks: commit.blocks.length,
          committed_at: commit.committed_at,
        })
      }
      // Still load blocks but don't mark as committed (user can re-commit)
      setBlocks(commit.blocks)
      setCommitted(false)
      setCommitTime(null)
    } else {
      // No commit found or not committed - allow editing
      // If there are blocks but no commit, keep them for editing
      if (commit && commit.blocks.length > 0 && !hasCommit) {
        setBlocks(commit.blocks)
      } else if (!commit || commit.blocks.length === 0) {
        setBlocks([])
      }
      setCommitted(false)
      setCommitTime(null)
    }
    // Reset history when changing dates
    setHistory([])
    setHistoryIndex(-1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewingDateStr, commits, settings.commitCutoffTime]) // Removed currentTime from dependencies to prevent refresh while typing

  // Fetch Google Calendar events for the viewing date
  useEffect(() => {
    const fetchCalendarEvents = async () => {
      const accounts = loadAccounts()
      if (accounts.length === 0) {
        setCalendarEvents([])
        return
      }
      
      setLoadingCalendarEvents(true)
      
      try {
        // Create date range for the viewing date (full day)
        const startDate = new Date(viewingDate)
        startDate.setHours(0, 0, 0, 0)
        const endDate = new Date(viewingDate)
        endDate.setHours(23, 59, 59, 999)
        
        const eventsByDate = await importEventsFromAllAccounts(startDate, endDate)
        const events = eventsByDate.get(viewingDateStr) || []
        
        // Convert to CalendarEvent format with rich details
        const calEvents: CalendarEvent[] = []
        for (const event of events) {
          const timeRange = googleEventToTimeRange(event)
          if (!timeRange) continue // Skip all-day events for now
          
          // Extract meeting link from various sources
          let meetingLink = event.hangoutLink
          let meetingProvider = meetingLink ? 'Google Meet' : undefined
          
          // Check conferenceData for other meeting providers
          if (event.conferenceData?.entryPoints) {
            const videoEntry = event.conferenceData.entryPoints.find(
              ep => ep.entryPointType === 'video'
            )
            if (videoEntry) {
              meetingLink = videoEntry.uri
              meetingProvider = event.conferenceData.conferenceSolution?.name || 'Video Call'
            }
          }
          
          calEvents.push({
            id: event.id,
            title: event.summary,
            start: timeRange.start,
            end: timeRange.end,
            isAllDay: false,
            accountEmail: event.accountEmail,
            accountLabel: event.accountLabel,
            accountColor: event.accountColor,
            // Rich details
            description: event.description,
            location: event.location,
            htmlLink: event.htmlLink,
            meetingLink,
            meetingProvider,
            attendees: event.attendees,
            organizer: event.organizer,
          })
        }
        
        setCalendarEvents(calEvents)
      } catch (error) {
        console.error('Error fetching calendar events:', error)
        // Don't show error toast - calendar integration is optional
      } finally {
        setLoadingCalendarEvents(false)
      }
    }
    
    fetchCalendarEvents()
  }, [viewingDateStr, viewingDate])

  const handleUseRoutine = (preset: "weekday" | "weekend") => {
    setBlocks(preset === "weekday" ? [...WEEKDAY_PRESET] : [...WEEKEND_PRESET])
    setCommitted(false)
    setCommitTime(null)
    addToast(`${preset === "weekday" ? "Weekday" : "Weekend"} routine loaded`)
  }

  const handleUseYesterday = () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = getDateStrLocal(yesterday) // Use LOCAL timezone
    const yesterdayCommit = getCommitByDate(yesterdayStr)
    
    if (yesterdayCommit && yesterdayCommit.blocks.length > 0) {
      // Load yesterday's blocks but don't mark as committed (user can edit)
      setBlocks(yesterdayCommit.blocks.map(b => ({ ...b, completed: null }))) // Reset completion status
      setCommitted(false) // Allow editing
      setCommitTime(null)
      addToast("Yesterday's schedule loaded")
    } else {
      addToast("No schedule found for yesterday", "error")
    }
  }

  const handleClearDay = () => {
    setBlocks([])
    setCommitted(false)
    setCommitTime(null)
    addToast("Day cleared")
  }

  const handleUncommitDay = () => {
    if (!viewingCommit || !viewingCommit.committed) {
      addToast("No commit found for this date", "error")
      return
    }
    
    // ANTI-GAMING: Prevent uncommitting finalized days
    if (viewingCommit.finalized_at) {
      addToast("Cannot uncommit: This day has already passed and is locked to prevent gaming stats.", "error")
      return
    }
    
    try {
      clearCommitByDate(viewingDateStr)
      setCommitted(false)
      setCommitTime(null)
      addToast(`Uncommitted ${new Date(viewingDateStr).toLocaleDateString()}`)
    } catch (error) {
      addToast(error instanceof Error ? error.message : "Cannot uncommit this day", "error")
    }
  }

  const handleCommitDay = () => {
    if (blocks.length === 0) {
      addToast("Add some blocks before committing", "error")
      return
    }
    
    // ANTI-GAMING: Prevent re-committing finalized days
    const existingCommit = getCommitByDate(viewingDateStr)
    if (existingCommit && existingCommit.finalized_at) {
      addToast("Cannot commit: This day has already passed and is locked to prevent gaming stats.", "error")
      return
    }
    
    try {
      // Commit to the viewing date (user selects which date to commit for)
      // Ensure completion status is null for future dates (blocks haven't happened yet)
      const today = getTodayDateStrLocal() // Use LOCAL timezone
      const blocksToCommit = viewingDateStr > today 
        ? blocks.map(b => ({ ...b, completed: null })) // Clear completion for future dates
        : blocks
      
      // Commit to the viewing date
      saveCommit(blocksToCommit, viewingDateStr)
      setCommitted(true)
      setCommitTime(new Date().toLocaleTimeString())
      
      // Show helpful message
      addToast(`Committed for ${new Date(viewingDateStr).toLocaleDateString()}. Stay accountable.`)
    } catch (error) {
      addToast(error instanceof Error ? error.message : "Cannot commit this day", "error")
    }
  }
  
  const handleViewNextDay = () => {
    const nextDay = new Date(viewingDate)
    nextDay.setDate(nextDay.getDate() + 1)
    setViewingDate(nextDay)
  }
  
  const handleViewToday = () => {
    // Always view today's actual date (local timezone)
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth()
    const day = now.getDate()
    setViewingDate(new Date(year, month, day))
  }
  
  const formatDateDisplay = (date: Date): string => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
    return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}`
  }
  
  const formatTimeDisplay = (date: Date): string => {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
  }

  // Save state to history before making changes
  const saveToHistory = (newBlocks: TimeBlock[]) => {
    // Remove any future history if we're not at the end
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push([...blocks]) // Save current state before change
    // Limit history to last 50 actions
    if (newHistory.length > 50) {
      newHistory.shift()
    } else {
      setHistoryIndex(newHistory.length - 1)
    }
    setHistory(newHistory)
  }

  // Undo function
  const handleUndo = () => {
    if (historyIndex >= 0 && history[historyIndex]) {
      const previousState = history[historyIndex]
      setHistoryIndex(historyIndex - 1)
      setBlocks([...previousState])
      addToast("Undone")
    }
  }

  // Redo function
  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1]
      setHistoryIndex(historyIndex + 1)
      setBlocks([...nextState])
      addToast("Redone")
    }
  }

  const handleAddBlock = (block: Omit<TimeBlock, "id">) => {
    saveToHistory(blocks)
    const newBlock = { ...block, id: Math.random().toString(36).substring(7) }
    setBlocks([...blocks, newBlock])
    setShowQuickAdd(false)
    addToast("Block added")
    return newBlock
  }

  const handleUpdateBlock = (id: string, updates: Partial<TimeBlock>) => {
    // ANTI-GAMING: Prevent editing blocks after they've passed (for committed days)
    if (committed && viewingCommit) {
      const block = blocks.find((b) => b.id === id)
      if (block) {
        const [endHour, endMin] = block.end.split(":").map(Number)
        const blockEndTime = new Date()
        blockEndTime.setHours(endHour, endMin, 0, 0)
        blockEndTime.setSeconds(0, 0)
        
        const now = new Date()
        const viewingDateObj = new Date(viewingDate)
        viewingDateObj.setHours(0, 0, 0, 0)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const isPastDate = viewingDateObj.getTime() < today.getTime()
        
        // If block has passed, prevent editing (unless it's just completion status)
        if (isPastDate || (viewingDateObj.getTime() === today.getTime() && now.getTime() >= blockEndTime.getTime())) {
          // Only allow updating completion status, not block details
          const allowedUpdates = ['completed', 'optional'] // Allow these for Yes/No functionality
          const updateKeys = Object.keys(updates)
          const hasDisallowedUpdate = updateKeys.some(key => !allowedUpdates.includes(key))
          
          if (hasDisallowedUpdate) {
            addToast("Cannot edit: This block has already passed and is locked to prevent gaming stats.", "error")
            return
          }
        }
      }
    }
    
    // Only save to history if this is a meaningful change (not just dragging)
    const block = blocks.find((b) => b.id === id)
    if (block && updates.identity && updates.identity !== block.identity) {
      // Title change - save to history
      saveToHistory(blocks)
    }
    setBlocks(blocks.map((b) => (b.id === id ? { ...b, ...updates } : b)))
  }

  const handleDeleteBlock = (id: string) => {
    // ANTI-GAMING: Prevent deleting blocks after they've passed (for committed days)
    if (committed && viewingCommit) {
      const block = blocks.find((b) => b.id === id)
      if (block) {
        const [endHour, endMin] = block.end.split(":").map(Number)
        const blockEndTime = new Date()
        blockEndTime.setHours(endHour, endMin, 0, 0)
        blockEndTime.setSeconds(0, 0)
        
        const now = new Date()
        const viewingDateObj = new Date(viewingDate)
        viewingDateObj.setHours(0, 0, 0, 0)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const isPastDate = viewingDateObj.getTime() < today.getTime()
        
        // If block has passed, prevent deletion
        if (isPastDate || (viewingDateObj.getTime() === today.getTime() && now.getTime() >= blockEndTime.getTime())) {
          addToast("Cannot delete: This block has already passed and is locked to prevent gaming stats.", "error")
          return
        }
      }
    }
    
    saveToHistory(blocks)
    setBlocks(blocks.filter((b) => b.id !== id))
    addToast("Block deleted")
  }

  // Undo/Redo keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey
      
      if (isMod && e.key === "z" && !e.shiftKey) {
        e.preventDefault()
        if (historyIndex >= 0 && history[historyIndex]) {
          const previousState = history[historyIndex]
          setHistoryIndex(historyIndex - 1)
          setBlocks([...previousState])
          addToast("Undone")
        }
      } else if ((isMod && e.key === "z" && e.shiftKey) || (isMod && e.key === "y")) {
        e.preventDefault()
        if (historyIndex < history.length - 1) {
          const nextState = history[historyIndex + 1]
          setHistoryIndex(historyIndex + 1)
          setBlocks([...nextState])
          addToast("Redone")
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [history, historyIndex, addToast])

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

  // Calculate total time
  const totalMinutes = blocks.reduce((sum, block) => {
    const start = Number.parseInt(block.start.split(":")[0]) * 60 + Number.parseInt(block.start.split(":")[1])
    const end = Number.parseInt(block.end.split(":")[0]) * 60 + Number.parseInt(block.end.split(":")[1])
    return sum + (end - start)
  }, 0)
  const totalHours = Math.floor(totalMinutes / 60)
  const totalMins = totalMinutes % 60
  const totalTimeDisplay = totalHours > 0 ? `${totalHours}h ${totalMins}m` : `${totalMins}m`

  return (
    <div className="h-full flex flex-col">
      {/* Compact Header */}
      <div className="border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Left: Date Navigation */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                const prevDay = new Date(viewingDate)
                prevDay.setDate(prevDay.getDate() - 1)
                setViewingDate(prevDay)
              }}
              className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded transition-colors"
              title="Previous day"
            >
              ‹
            </button>
            <button
              onClick={handleViewToday}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                isToday 
                  ? 'bg-primary text-primary-foreground' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
              }`}
            >
              {isToday ? 'Today' : formatDateDisplay(viewingDate)}
            </button>
            <button
              onClick={handleViewNextDay}
              className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded transition-colors"
              title="Next day"
            >
              ›
            </button>
            
            {/* Status badges */}
            {isToday && (
              <span className="text-xs text-muted-foreground ml-2">
                {formatTimeDisplay(currentTime)}
              </span>
            )}
            {calendarEvents.length > 0 && (
              <span className="px-2 py-0.5 bg-blue-500/10 text-blue-500 rounded text-xs ml-2">
                {calendarEvents.length} events
              </span>
            )}
            {committed && (
              <span className="px-2 py-0.5 bg-primary/20 text-primary rounded text-xs ml-2">
                ✓ Committed
              </span>
            )}
          </div>
          
          {/* Center: View Toggle */}
          <div className="flex items-center gap-0.5 bg-secondary/50 rounded-md p-0.5">
            <button
              onClick={() => setViewMode('day')}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                viewMode === 'day' 
                  ? 'bg-background text-foreground shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Day
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                viewMode === 'week' 
                  ? 'bg-background text-foreground shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Week
            </button>
          </div>

          {/* Right: Commit Action */}
          <div className="flex items-center gap-2">
            {!committed ? (
              <button
                onClick={handleCommitDay}
                disabled={blocks.length === 0 || !commitWindowOpen}
                className="px-4 py-1.5 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title={!commitWindowOpen ? `Commit window opens at ${settings.commitCutoffTime || "22:00"}` : "Commit your schedule"}
              >
                Commit
              </button>
            ) : (
              <button
                onClick={handleUncommitDay}
                className="px-3 py-1.5 text-sm text-destructive hover:bg-destructive/10 rounded-md transition-colors"
              >
                Uncommit
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {/* Week/Month View using FullCalendar */}
        {viewMode !== 'day' && (
          <div className="h-full px-4 py-4 flex flex-col gap-4">
            {/* Today Strip - quick view of today in week/month mode */}
            {isToday && (blocks.length > 0 || calendarEvents.length > 0) && (
              <TodayStrip
                blocks={blocks}
                calendarEvents={calendarEvents}
                currentTime={currentTime}
                onBlockClick={(blockId) => {
                  setViewMode('day')
                  addToast(`Viewing block`)
                }}
                onEventClick={(event) => {
                  setViewMode('day')
                  addToast(`Viewing event: ${event.title}`)
                }}
                compact
              />
            )}
            
            <div className="flex-1">
            <CalendarView
              viewMode="week"
              blocks={blocks}
              calendarEvents={calendarEvents}
              viewingDate={viewingDate}
              onDateChange={(date) => {
                setViewingDate(date)
                setViewMode('day') // Switch to day view when clicking a date
              }}
              onBlockClick={(blockId) => {
                // Handle block click - could show edit modal
                const block = blocks.find(b => b.id === blockId)
                if (block) {
                  addToast(`Block: ${block.identity}`)
                }
              }}
              onEventClick={(event) => {
                // Event click is handled inside CalendarView
                addToast(`Event: ${event.title}`)
              }}
              onAddBlock={(start, end, date) => {
                // Switch to day view and add block
                const [year, month, day] = date.split('-').map(Number)
                setViewingDate(new Date(year, month - 1, day))
                setViewMode('day')
                handleAddBlock({ identity: 'New Block', start, end })
              }}
            />
            </div>
          </div>
        )}
        
        {/* Day View - original timeline */}
        {viewMode === 'day' && (
          <div className="flex flex-col h-full">
            {/* Compact Quick Add Bar */}
            <div className="px-4 py-3 border-b border-border bg-secondary/20">
              {showNaturalLanguageInput ? (
                <div className="border border-primary/30 rounded-lg p-3 bg-card">
                  <NaturalLanguageInput
                    onAdd={(item) => {
                      handleAddBlock(item)
                      setShowNaturalLanguageInput(false)
                    }}
                    onCancel={() => setShowNaturalLanguageInput(false)}
                  />
                </div>
              ) : showQuickAdd ? (
                <QuickAddBlock onAdd={handleAddBlock} onCancel={() => setShowQuickAdd(false)} />
              ) : (
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    placeholder='+ Add block: "Workout at 6am" or drag on timeline'
                    className="flex-1 px-3 py-2 bg-background border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-sm"
                    onFocus={() => setShowNaturalLanguageInput(true)}
                    readOnly
                  />
                  <button
                    onClick={() => setShowQuickAdd(true)}
                    className="p-2 text-muted-foreground hover:text-foreground border border-border rounded-md hover:bg-secondary/50 transition-colors"
                    title="Add with form"
                  >
                    ⚙️
                  </button>
                  <button
                    onClick={() => setShowAIRoutineMaker(true)}
                    className="p-2 text-primary hover:text-primary/80 border border-primary/30 rounded-md hover:bg-primary/5 transition-colors"
                    title="AI Routine Maker"
                  >
                    ✨
                  </button>
                  <button
                    onClick={() => setShowDrawer(true)}
                    className="p-2 text-muted-foreground hover:text-foreground border border-border rounded-md hover:bg-secondary/50 transition-colors"
                    title="More options"
                  >
                    ⋯
                  </button>
                </div>
              )}
            </div>
            
            {/* Validation hints - compact */}
            {blocks.length > 0 && (
              <div className="px-4 py-2 border-b border-border">
                <ValidationHints blocks={blocks} />
              </div>
            )}
            
            {/* Main Timeline - takes remaining space */}
            <div className="flex-1 overflow-auto px-4 py-4">
              {/* Loading state */}
              {loadingCalendarEvents && blocks.length === 0 && calendarEvents.length === 0 && (
                <div className="text-center py-8">
                  <div className="animate-pulse text-muted-foreground text-sm">
                    Loading your calendar...
                  </div>
                </div>
              )}
              
              {/* Empty state - only when truly empty */}
              {blocks.length === 0 && calendarEvents.length === 0 && !loadingCalendarEvents && (
                <div className="text-center py-12">
                  <div className="w-12 h-12 rounded-full bg-secondary/50 flex items-center justify-center mb-3 mx-auto">
                    <span className="text-xl">📅</span>
                  </div>
                  <h3 className="text-base font-medium text-foreground mb-1">Plan Your Day</h3>
                  <p className="text-sm text-muted-foreground">
                    Type above or drag on timeline to add blocks
                  </p>
                </div>
              )}
              
              {/* Timeline */}
              {(blocks.length > 0 || calendarEvents.length > 0) && (
                <DayTimeline
                  blocks={blocks}
                  onUpdateBlock={handleUpdateBlock}
                  onDeleteBlock={handleDeleteBlock}
                  onAddBlock={handleAddBlock}
                  viewingDate={viewingDate}
                  isCommitted={committed}
                  calendarEvents={calendarEvents}
                />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Drawer for Secondary Actions */}
      <Drawer isOpen={showDrawer} onClose={() => setShowDrawer(false)} title="Schedule Options">
        <div className="space-y-6">
          {/* Routines Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Routines</h3>
            <div className="space-y-2">
              <button
                onClick={() => {
                  handleUseRoutine("weekday")
                  setShowDrawer(false)
                }}
                className="w-full px-4 py-3 text-left bg-secondary/50 hover:bg-secondary rounded-md transition-colors"
              >
                <div className="font-medium text-foreground">Weekday Routine</div>
                <div className="text-xs text-muted-foreground mt-0.5">Morning, Deep Work, Exercise, Wind Down</div>
              </button>
              <button
                onClick={() => {
                  handleUseRoutine("weekend")
                  setShowDrawer(false)
                }}
                className="w-full px-4 py-3 text-left bg-secondary/50 hover:bg-secondary rounded-md transition-colors"
              >
                <div className="font-medium text-foreground">Weekend Routine</div>
                <div className="text-xs text-muted-foreground mt-0.5">Relaxed schedule for weekends</div>
              </button>
            </div>
          </div>

          {/* Actions Section */}
          <div className="space-y-3 border-t border-border pt-4">
            <h3 className="text-sm font-semibold text-foreground">Actions</h3>
            <div className="space-y-2">
              <button
                onClick={() => {
                  handleUseYesterday()
                  setShowDrawer(false)
                }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-secondary rounded-md transition-colors"
              >
                Use Yesterday's Schedule
              </button>
              <button
                onClick={() => {
                  setShowQuickJournal(true)
                  setShowDrawer(false)
                }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-secondary rounded-md transition-colors"
              >
                Quick Journal Entry
              </button>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="space-y-3 border-t border-border pt-4">
            <h3 className="text-sm font-semibold text-foreground">Danger Zone</h3>
            <button
              onClick={() => {
                if (confirm("Are you sure you want to clear all blocks for this day?")) {
                  handleClearDay()
                  setShowDrawer(false)
                }
              }}
              className="w-full px-4 py-2 text-left text-sm text-destructive hover:bg-destructive/10 rounded-md transition-colors"
            >
              Clear All Blocks
            </button>
          </div>
        </div>
      </Drawer>
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
      
      {/* AI Routine Maker Modal */}
      {showAIRoutineMaker && (
        <AIRoutineMaker
          blocks={blocks}
          calendarEvents={calendarEvents}
          onAddBlocks={(newBlocks) => {
            for (const block of newBlocks) {
              handleAddBlock(block)
            }
            addToast(`Added ${newBlocks.length} blocks to your schedule`)
          }}
          onClose={() => setShowAIRoutineMaker(false)}
        />
      )}
    </div>
  )
}
