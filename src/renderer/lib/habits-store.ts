/**
 * Habits Store
 * Manages user-defined habits and their daily completions
 */

import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import { storage } from "./storage"
import { getTodayDateStrLocal } from "./date-utils"

// ============================================
// Types
// ============================================

export interface Habit {
  id: string
  name: string
  identity: string           // Links to north star identity
  targetFrequency: number    // Times per week (7 = daily)
  targetDurationMinutes?: number
  preferredTime?: string     // HH:MM
  emoji?: string
  color?: string
  sortOrder: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface HabitCompletion {
  id: string
  habitId: string
  date: string               // YYYY-MM-DD
  completed: boolean
  blockId?: string           // If auto-linked to a time block
  actualStartTime?: string   // HH:MM
  actualDurationMinutes?: number
  note?: string
  skippedReason?: string
  completedAt?: string       // ISO timestamp
  createdAt: string
}

export interface HabitWithStats extends Habit {
  currentStreak: number
  weeklyCompletions: number  // This week
  totalCompletions: number   // All time
  lastCompleted?: string     // YYYY-MM-DD
}

// ============================================
// Store
// ============================================

interface HabitsState {
  habits: Habit[]
  completions: HabitCompletion[]
  
  // Habit CRUD
  addHabit: (habit: Omit<Habit, 'id' | 'sortOrder' | 'createdAt' | 'updatedAt'>) => Habit
  updateHabit: (id: string, updates: Partial<Habit>) => void
  deleteHabit: (id: string) => void
  reorderHabits: (habitIds: string[]) => void
  
  // Completion tracking
  toggleCompletion: (habitId: string, date?: string) => void
  setCompletion: (habitId: string, completed: boolean, date?: string, options?: {
    blockId?: string
    actualStartTime?: string
    actualDurationMinutes?: number
    note?: string
    skippedReason?: string
  }) => void
  
  // Queries
  getHabit: (id: string) => Habit | undefined
  getActiveHabits: () => Habit[]
  getHabitsByIdentity: (identity: string) => Habit[]
  getCompletionsForDate: (date: string) => HabitCompletion[]
  getCompletionsForHabit: (habitId: string, startDate?: string, endDate?: string) => HabitCompletion[]
  getHabitWithStats: (id: string) => HabitWithStats | undefined
  getAllHabitsWithStats: () => HabitWithStats[]
  
  // Week view helpers
  getWeekCompletions: (weekStart: Date) => Map<string, Map<string, boolean>> // habitId -> date -> completed
  
  // Sync
  setHabits: (habits: Habit[]) => void
  setCompletions: (completions: HabitCompletion[]) => void
}

// Custom storage adapter for Zustand
const zustandStorage = {
  getItem: (name: string): string | null => {
    const value = storage.get(name)
    return value ? JSON.stringify(value) : null
  },
  setItem: (name: string, value: string): void => {
    storage.set(name, JSON.parse(value))
  },
  removeItem: (name: string): void => {
    storage.remove(name)
  },
}

// Helper functions
function generateId(): string {
  return `habit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

function getWeekStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Monday as start
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function calculateStreak(completions: HabitCompletion[]): number {
  // Sort by date descending
  const sorted = [...completions]
    .filter(c => c.completed)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  
  if (sorted.length === 0) return 0
  
  let streak = 0
  let checkDate = new Date()
  checkDate.setHours(0, 0, 0, 0)
  
  // Check if today is completed (optional for streak)
  const todayStr = getTodayDateStrLocal()
  const todayCompletion = sorted.find(c => c.date === todayStr)
  
  // If not completed today, start from yesterday
  if (!todayCompletion) {
    checkDate.setDate(checkDate.getDate() - 1)
  }
  
  for (let i = 0; i < 365; i++) {
    const dateStr = checkDate.toISOString().split('T')[0]
    const hasCompletion = sorted.some(c => c.date === dateStr)
    
    if (hasCompletion) {
      streak++
      checkDate.setDate(checkDate.getDate() - 1)
    } else {
      break
    }
  }
  
  return streak
}

export const useHabitsStore = create<HabitsState>()(
  persist(
    (set, get) => ({
      habits: [],
      completions: [],
      
      // ============================================
      // Habit CRUD
      // ============================================
      
      addHabit: (habitData) => {
        const now = new Date().toISOString()
        const habits = get().habits
        const newHabit: Habit = {
          ...habitData,
          id: generateId(),
          sortOrder: habits.length,
          isActive: habitData.isActive ?? true,
          createdAt: now,
          updatedAt: now,
        }
        
        set({ habits: [...habits, newHabit] })
        return newHabit
      },
      
      updateHabit: (id, updates) => {
        set({
          habits: get().habits.map(h => 
            h.id === id 
              ? { ...h, ...updates, updatedAt: new Date().toISOString() }
              : h
          )
        })
      },
      
      deleteHabit: (id) => {
        set({
          habits: get().habits.filter(h => h.id !== id),
          // Also delete completions for this habit
          completions: get().completions.filter(c => c.habitId !== id)
        })
      },
      
      reorderHabits: (habitIds) => {
        set({
          habits: get().habits.map(h => ({
            ...h,
            sortOrder: habitIds.indexOf(h.id),
            updatedAt: new Date().toISOString()
          })).sort((a, b) => a.sortOrder - b.sortOrder)
        })
      },
      
      // ============================================
      // Completion tracking
      // ============================================
      
      toggleCompletion: (habitId, date) => {
        const targetDate = date || getTodayDateStrLocal()
        const existing = get().completions.find(
          c => c.habitId === habitId && c.date === targetDate
        )
        
        if (existing) {
          // Toggle existing
          set({
            completions: get().completions.map(c =>
              c.habitId === habitId && c.date === targetDate
                ? { 
                    ...c, 
                    completed: !c.completed,
                    completedAt: !c.completed ? new Date().toISOString() : undefined
                  }
                : c
            )
          })
        } else {
          // Create new completion (marked as done)
          const newCompletion: HabitCompletion = {
            id: `completion-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            habitId,
            date: targetDate,
            completed: true,
            completedAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
          }
          set({ completions: [...get().completions, newCompletion] })
        }
      },
      
      setCompletion: (habitId, completed, date, options) => {
        const targetDate = date || getTodayDateStrLocal()
        const existing = get().completions.find(
          c => c.habitId === habitId && c.date === targetDate
        )
        
        if (existing) {
          set({
            completions: get().completions.map(c =>
              c.habitId === habitId && c.date === targetDate
                ? { 
                    ...c, 
                    completed,
                    completedAt: completed ? new Date().toISOString() : undefined,
                    ...options
                  }
                : c
            )
          })
        } else {
          const newCompletion: HabitCompletion = {
            id: `completion-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            habitId,
            date: targetDate,
            completed,
            completedAt: completed ? new Date().toISOString() : undefined,
            createdAt: new Date().toISOString(),
            ...options
          }
          set({ completions: [...get().completions, newCompletion] })
        }
      },
      
      // ============================================
      // Queries
      // ============================================
      
      getHabit: (id) => {
        return get().habits.find(h => h.id === id)
      },
      
      getActiveHabits: () => {
        return get().habits
          .filter(h => h.isActive)
          .sort((a, b) => a.sortOrder - b.sortOrder)
      },
      
      getHabitsByIdentity: (identity) => {
        return get().habits
          .filter(h => h.identity.toLowerCase() === identity.toLowerCase() && h.isActive)
          .sort((a, b) => a.sortOrder - b.sortOrder)
      },
      
      getCompletionsForDate: (date) => {
        return get().completions.filter(c => c.date === date)
      },
      
      getCompletionsForHabit: (habitId, startDate, endDate) => {
        let completions = get().completions.filter(c => c.habitId === habitId)
        
        if (startDate) {
          completions = completions.filter(c => c.date >= startDate)
        }
        if (endDate) {
          completions = completions.filter(c => c.date <= endDate)
        }
        
        return completions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      },
      
      getHabitWithStats: (id) => {
        const habit = get().habits.find(h => h.id === id)
        if (!habit) return undefined
        
        const completions = get().completions.filter(c => c.habitId === id)
        const completed = completions.filter(c => c.completed)
        
        // This week's completions
        const weekStart = getWeekStart(new Date())
        const weekStartStr = weekStart.toISOString().split('T')[0]
        const weeklyCompletions = completed.filter(c => c.date >= weekStartStr).length
        
        // Last completed
        const lastCompleted = completed.length > 0
          ? completed.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0].date
          : undefined
        
        return {
          ...habit,
          currentStreak: calculateStreak(completions),
          weeklyCompletions,
          totalCompletions: completed.length,
          lastCompleted,
        }
      },
      
      getAllHabitsWithStats: () => {
        const { habits, completions } = get()
        const weekStart = getWeekStart(new Date())
        const weekStartStr = weekStart.toISOString().split('T')[0]
        
        return habits
          .filter(h => h.isActive)
          .map(habit => {
            const habitCompletions = completions.filter(c => c.habitId === habit.id)
            const completed = habitCompletions.filter(c => c.completed)
            const weeklyCompletions = completed.filter(c => c.date >= weekStartStr).length
            const lastCompleted = completed.length > 0
              ? completed.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0].date
              : undefined
            
            return {
              ...habit,
              currentStreak: calculateStreak(habitCompletions),
              weeklyCompletions,
              totalCompletions: completed.length,
              lastCompleted,
            }
          })
          .sort((a, b) => a.sortOrder - b.sortOrder)
      },
      
      getWeekCompletions: (weekStart) => {
        const result = new Map<string, Map<string, boolean>>()
        const habits = get().habits.filter(h => h.isActive)
        const completions = get().completions
        
        // Generate dates for the week
        const dates: string[] = []
        for (let i = 0; i < 7; i++) {
          const d = new Date(weekStart)
          d.setDate(d.getDate() + i)
          dates.push(d.toISOString().split('T')[0])
        }
        
        for (const habit of habits) {
          const habitMap = new Map<string, boolean>()
          
          for (const dateStr of dates) {
            const completion = completions.find(
              c => c.habitId === habit.id && c.date === dateStr
            )
            habitMap.set(dateStr, completion?.completed ?? false)
          }
          
          result.set(habit.id, habitMap)
        }
        
        return result
      },
      
      // ============================================
      // Sync
      // ============================================
      
      setHabits: (habits) => set({ habits }),
      setCompletions: (completions) => set({ completions }),
    }),
    {
      name: "user_habits_v1",
      storage: createJSONStorage(() => zustandStorage),
    }
  )
)

// ============================================
// Auto-detection helper
// ============================================

/**
 * Attempts to match a time block to a user habit based on identity
 * Called when user commits a schedule or creates a block
 */
export function matchBlockToHabit(
  blockIdentity: string,
  habits: Habit[]
): Habit | undefined {
  const normalizedBlock = blockIdentity.toLowerCase().trim()
  
  // First try exact match on identity
  const exactMatch = habits.find(h => 
    h.identity.toLowerCase() === normalizedBlock ||
    h.name.toLowerCase() === normalizedBlock
  )
  if (exactMatch) return exactMatch
  
  // Then try partial match
  const partialMatch = habits.find(h =>
    h.identity.toLowerCase().includes(normalizedBlock) ||
    normalizedBlock.includes(h.identity.toLowerCase()) ||
    h.name.toLowerCase().includes(normalizedBlock) ||
    normalizedBlock.includes(h.name.toLowerCase())
  )
  
  return partialMatch
}






