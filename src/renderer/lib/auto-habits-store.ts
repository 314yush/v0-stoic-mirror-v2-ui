/**
 * Auto-Habits Store
 * 
 * Manages automatically detected habits based on user's committed blocks.
 * Habits are created when patterns are detected and removed when patterns break.
 */

import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import { storage } from "./storage"
import { analyzeBlocks, type AutoHabit, type AnalysisResult } from "./auto-habit-analyzer"
import { useScheduleStore } from "./schedule-store"

// ============================================
// Types
// ============================================

interface AutoHabitsState {
  habits: AutoHabit[]
  dismissedHabitIds: string[]  // User dismissed these, don't show until they come back
  lastAnalyzed: string | null
  
  // Actions
  runAnalysis: () => AnalysisResult
  dismissHabit: (habitId: string) => void
  undismissHabit: (habitId: string) => void
  
  // Queries
  getActiveHabits: () => AutoHabit[]
  getAtRiskHabits: () => AutoHabit[]
  getHabitsByIdentity: (identity: string) => AutoHabit[]
  
  // Internal
  setHabits: (habits: AutoHabit[]) => void
}

// Custom storage adapter
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

// ============================================
// Store
// ============================================

export const useAutoHabitsStore = create<AutoHabitsState>()(
  persist(
    (set, get) => ({
      habits: [],
      dismissedHabitIds: [],
      lastAnalyzed: null,
      
      runAnalysis: () => {
        const commits = useScheduleStore.getState().commits
        const existingHabits = get().habits
        const dismissedIds = get().dismissedHabitIds
        
        const result = analyzeBlocks(commits, existingHabits)
        
        // Filter out dismissed habits (unless they're newly created with better stats)
        const filteredHabits = result.habits.filter(h => {
          if (!dismissedIds.includes(h.id)) return true
          
          // Re-show if habit is now active and was previously at_risk or inactive
          const wasAtRisk = existingHabits.find(e => e.id === h.id)?.status === "at_risk"
          return h.status === "active" && wasAtRisk
        })
        
        // Update dismissed list - remove habits that came back strong
        const updatedDismissed = dismissedIds.filter(id => {
          const habit = result.habits.find(h => h.id === id)
          return habit && habit.status !== "active"
        })
        
        set({
          habits: filteredHabits,
          dismissedHabitIds: updatedDismissed,
          lastAnalyzed: new Date().toISOString()
        })
        
        return {
          ...result,
          habits: filteredHabits
        }
      },
      
      dismissHabit: (habitId: string) => {
        const current = get().dismissedHabitIds
        if (!current.includes(habitId)) {
          set({ 
            dismissedHabitIds: [...current, habitId],
            habits: get().habits.filter(h => h.id !== habitId)
          })
        }
      },
      
      undismissHabit: (habitId: string) => {
        set({
          dismissedHabitIds: get().dismissedHabitIds.filter(id => id !== habitId)
        })
        // Re-run analysis to bring back the habit
        get().runAnalysis()
      },
      
      getActiveHabits: () => {
        return get().habits.filter(h => h.status === "active")
      },
      
      getAtRiskHabits: () => {
        return get().habits.filter(h => h.status === "at_risk")
      },
      
      getHabitsByIdentity: (identity: string) => {
        const normalized = identity.toLowerCase()
        return get().habits.filter(h => 
          h.identity.toLowerCase() === normalized ||
          h.identity.toLowerCase().includes(normalized) ||
          normalized.includes(h.identity.toLowerCase())
        )
      },
      
      setHabits: (habits) => set({ habits })
    }),
    {
      name: "auto_habits_v1",
      storage: createJSONStorage(() => zustandStorage),
    }
  )
)

// ============================================
// Hook for automatic analysis
// ============================================

import { useEffect, useRef } from "react"

/**
 * Hook that runs habit analysis when commits change
 */
export function useAutoHabitAnalysis() {
  const runAnalysis = useAutoHabitsStore(state => state.runAnalysis)
  const commits = useScheduleStore(state => state.commits)
  const lastAnalyzedRef = useRef<string | null>(null)
  
  useEffect(() => {
    // Debounce analysis to avoid running too frequently
    const timeoutId = setTimeout(() => {
      const commitsHash = JSON.stringify(commits.map(c => ({ 
        date: c.date, 
        blocks: c.blocks.map(b => ({ id: b.id, completed: b.completed }))
      })))
      
      if (commitsHash !== lastAnalyzedRef.current) {
        lastAnalyzedRef.current = commitsHash
        runAnalysis()
      }
    }, 1000)  // Wait 1 second after last change
    
    return () => clearTimeout(timeoutId)
  }, [commits, runAnalysis])
}




