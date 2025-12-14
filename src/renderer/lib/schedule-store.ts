import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import { storage } from "./storage"
import { syncScheduleCommit } from "./sync-service"
import { getTodayDateStrLocal } from "./date-utils"
import { onBlockCompleted } from "./habit-completion-service"

export interface TimeBlock {
  id: string
  identity: string
  start: string
  end: string
  optional?: boolean
  streak?: number
  completed?: boolean | null // true = completed, false = not completed, null/undefined = not answered yet
}

export interface DayCommit {
  date: string // YYYY-MM-DD
  blocks: TimeBlock[]
  committed_at: string // ISO timestamp
  committed: boolean
  finalized_at?: string // ISO timestamp - when all blocks have passed (prevents gaming stats)
}

interface ScheduleState {
  commits: DayCommit[]
  getTodayCommit: () => DayCommit | null
  commitDay: (blocks: TimeBlock[], date?: string) => void
  clearToday: () => void
  clearCommitByDate: (date: string) => void // Clear commit for any date (cannot clear finalized commits)
  isCommitFinalized: (commit: DayCommit) => boolean // Check if commit is finalized (all blocks passed)
  getCommitByDate: (date: string) => DayCommit | null
  setCommits: (commits: DayCommit[]) => void // For syncing from Supabase
  updateBlockCompletion: (blockId: string, completed: boolean, date?: string) => void
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

export const useScheduleStore = create<ScheduleState>()(
  persist(
    (set, get) => ({
      commits: [],
      getTodayCommit: () => {
        const today = getTodayDateStrLocal() // Use LOCAL timezone
        return get().commits.find((c) => c.date === today) || null
      },
      commitDay: (blocks: TimeBlock[], date?: string) => {
        const commitDate = date || getTodayDateStrLocal() // Use LOCAL timezone
        const existing = get().commits.find((c) => c.date === commitDate)
        
        // Prevent re-committing finalized days (anti-gaming protection)
        if (existing && existing.finalized_at) {
          throw new Error("Cannot modify a finalized commit. This day has already passed and is locked to prevent gaming stats.")
        }
        
        // Auto-finalize if all blocks have passed
        const commit: DayCommit = {
          date: commitDate,
          blocks,
          committed_at: new Date().toISOString(),
          committed: true,
        }
        
        // Check if should be finalized (helper function logic inline)
        // Use LOCAL timezone for all date comparisons
        const now = new Date()
        const todayYear = now.getFullYear()
        const todayMonth = now.getMonth()
        const todayDay = now.getDate()
        
        const [commitYear, commitMonth, commitDay] = commitDate.split("-").map(Number)
        const commitDateObj = new Date(commitYear, commitMonth - 1, commitDay)
        
        const isPastDate = commitYear < todayYear || 
          (commitYear === todayYear && commitMonth < todayMonth + 1) ||
          (commitYear === todayYear && commitMonth === todayMonth + 1 && commitDay < todayDay)
        
        const isToday = commitYear === todayYear && commitMonth === todayMonth + 1 && commitDay === todayDay
        
        if (isPastDate || (isToday && blocks.every(block => {
          const [endHour, endMin] = block.end.split(":").map(Number)
          const blockEndTime = new Date()
          blockEndTime.setFullYear(todayYear, todayMonth, todayDay) // Use today's LOCAL date
          blockEndTime.setHours(endHour, endMin, 0, 0) // Set to block end time (local)
          blockEndTime.setSeconds(0, 0)
          return now.getTime() >= blockEndTime.getTime()
        }))) {
          commit.finalized_at = new Date().toISOString()
        }

        if (existing) {
          set({
            commits: get().commits.map((c) => (c.date === commitDate ? commit : c)),
          })
          // Update existing commit in Supabase
          syncScheduleCommit(commit, "update").catch(console.error)
        } else {
          set({ commits: [commit, ...get().commits] })
          // Insert new commit to Supabase
          syncScheduleCommit(commit, "insert").catch(console.error)
        }
      },
      clearToday: () => {
        const today = getTodayDateStrLocal() // Use LOCAL timezone
        const commitToDelete = get().commits.find((c) => c.date === today)
        set({ commits: get().commits.filter((c) => c.date !== today) })
        // Sync deletion to Supabase in background
        if (commitToDelete) {
          syncScheduleCommit(commitToDelete, "delete").catch(console.error)
        }
      },
      clearCommitByDate: (date: string) => {
        const commitToDelete = get().commits.find((c) => c.date === date)
        
        // Prevent uncommitting finalized days (anti-gaming protection)
        if (commitToDelete && commitToDelete.finalized_at) {
          throw new Error("Cannot uncommit a finalized day. This day has already passed and is locked to prevent gaming stats.")
        }
        
        set({ commits: get().commits.filter((c) => c.date !== date) })
        // Sync deletion to Supabase in background
        if (commitToDelete) {
          syncScheduleCommit(commitToDelete, "delete").catch(console.error)
        }
      },
      isCommitFinalized: (commit: DayCommit) => {
        // If already marked as finalized, return true
        if (commit.finalized_at) return true
        
        // Check if all blocks have passed their end time (using LOCAL timezone)
        const now = new Date()
        const todayYear = now.getFullYear()
        const todayMonth = now.getMonth()
        const todayDay = now.getDate()
        
        const [commitYear, commitMonth, commitDay] = commit.date.split("-").map(Number)
        const commitDateObj = new Date(commitYear, commitMonth - 1, commitDay)
        
        const isPastDate = commitYear < todayYear || 
          (commitYear === todayYear && commitMonth < todayMonth + 1) ||
          (commitYear === todayYear && commitMonth === todayMonth + 1 && commitDay < todayDay)
        
        // If past date, all blocks have passed
        if (isPastDate) return true
        
        // If today, check if all blocks have passed
        const isToday = commitYear === todayYear && commitMonth === todayMonth + 1 && commitDay === todayDay
        if (isToday) {
          return commit.blocks.every(block => {
            const [endHour, endMin] = block.end.split(":").map(Number)
            const blockEndTime = new Date()
            blockEndTime.setFullYear(todayYear, todayMonth, todayDay) // Use today's LOCAL date
            blockEndTime.setHours(endHour, endMin, 0, 0) // Set to block end time (local)
            blockEndTime.setSeconds(0, 0)
            return now.getTime() >= blockEndTime.getTime()
          })
        }
        
        return false
      },
      getCommitByDate: (date: string) => {
        return get().commits.find((c) => c.date === date) || null
      },
      setCommits: (commits) => set({ commits }), // For syncing from Supabase
      updateBlockCompletion: (blockId: string, completed: boolean, date?: string) => {
        console.log("[Schedule Store] updateBlockCompletion called:", { blockId, completed, date })
        const targetDate = date || getTodayDateStrLocal() // Use LOCAL timezone
        const commit = get().commits.find((c) => c.date === targetDate)
        console.log("[Schedule Store] Found commit:", commit ? { date: commit.date, blocksCount: commit.blocks.length } : null)
        if (commit) {
          // Find the block being updated
          const block = commit.blocks.find((b) => b.id === blockId)
          console.log("[Schedule Store] Found block:", block ? { id: block.id, identity: block.identity } : null)
          
          const updatedCommit: DayCommit = {
            ...commit,
            blocks: commit.blocks.map((b) => (b.id === blockId ? { ...b, completed } : b)),
          }
          set({
            commits: get().commits.map((c) => (c.date === targetDate ? updatedCommit : c)),
          })
          // Sync to Supabase in background
          syncScheduleCommit(updatedCommit, "update").catch(console.error)
          
          // Trigger habit completion tracking
          if (block) {
            console.log("[Schedule Store] Calling onBlockCompleted for block:", block.identity)
            onBlockCompleted({
              block: { ...block, completed },
              completed,
              date: targetDate,
            })
          } else {
            console.log("[Schedule Store] Block not found, cannot trigger habit completion")
          }
        }
      },
    }),
    {
      name: "schedule_commits_v1",
      storage: createJSONStorage(() => zustandStorage),
    }
  )
)

/**
 * Format schedule for AI context
 */
export function formatScheduleForAI(commit: DayCommit | null): string {
  if (!commit || !commit.committed) {
    return "No schedule committed for today."
  }

  const blocks = commit.blocks
    .map((b) => {
      const optional = b.optional ? " (optional)" : ""
      const streak = b.streak ? ` [${b.streak}🔥 streak]` : ""
      return `- ${b.identity}: ${b.start} - ${b.end}${optional}${streak}`
    })
    .join("\n")

  return `Today's committed schedule (committed at ${new Date(commit.committed_at).toLocaleTimeString()}):
${blocks}`
}
