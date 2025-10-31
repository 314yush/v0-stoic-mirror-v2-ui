import { useScheduleStore, type DayCommit } from '../../lib/schedule-store'
import { useJournalStore } from '../../lib/journal-store'
import { useToastStore } from '../toasts'
import { useState, useEffect, useMemo } from 'react'

// Calculate overall streak from commits
function calculateOverallStreak(commits: DayCommit[]): number {
  const sortedCommits = [...commits]
    .filter((c) => c.committed)
    .sort((a, b) => b.date.localeCompare(a.date)) // Most recent first
  
  if (sortedCommits.length === 0) return 0
  
  const today = new Date().toISOString().split('T')[0]
  let streak = 0
  let expectedDate = today
  
  for (const commit of sortedCommits) {
    if (commit.date === expectedDate) {
      // Check if at least one block was completed
      const hasCompleted = commit.blocks.some((b) => b.completed === true)
      if (hasCompleted) {
        streak++
        // Move to previous day
        const prevDate = new Date(expectedDate)
        prevDate.setDate(prevDate.getDate() - 1)
        expectedDate = prevDate.toISOString().split('T')[0]
      } else {
        // Streak broken if no blocks completed
        break
      }
    } else {
      // Date gap found, streak broken
      break
    }
  }
  
  return streak
}

export function MinimalWidget() {
  const { getTodayCommit, updateBlockCompletion, commits } = useScheduleStore()
  const { addEntry } = useJournalStore()
  const { addToast } = useToastStore()
  const [quickJournal, setQuickJournal] = useState('')
  const [currentTime, setCurrentTime] = useState(new Date())

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000)
    return () => clearInterval(interval)
  }, [])

  const commit = getTodayCommit()
  const currentHour = currentTime.getHours()
  const currentMinute = currentTime.getMinutes()
  const currentTimeMinutes = currentHour * 60 + currentMinute

  // Find current active block
  const activeBlock = commit?.blocks.find((block) => {
    const [startH, startM] = block.start.split(':').map(Number)
    const [endH, endM] = block.end.split(':').map(Number)
    const startTime = startH * 60 + startM
    const endTime = endH * 60 + endM
    return currentTimeMinutes >= startTime && currentTimeMinutes < endTime
  })

  // Find next block
  const nextBlock = commit?.blocks
    .filter((block) => {
      const [startH] = block.start.split(':').map(Number)
      return startH * 60 > currentTimeMinutes
    })
    .sort((a, b) => {
      const [aH] = a.start.split(':').map(Number)
      const [bH] = b.start.split(':').map(Number)
      return aH - bH
    })[0]

  // Calculate today's adherence
  const completedBlocks = commit?.blocks.filter((b) => b.completed === true).length || 0
  const totalBlocks = commit?.blocks.length || 0
  const adherence = totalBlocks > 0 ? Math.round((completedBlocks / totalBlocks) * 100) : 0

  // Calculate streak from real data
  const streak = useMemo(() => calculateOverallStreak(commits), [commits])

  const calculateTimeRemaining = (endTime: string): string => {
    const [endH, endM] = endTime.split(':').map(Number)
    const now = new Date()
    const end = new Date()
    end.setHours(endH, endM, 0, 0)

    const diff = end.getTime() - now.getTime()
    if (diff <= 0) return '0m'

    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }

  const handleMarkComplete = () => {
    if (activeBlock) {
      updateBlockCompletion(activeBlock.id, true)
      // Also update local state
      addToast(`"${activeBlock.identity}" marked as completed`, 'success')
    }
  }

  const handleQuickJournal = () => {
    if (quickJournal.trim()) {
      addEntry({
        content: quickJournal,
        tags: [],
        is_sensitive: false,
        visibility: 'private',
      })
      setQuickJournal('')
      addToast('Journal entry saved', 'success')
    }
  }

  const handleClose = () => {
    if (window.electronAPI) {
      window.electronAPI.window.close()
    }
  }

  const handleOpenMain = () => {
    if (window.electronAPI) {
      window.electronAPI.window.openMain()
      handleClose()
    }
  }

  return (
    <div className="w-full h-full bg-background/95 backdrop-blur-lg rounded-lg border border-border shadow-xl p-4 text-foreground flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">⚡ Mindful OS</h2>
        <button
          onClick={handleClose}
          className="text-muted-foreground hover:text-foreground transition-colors text-xl leading-none"
          aria-label="Close"
        >
          ×
        </button>
      </div>

      {/* Current Block */}
      {activeBlock ? (
        <div className="mb-4 p-3 bg-primary/10 border border-primary/30 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium text-sm">🎯 {activeBlock.identity}</span>
            <span className="text-xs text-muted-foreground">
              {activeBlock.start} - {activeBlock.end}
            </span>
          </div>
          <div className="text-xs text-muted-foreground mb-3">
            ⏱️ {calculateTimeRemaining(activeBlock.end)} remaining
          </div>
          <button
            onClick={handleMarkComplete}
            disabled={activeBlock.completed === true}
            className="w-full py-2 text-xs font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {activeBlock.completed ? '✓ Completed' : 'Mark Complete'}
          </button>
        </div>
      ) : (
        <div className="mb-4 p-3 bg-secondary/50 rounded-lg text-center text-sm text-muted-foreground">
          No active block
        </div>
      )}

      {/* Quick Journal */}
      <div className="mb-4">
        <textarea
          value={quickJournal}
          onChange={(e) => setQuickJournal(e.target.value)}
          placeholder="Quick journal entry..."
          rows={2}
          className="w-full p-2 bg-secondary border border-border rounded-md text-sm mb-2 resize-none text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault()
              handleQuickJournal()
            }
          }}
        />
        <button
          onClick={handleQuickJournal}
          disabled={!quickJournal.trim()}
          className="w-full py-2 text-xs font-medium bg-secondary text-foreground rounded-md hover:bg-secondary/80 disabled:opacity-50 transition-colors"
        >
          📝 Save Journal
        </button>
      </div>

      {/* Stats */}
      <div className="mb-4 p-3 bg-secondary/30 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground">Progress</span>
          <span className="text-xs font-medium">{adherence}%</span>
        </div>
        <div className="w-full bg-secondary rounded-full h-2 mb-2">
          <div
            className="bg-primary h-2 rounded-full transition-all"
            style={{ width: `${adherence}%` }}
          />
        </div>
        <div className="text-xs text-muted-foreground">
          🔥 {streak} day streak
        </div>
      </div>

      {/* Next Block */}
      {nextBlock && (
        <div className="text-xs text-muted-foreground mb-4">
          Next: {nextBlock.identity} at {nextBlock.start}
        </div>
      )}

      {/* Open Full App */}
      <button
        onClick={handleOpenMain}
        className="w-full mt-auto py-2 text-xs text-muted-foreground hover:text-foreground border border-border rounded-md transition-colors"
      >
        Open Full App →
      </button>
    </div>
  )
}


