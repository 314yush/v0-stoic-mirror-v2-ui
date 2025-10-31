import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import { storage } from "./storage"
import { syncScheduleCommit } from "./sync-service"

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
}

interface ScheduleState {
  commits: DayCommit[]
  getTodayCommit: () => DayCommit | null
  commitDay: (blocks: TimeBlock[]) => void
  clearToday: () => void
  getCommitByDate: (date: string) => DayCommit | null
  setCommits: (commits: DayCommit[]) => void // For syncing from Supabase
  updateBlockCompletion: (blockId: string, completed: boolean) => void
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
        const today = new Date().toISOString().split("T")[0] // YYYY-MM-DD
        return get().commits.find((c) => c.date === today) || null
      },
      commitDay: (blocks: TimeBlock[], date?: string) => {
        const commitDate = date || new Date().toISOString().split("T")[0]
        const existing = get().commits.find((c) => c.date === commitDate)
        
        const commit: DayCommit = {
          date: commitDate,
          blocks,
          committed_at: new Date().toISOString(),
          committed: true,
        }

        if (existing) {
          set({
            commits: get().commits.map((c) => (c.date === commitDate ? commit : c)),
          })
        } else {
          set({ commits: [commit, ...get().commits] })
        }
        
        // Sync to Supabase in background
        syncScheduleCommit(commit).catch(console.error)
      },
      clearToday: () => {
        const today = new Date().toISOString().split("T")[0]
        const commitToDelete = get().commits.find((c) => c.date === today)
        set({ commits: get().commits.filter((c) => c.date !== today) })
        // Sync deletion to Supabase in background
        if (commitToDelete) {
          syncScheduleCommit(commitToDelete, "delete").catch(console.error)
        }
      },
      getCommitByDate: (date: string) => {
        return get().commits.find((c) => c.date === date) || null
      },
      setCommits: (commits) => set({ commits }), // For syncing from Supabase
      updateBlockCompletion: (blockId: string, completed: boolean) => {
        const today = new Date().toISOString().split("T")[0]
        const commit = get().commits.find((c) => c.date === today)
        if (commit) {
          const updatedCommit: DayCommit = {
            ...commit,
            blocks: commit.blocks.map((b) => (b.id === blockId ? { ...b, completed } : b)),
          }
          set({
            commits: get().commits.map((c) => (c.date === today ? updatedCommit : c)),
          })
          // Sync to Supabase in background
          syncScheduleCommit(updatedCommit, "update").catch(console.error)
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
