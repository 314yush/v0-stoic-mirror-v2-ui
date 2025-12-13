/**
 * Hook to automatically sync analytics when schedule changes
 * This runs in the background and doesn't block the UI
 */

import { useEffect, useRef } from 'react'
import { useScheduleStore } from './schedule-store'
import { useAuthStore } from './auth-store'
import { useJournalStore } from './journal-store'
import { useCalendarStore } from './calendar-store'
import { syncAllAnalytics, loadAnalyticsFromBackend } from './analytics-sync'
import { isSupabaseConfigured } from './supabase'

// Debounce time in ms - wait before syncing to batch multiple changes
const SYNC_DEBOUNCE_MS = 5000

/**
 * Hook that automatically syncs analytics to backend when data changes
 * Place this at the app root level
 */
export function useAnalyticsSync() {
  const { commits } = useScheduleStore()
  const { user } = useAuthStore()
  const { entries: journalEntries } = useJournalStore()
  const { events } = useCalendarStore()
  
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastSyncRef = useRef<string>('')

  useEffect(() => {
    // Skip if no user or Supabase not configured
    if (!user?.id || !isSupabaseConfigured()) {
      return
    }

    // Skip if nothing has changed (simple hash check)
    const dataHash = JSON.stringify({
      commitsCount: commits.length,
      lastCommitDate: commits[0]?.date,
      lastCommitBlocks: commits[0]?.blocks?.length,
    })
    
    if (dataHash === lastSyncRef.current) {
      return
    }

    // Clear any pending sync
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current)
    }

    // Schedule a debounced sync
    syncTimeoutRef.current = setTimeout(async () => {
      try {
        // Get today's mood from most recent journal entry
        const today = new Date().toISOString().split('T')[0]
        const todayJournal = journalEntries.find(e => 
          e.created_at.startsWith(today)
        )
        const mood = todayJournal?.mood || null

        // Count calendar events for today
        const todayStart = new Date()
        todayStart.setHours(0, 0, 0, 0)
        const todayEnd = new Date()
        todayEnd.setHours(23, 59, 59, 999)
        
        const todayEvents = events.filter(e => {
          const eventStart = new Date(e.start)
          return eventStart >= todayStart && eventStart <= todayEnd
        })

        await syncAllAnalytics(
          user.id,
          commits,
          todayEvents.length,
          mood
        )
        
        lastSyncRef.current = dataHash
        console.log('Analytics synced successfully')
      } catch (error) {
        console.error('Error syncing analytics:', error)
      }
    }, SYNC_DEBOUNCE_MS)

    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current)
      }
    }
  }, [commits, user?.id, journalEntries, events])
}

/**
 * Hook to load analytics from backend on app startup
 * Returns loading state and any cached analytics
 */
export function useLoadAnalytics() {
  const { user } = useAuthStore()
  
  useEffect(() => {
    if (!user?.id || !isSupabaseConfigured()) {
      return
    }

    // Load analytics from backend (for faster startup on new devices)
    loadAnalyticsFromBackend(user.id).then(data => {
      if (data) {
        console.log('Loaded analytics from backend:', {
          identities: data.identityAnalytics.length,
          patterns: data.habitPatterns.length,
        })
        // Could store these in a Zustand store for immediate use
        // Currently we just log them - the local computation is fast enough
      }
    }).catch(console.error)
  }, [user?.id])
}




