/**
 * Daily Habits Grid
 * Shows habit completion status for each day of the week
 */

import { useState, useMemo } from "react"
import { useHabitsStore, type Habit, type HabitWithStats } from "../../lib/habits-store"
import { HabitSetupModal } from "./habit-setup-modal"
import { syncCompletionToSupabase } from "../../lib/habits-sync-service"
import { getTodayDateStrLocal } from "../../lib/date-utils"

// ============================================
// Helper functions
// ============================================

function getWeekDates(weekStart: Date): string[] {
  const dates: string[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + i)
    dates.push(d.toISOString().split('T')[0])
  }
  return dates
}

function getWeekStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Monday as start
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function formatDayLabel(dateStr: string): string {
  const date = new Date(dateStr)
  return ['S', 'M', 'T', 'W', 'T', 'F', 'S'][date.getDay()]
}

function isToday(dateStr: string): boolean {
  return dateStr === getTodayDateStrLocal()
}

function isFuture(dateStr: string): boolean {
  const today = getTodayDateStrLocal()
  return dateStr > today
}

// ============================================
// Component
// ============================================

export function DailyHabitsGrid() {
  const { habits, completions, toggleCompletion, getAllHabitsWithStats } = useHabitsStore()
  const [showSetupModal, setShowSetupModal] = useState(false)
  const [editingHabit, setEditingHabit] = useState<Habit | undefined>()
  
  // Get current week dates
  const weekStart = useMemo(() => getWeekStart(new Date()), [])
  const weekDates = useMemo(() => getWeekDates(weekStart), [weekStart])
  
  // Get active habits with stats
  const habitsWithStats = getAllHabitsWithStats()
  
  // Get completions map for quick lookup
  const completionsMap = useMemo(() => {
    const map = new Map<string, boolean>() // "habitId-date" -> completed
    completions.forEach(c => {
      map.set(`${c.habitId}-${c.date}`, c.completed)
    })
    return map
  }, [completions])
  
  const handleToggle = (habitId: string, date: string) => {
    // Don't allow toggling future dates
    if (isFuture(date)) return
    
    toggleCompletion(habitId, date)
    
    // Find the completion to sync
    const completion = completions.find(c => c.habitId === habitId && c.date === date)
    if (completion) {
      syncCompletionToSupabase({
        ...completion,
        completed: !completion.completed,
        completedAt: !completion.completed ? new Date().toISOString() : undefined
      }, "upsert").catch(console.error)
    }
  }
  
  const handleEditHabit = (habit: Habit) => {
    setEditingHabit(habit)
    setShowSetupModal(true)
  }
  
  const handleCloseModal = () => {
    setShowSetupModal(false)
    setEditingHabit(undefined)
  }
  
  if (habitsWithStats.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="text-base font-medium mb-4">Daily Habits</h3>
        <div className="text-center py-8">
          <div className="text-4xl mb-3">🎯</div>
          <p className="text-muted-foreground text-sm mb-4">
            Track your daily habits to build consistency
          </p>
          <button
            onClick={() => setShowSetupModal(true)}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Set Up Habits
          </button>
        </div>
        
        <HabitSetupModal 
          isOpen={showSetupModal} 
          onClose={handleCloseModal}
          editingHabit={editingHabit}
        />
      </div>
    )
  }
  
  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-medium">Daily Habits</h3>
        <button
          onClick={() => setShowSetupModal(true)}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          + Add
        </button>
      </div>
      
      {/* Grid */}
      <div className="space-y-2">
        {/* Header row with day labels */}
        <div className="grid gap-2" style={{ gridTemplateColumns: "1fr repeat(7, 36px)" }}>
          <div /> {/* Empty cell for habit name column */}
          {weekDates.map(date => (
            <div 
              key={date} 
              className={`text-center text-xs font-medium ${
                isToday(date) ? "text-primary" : "text-muted-foreground"
              }`}
            >
              {formatDayLabel(date)}
            </div>
          ))}
        </div>
        
        {/* Habit rows */}
        {habitsWithStats.map(habit => (
          <div 
            key={habit.id} 
            className="grid gap-2 items-center"
            style={{ gridTemplateColumns: "1fr repeat(7, 36px)" }}
          >
            {/* Habit name */}
            <button
              onClick={() => handleEditHabit(habit)}
              className="flex items-center gap-2 text-left hover:bg-secondary/50 rounded-lg px-2 py-1 -mx-2 transition-colors group"
            >
              <span className="text-base">{habit.emoji || "🎯"}</span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">{habit.name}</div>
              </div>
              {habit.currentStreak > 0 && (
                <span className="text-xs text-orange-500 opacity-0 group-hover:opacity-100 transition-opacity">
                  {habit.currentStreak}🔥
                </span>
              )}
            </button>
            
            {/* Completion cells */}
            {weekDates.map(date => {
              const isCompleted = completionsMap.get(`${habit.id}-${date}`) === true
              const isTodayDate = isToday(date)
              const isFutureDate = isFuture(date)
              
              return (
                <button
                  key={date}
                  onClick={() => handleToggle(habit.id, date)}
                  disabled={isFutureDate}
                  className={`
                    w-9 h-9 rounded-lg flex items-center justify-center text-sm font-semibold transition-all
                    ${isFutureDate 
                      ? "bg-secondary/30 cursor-not-allowed" 
                      : isCompleted 
                        ? "bg-green-500/20 text-green-500 hover:bg-green-500/30" 
                        : isTodayDate
                          ? "bg-primary/10 border-2 border-primary/30 hover:bg-primary/20 text-muted-foreground"
                          : "bg-red-500/10 text-red-500/60 hover:bg-red-500/20"
                    }
                  `}
                >
                  {isFutureDate ? "" : isCompleted ? "✓" : "✗"}
                </button>
              )
            })}
          </div>
        ))}
      </div>
      
      {/* Summary */}
      <div className="mt-4 pt-4 border-t border-border flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          {habitsWithStats.length} habit{habitsWithStats.length !== 1 ? "s" : ""} tracked
        </span>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-green-500/20" />
            <span className="text-muted-foreground">Done</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-red-500/10" />
            <span className="text-muted-foreground">Missed</span>
          </span>
        </div>
      </div>
      
      <HabitSetupModal 
        isOpen={showSetupModal} 
        onClose={handleCloseModal}
        editingHabit={editingHabit}
      />
    </div>
  )
}






