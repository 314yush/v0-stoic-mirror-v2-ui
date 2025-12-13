/**
 * Habits Sync Hook
 * 
 * Loads habits and completions from Supabase when user is authenticated
 */

import { useEffect, useRef } from "react"
import { useAuthStore } from "./auth-store"
import { useHabitsStore } from "./habits-store"
import { fetchHabitsFromSupabase, fetchCompletionsFromSupabase } from "./habits-sync-service"
import { getTodayDateStrLocal, getDateStrLocal } from "./date-utils"

/**
 * Load habits from Supabase on app start
 */
export function useLoadHabits() {
  const { user } = useAuthStore()
  const { setHabits, setCompletions } = useHabitsStore()
  const loadedRef = useRef(false)

  useEffect(() => {
    // Only load once per user session
    if (!user || loadedRef.current) return

    const loadHabits = async () => {
      try {
        console.log("[Habits] Loading habits from Supabase...")
        
        // Fetch habits
        const habitsData = await fetchHabitsFromSupabase()
        if (habitsData.length > 0) {
          setHabits(habitsData)
          console.log(`[Habits] Loaded ${habitsData.length} habits`)
        }

        // Fetch completions for last 30 days
        // IMPORTANT: Use LOCAL timezone for both dates to avoid off-by-one errors
        const today = new Date()
        const thirtyDaysAgo = new Date(today)
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        
        const completionsData = await fetchCompletionsFromSupabase(
          getDateStrLocal(thirtyDaysAgo),  // Use local timezone, not UTC
          getTodayDateStrLocal()
        )
        if (completionsData.length > 0) {
          setCompletions(completionsData)
          console.log(`[Habits] Loaded ${completionsData.length} completions`)
        }

        loadedRef.current = true
      } catch (error) {
        console.error("[Habits] Error loading habits:", error)
      }
    }

    loadHabits()
  }, [user, setHabits, setCompletions])
}

/**
 * Sync habits when they change (debounced)
 * This is optional - individual operations already sync via the sync service
 */
export function useHabitsSync() {
  // Currently, habits are synced immediately on add/update/delete
  // This hook is here for future batch sync needs
  useLoadHabits()
}

