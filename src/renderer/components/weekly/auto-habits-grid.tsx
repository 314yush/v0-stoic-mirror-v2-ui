/**
 * Auto-Habits Grid
 * 
 * Displays automatically detected habits based on user's committed blocks.
 * Minimal, clean design - works in light + dark mode.
 */

import { useMemo } from "react"
import { useAutoHabitsStore, useAutoHabitAnalysis } from "../../lib/auto-habits-store"
import { useScheduleStore } from "../../lib/schedule-store"
import { getWeeklyCompletions, type AutoHabit } from "../../lib/auto-habit-analyzer"
import { getTodayDateStrLocal, getDateStrLocal } from "../../lib/date-utils"

// ============================================
// Helper Functions
// ============================================

function getWeekStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function getWeekDates(weekStart: Date): string[] {
  const dates: string[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + i)
    dates.push(getDateStrLocal(d))
  }
  return dates
}

function formatDayLabel(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00")
  return ["S", "M", "T", "W", "T", "F", "S"][date.getDay()]
}

function isToday(dateStr: string): boolean {
  return dateStr === getTodayDateStrLocal()
}

function isFuture(dateStr: string): boolean {
  return dateStr > getTodayDateStrLocal()
}

// ============================================
// Component
// ============================================

export function AutoHabitsGrid() {
  useAutoHabitAnalysis()
  
  const { habits, dismissHabit } = useAutoHabitsStore()
  const commits = useScheduleStore(state => state.commits)
  
  const weekStart = useMemo(() => getWeekStart(new Date()), [])
  const weekDates = useMemo(() => getWeekDates(weekStart), [weekStart])
  
  // Group habits by identity
  const habitsByIdentity = useMemo(() => {
    const grouped = new Map<string, AutoHabit[]>()
    for (const habit of habits) {
      const existing = grouped.get(habit.identity) || []
      grouped.set(habit.identity, [...existing, habit])
    }
    return grouped
  }, [habits])
  
  if (habits.length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg p-5">
        <div className="text-sm font-medium text-foreground mb-4">Habits</div>
        <p className="text-sm text-muted-foreground">
          No habits detected yet. Commit schedules consistently to see patterns.
        </p>
      </div>
    )
  }
  
  return (
    <div className="bg-card border border-border rounded-lg p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-foreground">Habits</span>
        <span className="text-xs text-muted-foreground">{habits.length}</span>
      </div>
      
      {/* Day labels */}
      <div 
        className="grid gap-1.5 mb-2"
        style={{ gridTemplateColumns: "1fr repeat(7, 28px) 40px" }}
      >
        <div />
        {weekDates.map(date => (
          <div 
            key={date} 
            className={`text-center text-[10px] font-medium ${
              isToday(date) ? "text-foreground" : "text-muted-foreground/60"
            }`}
          >
            {formatDayLabel(date)}
          </div>
        ))}
        <div />
      </div>
      
      {/* Habits */}
      <div className="space-y-3">
        {Array.from(habitsByIdentity).map(([identity, identityHabits]) => (
          <div key={identity} className="space-y-1.5">
            {/* Identity label */}
            <div className="text-[10px] text-muted-foreground/60 uppercase tracking-wider">
              {identity}
            </div>
            
            {/* Habit rows */}
            {identityHabits.map(habit => (
              <HabitRow 
                key={habit.id} 
                habit={habit} 
                weekDates={weekDates}
                commits={commits}
                onDismiss={() => dismissHabit(habit.id)}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================
// Habit Row
// ============================================

interface HabitRowProps {
  habit: AutoHabit
  weekDates: string[]
  commits: any[]
  onDismiss: () => void
}

function HabitRow({ habit, weekDates, commits }: HabitRowProps) {
  const weekStart = new Date(weekDates[0] + "T00:00:00")
  const completions = getWeeklyCompletions(commits, habit, weekStart)
  const completedThisWeek = completions.filter(c => c.completed).length
  
  return (
    <div className="group relative">
      <div 
        className="grid gap-1.5 items-center"
        style={{ gridTemplateColumns: "1fr repeat(7, 28px) 40px" }}
      >
        {/* Habit name */}
        <div className="min-w-0">
          <div className="text-sm text-foreground truncate">
            {habit.categoryName}
          </div>
          {/* At-risk indicator - subtle */}
          {habit.status === "at_risk" && habit.atRiskMessage && (
            <div className="flex items-center gap-1 mt-0.5">
              <span className="w-1 h-1 rounded-full bg-amber-500" />
              <span className="text-[10px] text-amber-500/80">
                {habit.atRiskMessage}
              </span>
            </div>
          )}
        </div>
        
        {/* Day cells */}
        {weekDates.map((date, i) => {
          const completion = completions[i]
          const isTodayDate = isToday(date)
          const isFutureDate = isFuture(date)
          
          return (
            <div
              key={date}
              className={`
                w-7 h-7 rounded flex items-center justify-center text-xs transition-colors
                ${isFutureDate 
                  ? "bg-secondary/20" 
                  : completion?.completed 
                    ? "bg-primary/15 text-primary" 
                    : isTodayDate
                      ? "bg-secondary/50"
                      : "bg-secondary/30"
                }
              `}
            >
              {!isFutureDate && (completion?.completed ? "✓" : "·")}
            </div>
          )
        })}
        
        {/* Stats */}
        <div className="text-right">
          <span className="text-xs text-muted-foreground">
            {completedThisWeek}/7
          </span>
          {habit.streak > 1 && (
            <span className="text-[10px] text-orange-500 ml-1">
              {habit.streak}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
