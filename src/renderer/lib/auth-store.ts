import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import { storage } from "./storage"
import { authService } from "./auth-service"
import type { User } from "@supabase/supabase-js"
import { startBackgroundSync, stopBackgroundSync, pullFromSupabase } from "./sync-service"
import { useJournalStore } from "./journal-store"
import { useScheduleStore } from "./schedule-store"
import { useTasksStore } from "./tasks-store"

interface AuthState {
  user: User | null
  loading: boolean
  initialized: boolean
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  initialize: () => Promise<void>
  pullAndMergeData: () => Promise<void>
}

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

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      loading: true,
      initialized: false,
      signIn: async (email, password) => {
        set({ loading: true })
        const { user, session, error } = await authService.signIn(email, password)
        if (user && session) {
          set({ user, loading: false })
          // Pull data from Supabase
          const state = get()
          await state.pullAndMergeData()
          // Start background sync
          startBackgroundSync()
        } else if (user && !session) {
          set({ loading: false })
          return { 
            error: new Error("Please check your email to confirm your account before signing in.") 
          }
        } else {
          set({ loading: false })
        }
        return { error }
      },
      signUp: async (email, password) => {
        set({ loading: true })
        const { user, session, error } = await authService.signUp(email, password)
        // If email confirmation is required, user exists but session is null
        if (user && session) {
          // Immediate sign up (email confirmation disabled)
          set({ user, loading: false })
          // Pull data from Supabase
          const state = get()
          await state.pullAndMergeData()
          // Start background sync
          startBackgroundSync()
        } else if (user && !session) {
          // Email confirmation required
          set({ loading: false })
          return { 
            error: new Error("Please check your email to confirm your account. Then sign in with your credentials.") 
          }
        } else {
          set({ loading: false })
        }
        return { error }
      },
      signOut: async () => {
        stopBackgroundSync()
        await authService.signOut()
        set({ user: null })
      },
      pullAndMergeData: async () => {
        const { journalEntries, scheduleCommits, tasks } = await pullFromSupabase()
        // Merge with local data (prefer local for conflicts, then Supabase)
        const journalStore = useJournalStore.getState()
        const scheduleStore = useScheduleStore.getState()
        const tasksStore = useTasksStore.getState()
        
        // Merge journal entries (local takes precedence for same ID)
        const localJournalIds = new Set(journalStore.entries.map((e) => e.id))
        const newFromSupabase = journalEntries.filter((e) => !localJournalIds.has(e.id))
        journalStore.setEntries([...journalStore.entries, ...newFromSupabase])
        
        // Merge schedule commits (local takes precedence)
        const localScheduleDates = new Set(scheduleStore.commits.map((c) => c.date))
        const newSchedules = scheduleCommits.filter((c) => !localScheduleDates.has(c.date))
        scheduleStore.setCommits([...scheduleStore.commits, ...newSchedules])
        
        // Merge tasks (local takes precedence for same ID)
        const localTaskIds = new Set(tasksStore.tasks.map((t) => t.id))
        const newTasks = tasks.filter((t) => !localTaskIds.has(t.id))
        tasksStore.setTasks([...tasksStore.tasks, ...newTasks])
      },
      initialize: async () => {
        if (get().initialized) return
        set({ loading: true })

        // Check for existing session
        const session = await authService.getSession()
        const user = session?.user ?? null

        console.log("Auth initialize:", { hasSession: !!session, hasUser: !!user, userEmail: user?.email })

        set({ user, loading: false, initialized: true })

        if (user && session) {
          // Pull data from Supabase
          await get().pullAndMergeData()
          // Start background sync
          startBackgroundSync()
        }

        // Listen for auth state changes
        const { data: { subscription } } = authService.onAuthStateChange((newUser, newSession) => {
          console.log("Auth state change callback:", { hasUser: !!newUser, hasSession: !!newSession, userEmail: newUser?.email })
          set({ user: newUser })
          if (newUser && newSession) {
            const state = get()
            state.pullAndMergeData()
            startBackgroundSync()
          } else {
            stopBackgroundSync()
          }
        })

        // Store subscription for cleanup if needed
        if (subscription) {
          // Store in a way that persists (optional, for cleanup on unmount)
        }
      },
        }),
    {
      name: "auth_state_v1",
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({ user: state.user }), // Only persist user, not loading/initialized
    }
  )
)
