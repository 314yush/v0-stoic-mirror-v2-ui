import { useScheduleStore, type DayCommit } from '../../lib/schedule-store'
import { useJournalStore } from '../../lib/journal-store'
import { useTasksStore } from '../../lib/tasks-store'
import { useToastStore } from '../toasts'
import { useSettingsStore } from '../../lib/settings-store'
import { getAIProvider, getAIProviderWithFallback, type AIConfig } from '../../lib/ai-providers'
import { useState, useEffect, useMemo } from 'react'
import { HourglassIcon } from '../icons/hourglass-icon'
import { ScrollIcon } from '../icons/scroll-icon'
import { CheckmarkIcon } from '../icons/checkmark-icon'
import { WidgetIcon } from '../icons/widget-icon'

type WidgetTab = 'schedule' | 'tasks' | 'journal'

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
  const { tasks, addTask, toggleTask } = useTasksStore()
  const { addToast } = useToastStore()
  const [activeTab, setActiveTab] = useState<WidgetTab>('schedule')
  const [quickJournal, setQuickJournal] = useState('')
  const [quickTask, setQuickTask] = useState('')
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

  // Task stats
  const remainingTasks = tasks.filter((t) => !t.completed).length
  const totalTasks = tasks.length
  const completedTasks = tasks.filter((t) => t.completed).length
  const taskCompletion = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  // Get next 3 incomplete tasks (newest first)
  const nextIncompleteTasks = useMemo(() => {
    return tasks
      .filter((t) => !t.completed)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 3)
  }, [tasks])

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

  const handleQuickTask = () => {
    if (!quickTask.trim()) return
    
    addTask({
      text: quickTask.trim(),
      completed: false,
    })
    setQuickTask('')
    addToast('Task added', 'success')
  }

  const handleQuickJournal = async () => {
    if (!quickJournal.trim()) return

    const journalText = quickJournal.trim()
    setQuickJournal('') // Clear input immediately
    
    // Save entry immediately with placeholder values
    const entry = addEntry({
      content: journalText,
      tags: [],
      is_sensitive: false,
      visibility: 'private',
    })

    // Generate title and mood using AI in the background
    try {
      const { settings } = useSettingsStore.getState()
      const getAIConfig = (): AIConfig => {
        if (settings.aiProvider === "ollama") {
          return {
            provider: "ollama",
            ollamaUrl: settings.ollamaUrl,
            ollamaModel: settings.ollamaModel,
          }
        } else {
          return {
            provider: "gemini",
            apiKey: settings.geminiApiKey || "",
            model: "gemini-2.5-flash",
          }
        }
      }

      const fallbackConfig: AIConfig = {
        provider: "gemini",
        apiKey: settings.geminiApiKey || "",
        model: "gemini-2.5-flash",
      }

      let provider
      const config = getAIConfig()
      if (config.provider === "ollama") {
        provider = await getAIProviderWithFallback(config, fallbackConfig)
      } else {
        provider = getAIProvider(config)
      }

      // Generate title and mood in parallel
      const [title, mood] = await Promise.all([
        provider.generateTitle(journalText),
        provider.suggestMood(journalText),
      ])

      // Update entry with AI-generated title and mood
      const { updateEntry } = useJournalStore.getState()
      updateEntry(entry.id, {
        title,
        mood: mood as any,
      })

      addToast('Journal entry saved with AI title & mood', 'success')
    } catch (error) {
      // If AI generation fails, entry is still saved, just without title/mood
      console.error('Failed to generate title/mood:', error)
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
    <div className="widget-glass-container w-full h-full p-4 text-foreground flex flex-col relative overflow-hidden">
      {/* Glass effect overlay elements */}
      <div className="widget-glass-overlay-top absolute top-0 left-0 right-0 h-px pointer-events-none" />
      <div className="widget-glass-overlay-left absolute top-0 left-0 w-px h-full pointer-events-none" />
      
      {/* Header */}
      <div className="flex items-center justify-between mb-3 relative z-10">
        <div className="flex items-center gap-2">
          <WidgetIcon size={20} className="" />
          <h2 className="text-lg font-semibold">Stoic Mirror</h2>
        </div>
        <button
          onClick={handleClose}
          className="text-muted-foreground hover:text-foreground transition-colors text-xl leading-none"
          aria-label="Close"
        >
          ×
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-border/30 relative z-10">
        <button
          onClick={() => setActiveTab('schedule')}
          className={`flex-1 py-2 text-xs font-medium transition-colors border-b-2 flex items-center justify-center gap-1 ${
            activeTab === 'schedule'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <HourglassIcon size={14} />
          <span>Schedule</span>
        </button>
        <button
          onClick={() => setActiveTab('tasks')}
          className={`flex-1 py-2 text-xs font-medium transition-colors border-b-2 flex items-center justify-center gap-1 ${
            activeTab === 'tasks'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <CheckmarkIcon size={14} />
          <span>Tasks {remainingTasks > 0 && `(${remainingTasks})`}</span>
        </button>
        <button
          onClick={() => setActiveTab('journal')}
          className={`flex-1 py-2 text-xs font-medium transition-colors border-b-2 flex items-center justify-center gap-1 ${
            activeTab === 'journal'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <ScrollIcon size={14} />
          <span>Journal</span>
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto relative z-10">
        {activeTab === 'schedule' && (
          <div className="space-y-4">
            {/* Current Block */}
            {activeBlock ? (
              <div className="p-3 bg-primary/10 backdrop-blur-sm border border-primary/30 rounded-lg">
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
                  className="w-full py-2 text-xs font-medium bg-primary/80 backdrop-blur-sm text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 transition-colors border border-primary/30"
                >
                  {activeBlock.completed ? '✓ Completed' : 'Mark Complete'}
                </button>
              </div>
            ) : (
              <div className="p-3 bg-secondary/30 backdrop-blur-sm rounded-lg text-center text-sm text-muted-foreground border border-border/20">
                No active block
              </div>
            )}

            {/* Stats */}
            <div className="p-3 bg-secondary/20 backdrop-blur-sm rounded-lg border border-border/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">Progress</span>
                <span className="text-xs font-medium">{adherence}%</span>
              </div>
              <div className="w-full bg-white/10 dark:bg-white/5 rounded-full h-2 mb-2 backdrop-blur-sm">
                <div
                  className="bg-primary/80 backdrop-blur-sm h-2 rounded-full transition-all"
                  style={{ width: `${adherence}%` }}
                />
              </div>
              <div className="text-xs text-muted-foreground">
                🔥 {streak} day streak
              </div>
            </div>

            {/* Next Block */}
            {nextBlock && (
              <div className="text-xs text-muted-foreground">
                Next: {nextBlock.identity} at {nextBlock.start}
              </div>
            )}
          </div>
        )}

        {activeTab === 'tasks' && (
          <div className="space-y-4">
            {/* Task Stats */}
            {totalTasks > 0 && (
              <div className="p-3 bg-secondary/20 backdrop-blur-sm rounded-lg border border-border/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">Tasks</span>
                  <span className="text-xs font-medium">
                    {remainingTasks} remaining
                  </span>
                </div>
                <div className="w-full bg-[rgba(255,255,255,0.2)] dark:bg-[rgba(255,255,255,0.1)] rounded-full h-2 mb-2 overflow-hidden border border-border/30">
                  <div
                    className="bg-[rgba(34,197,94,0.8)] dark:bg-[rgba(34,197,94,0.9)] h-full rounded-full transition-all duration-300"
                    style={{ width: `${taskCompletion}%`, minWidth: taskCompletion > 0 ? '4px' : '0px' }}
                  />
                </div>
                <div className="text-xs text-muted-foreground">
                  {completedTasks} of {totalTasks} completed ({taskCompletion}%)
                </div>
              </div>
            )}

            {/* Quick Add Task */}
            <div>
              <input
                type="text"
                value={quickTask}
                onChange={(e) => setQuickTask(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleQuickTask()
                  }
                }}
                placeholder="Add a task..."
                className="w-full p-2 bg-white/10 dark:bg-white/5 backdrop-blur-sm border border-border/30 rounded-md text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50"
              />
            </div>

            {/* Task List */}
            {nextIncompleteTasks.length > 0 ? (
              <div className="space-y-2">
                {nextIncompleteTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-2 p-2 bg-white/10 dark:bg-white/5 backdrop-blur-sm border border-border/30 rounded-lg hover:border-primary/50 transition-colors"
                  >
                    <button
                      onClick={() => toggleTask(task.id)}
                      className={`w-4 h-4 rounded border-2 transition-colors flex items-center justify-center shrink-0 ${
                        task.completed
                          ? 'bg-primary border-primary text-primary-foreground'
                          : 'border-border hover:border-primary'
                      }`}
                      aria-label={task.completed ? "Mark incomplete" : "Mark complete"}
                    >
                      {task.completed && '✓'}
                    </button>
                    <span className={`flex-1 text-sm ${
                      task.completed ? 'line-through text-muted-foreground' : 'text-foreground'
                    }`}>
                      {task.text}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-sm text-muted-foreground">
                {totalTasks === 0 ? 'No tasks yet. Add one above!' : 'All tasks completed! 🎉'}
              </div>
            )}
          </div>
        )}

        {activeTab === 'journal' && (
          <div className="space-y-4">
            <div>
              <textarea
                value={quickJournal}
                onChange={(e) => setQuickJournal(e.target.value)}
                placeholder="Quick journal entry..."
                rows={4}
                className="w-full p-2 bg-white/10 dark:bg-white/5 backdrop-blur-sm border border-border/30 rounded-md text-sm resize-none text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50"
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
                className="w-full mt-2 py-2 text-xs font-medium bg-white/15 dark:bg-white/10 backdrop-blur-sm text-foreground rounded-md hover:bg-white/20 dark:hover:bg-white/15 disabled:opacity-50 transition-colors border border-border/30"
              >
                📝 Save Journal
              </button>
            </div>
            <div className="text-xs text-muted-foreground text-center">
              Press Cmd/Ctrl + Enter to save quickly
            </div>
          </div>
        )}
      </div>

      {/* Open Full App */}
      <button
        onClick={handleOpenMain}
        className="w-full mt-4 py-2 text-xs text-muted-foreground hover:text-foreground bg-white/10 dark:bg-white/5 backdrop-blur-sm border border-border/30 rounded-md transition-colors relative z-10 hover:bg-white/15 dark:hover:bg-white/10"
      >
        Open Full App →
      </button>
    </div>
  )
}


