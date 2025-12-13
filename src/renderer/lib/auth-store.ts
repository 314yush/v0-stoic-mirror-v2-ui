import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import { storage } from "./storage"
import { authService } from "./auth-service"
import type { User } from "@supabase/supabase-js"
import { startBackgroundSync, stopBackgroundSync, pullFromSupabase } from "./sync-service"
import { useJournalStore } from "./journal-store"
import { useScheduleStore } from "./schedule-store"
import { useTasksStore } from "./tasks-store"
import { useSettingsStore } from "./settings-store"
import { cachePassword, clearPasswordCache } from "./password-cache"
import { clearKeyCache, enableEncryption, initializeEncryption } from "./key-manager"

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
          // Cache password for encryption (in memory only, cleared on logout)
          cachePassword(user.id, password)
          
          // Check if encryption is enabled, if not enable it by default
          const { checkEncryptionStatus, isEncryptionEnabled } = await import("./key-manager")
          
          // Check local first (faster)
          const localEncryptionEnabled = isEncryptionEnabled(user.id)
          let encryptionEnabled = localEncryptionEnabled
          
          // If not in local, check Supabase
          if (!localEncryptionEnabled) {
            encryptionEnabled = await checkEncryptionStatus(user.id)
          }
          
          console.log('🔐 Sign in - Encryption status:', { userId: user.id, localEnabled: localEncryptionEnabled, supabaseEnabled: encryptionEnabled })
          
          if (!encryptionEnabled) {
            // Enable encryption by default for existing users who don't have it yet
            try {
              await enableEncryption(user.id, password)
              console.log('✅ Encryption enabled by default for existing user')
            } catch (encryptionError) {
              console.error('❌ Failed to enable encryption on signin:', encryptionError)
              // Continue anyway - encryption can be enabled later
            }
          } else {
            console.log('✅ Encryption already enabled for user')
          }
          
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
          // Cache password for encryption (in memory only, cleared on logout)
          cachePassword(user.id, password)
          
          // Enable encryption by default for new users
          try {
            await enableEncryption(user.id, password)
            console.log('✅ Encryption enabled by default for new user')
          } catch (encryptionError) {
            console.error('Failed to enable encryption on signup:', encryptionError)
            // Continue anyway - encryption can be enabled later
          }
          
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
        // Clear password cache and encryption keys on logout
        clearPasswordCache()
        clearKeyCache()
        await authService.signOut()
        set({ user: null })
      },
      pullAndMergeData: async () => {
        const { journalEntries, scheduleCommits, tasks, userSettings } = await pullFromSupabase()
        // Merge with local data (prefer local for conflicts, then Supabase)
        const journalStore = useJournalStore.getState()
        const scheduleStore = useScheduleStore.getState()
        const tasksStore = useTasksStore.getState()
        const settingsStore = useSettingsStore.getState()
        
        // Merge journal entries (local takes precedence for same ID)
        const localJournalIds = new Set(journalStore.entries.map((e) => e.id))
        const newFromSupabase = journalEntries.filter((e) => !localJournalIds.has(e.id))
        journalStore.setEntries([...journalStore.entries, ...newFromSupabase])
        
        // Merge schedule commits (local takes precedence, but merge in new/updated from Supabase)
        // Create a map of local commits by date for quick lookup
        const localCommitMap = new Map(scheduleStore.commits.map(c => [c.date, c]))
        const supabaseCommitMap = new Map(scheduleCommits.map(c => [c.date, c]))
        
        // Start with local commits (they take precedence)
        const mergedCommits = [...scheduleStore.commits]
        
        // DEBUG: Log local commits for debugging
        if (import.meta.env.DEV) {
          const today = new Date().toISOString().split('T')[0]
          console.log('🔄 Syncing commits:', {
            localCount: scheduleStore.commits.length,
            supabaseCount: scheduleCommits.length,
            today,
            localCommits: scheduleStore.commits.map(c => ({ 
              date: c.date, 
              committed: c.committed, 
              finalized: !!c.finalized_at,
              blocks: c.blocks?.length || 0,
              committed_at: c.committed_at,
              isToday: c.date === today,
            })),
            supabaseCommits: scheduleCommits.map(c => ({ 
              date: c.date, 
              committed: c.committed, 
              finalized: !!c.finalized_at,
              blocks: c.blocks?.length || 0,
              committed_at: c.committed_at,
              isToday: c.date === today,
            })),
          })
        }
        
        // Add or update commits from Supabase that don't exist locally or are newer
        scheduleCommits.forEach(supabaseCommit => {
          const localCommit = localCommitMap.get(supabaseCommit.date)
          if (!localCommit) {
            // New commit from Supabase - add it
            mergedCommits.push(supabaseCommit)
          } else {
            // CRITICAL FIX: If local commit has finalized_at, NEVER overwrite it
            // finalized commits are locked and should never be replaced or merged
            if (localCommit.finalized_at) {
              // Keep local finalized commit - don't overwrite, don't merge
              // The local commit is locked and takes precedence
              return
            }
            
            // CRITICAL FIX: If local commit has committed: true, preserve it
            // This prevents losing commits that were saved locally but not synced yet
            if (localCommit.committed && !supabaseCommit.committed) {
              // Local commit is committed but Supabase version isn't - keep local
              console.warn('⚠️ Preserving local committed commit:', localCommit.date)
              return
            }
            
            // Compare timestamps - use newer one, but preserve finalized_at if it exists
            const localTime = new Date(localCommit.committed_at || 0).getTime()
            const supabaseTime = new Date(supabaseCommit.committed_at || 0).getTime()
            
            if (supabaseTime > localTime) {
              // Supabase version is newer - replace local BUT preserve finalized_at and committed status if local has them
              const index = mergedCommits.findIndex(c => c.date === supabaseCommit.date)
              if (index !== -1) {
                mergedCommits[index] = {
                  ...supabaseCommit,
                  finalized_at: localCommit.finalized_at || supabaseCommit.finalized_at, // Preserve local finalized_at if exists
                  committed: localCommit.committed || supabaseCommit.committed, // Preserve local committed status if true
                }
              }
            } else if (localTime > supabaseTime) {
              // Local is newer - keep local but merge finalized_at if Supabase has it and local doesn't
              const index = mergedCommits.findIndex(c => c.date === supabaseCommit.date)
              if (index !== -1 && supabaseCommit.finalized_at && !localCommit.finalized_at) {
                mergedCommits[index] = {
                  ...localCommit,
                  finalized_at: supabaseCommit.finalized_at, // Use Supabase finalized_at if local doesn't have it
                }
              }
              // Otherwise keep local as-is (it's newer)
            } else {
              // Same timestamp - merge finalized_at and committed status, prefer local
              const index = mergedCommits.findIndex(c => c.date === supabaseCommit.date)
              if (index !== -1) {
                mergedCommits[index] = {
                  ...localCommit,
                  finalized_at: localCommit.finalized_at || supabaseCommit.finalized_at, // Prefer local, then Supabase
                  committed: localCommit.committed || supabaseCommit.committed, // Prefer local committed status
                }
              }
            }
          }
        })
        
        // Sort by date descending (most recent first)
        mergedCommits.sort((a, b) => b.date.localeCompare(a.date))
        scheduleStore.setCommits(mergedCommits)
        
        // Merge tasks (local takes precedence for same ID)
        const localTaskIds = new Set(tasksStore.tasks.map((t) => t.id))
        const newTasks = tasks.filter((t) => !localTaskIds.has(t.id))
        tasksStore.setTasks([...tasksStore.tasks, ...newTasks])
        
        // Merge user settings (Supabase takes precedence if it exists, then merge with local)
        if (userSettings) {
          const localSettings = settingsStore.settings
          // Merge: use Supabase values, but keep local values that aren't in Supabase
          const mergedSettings: typeof localSettings = {
            ...localSettings,
            ...userSettings,
            // Deep merge userGoals
            userGoals: {
              ...localSettings.userGoals,
              ...userSettings.userGoals,
            },
          }
          // Skip sync to avoid sync loop (we just pulled from Supabase)
          settingsStore.updateSettings(mergedSettings, true)
        }
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
