import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import { storage } from "./storage"
import { syncJournalEntry } from "./sync-service"

export type Mood = "😌" | "🙂" | "😐" | "😣" | "😡"

export interface JournalEntry {
  id: string
  content: string
  mood?: Mood
  tags: string[]
  is_sensitive: boolean
  visibility: "private" | "shared"
  ai_summary?: string
  created_at: string
}

interface JournalState {
  entries: JournalEntry[]
  addEntry: (entry: Omit<JournalEntry, "id" | "created_at">) => JournalEntry
  updateEntry: (id: string, updates: Partial<JournalEntry>) => void
  removeEntry: (id: string) => void
  clearAll: () => void
  setEntries: (entries: JournalEntry[]) => void // For syncing from Supabase
}

// Custom storage adapter for Zustand that uses our abstraction
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

export const useJournalStore = create<JournalState>()(
  persist(
    (set, get) => ({
      entries: [],
      addEntry: (entry) => {
        const newEntry: JournalEntry = {
          id: Math.random().toString(36).slice(2),
          created_at: new Date().toISOString(),
          ...entry,
        }
        set({ entries: [newEntry, ...get().entries] })
        // Sync to Supabase in background
        syncJournalEntry(newEntry, "insert").catch(console.error)
        return newEntry
      },
      updateEntry: (id, updates) => {
        const updated = get().entries.map((e) => (e.id === id ? { ...e, ...updates } : e))
        set({ entries: updated })
        // Sync to Supabase in background
        const entry = updated.find((e) => e.id === id)
        if (entry) {
          syncJournalEntry(entry, "update").catch(console.error)
        }
      },
      removeEntry: (id) => {
        const entry = get().entries.find((e) => e.id === id)
        set({ entries: get().entries.filter((e) => e.id !== id) })
        // Sync to Supabase in background
        if (entry) {
          syncJournalEntry(entry, "delete").catch(console.error)
        }
      },
      clearAll: () => set({ entries: [] }),
      setEntries: (entries) => set({ entries }), // For syncing from Supabase
    }),
    {
      name: "journal_entries_v1",
      storage: createJSONStorage(() => zustandStorage),
    }
  )
)

export function searchEntries(
  all: JournalEntry[],
  opts: { query?: string; mood?: Mood | null; tag?: string | null }
): JournalEntry[] {
  const { query, mood, tag } = opts
  return all.filter((e) => {
    if (query && !e.content.toLowerCase().includes(query.toLowerCase())) return false
    if (mood && e.mood !== mood) return false
    if (tag && !e.tags.includes(tag)) return false
    return true
  })
}

export function weeklySnapshot(entries: JournalEntry[]) {
  const nonSensitive = entries.filter((e) => !e.is_sensitive)
  const byWeek: Record<string, JournalEntry[]> = {}
  for (const e of nonSensitive) {
    const d = new Date(e.created_at)
    const key = `${d.getFullYear()}-w${getWeekNumber(d)}`
    byWeek[key] ??= []
    byWeek[key].push(e)
  }

  const themes: Record<string, number> = {}
  for (const e of nonSensitive) {
    for (const t of e.tags) themes[t] = (themes[t] || 0) + 1
  }

  const mostFrequentFeelings = Object.entries(
    nonSensitive.reduce<Record<string, number>>((acc, e) => {
      if (e.mood) acc[e.mood] = (acc[e.mood] || 0) + 1
      return acc
    }, {})
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)

  const topThemes = Object.entries(themes)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([tag]) => tag)

  const sampleEntries = nonSensitive.slice(0, 3)

  return {
    mostFrequentFeelings: mostFrequentFeelings.map(([m]) => m),
    topThemes,
    sampleEntries,
  }
}

function getWeekNumber(d: Date) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const dayNum = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}


