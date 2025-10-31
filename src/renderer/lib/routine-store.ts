import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import { storage } from "./storage"
import type { TimeBlock } from "./schedule-store"

export interface RoutineTemplate {
  id: string
  name: string
  blocks: Omit<TimeBlock, "id">[]
  created_at: string
  updated_at: string
}

interface RoutineState {
  templates: RoutineTemplate[]
  addTemplate: (name: string, blocks: Omit<TimeBlock, "id">[]) => RoutineTemplate
  updateTemplate: (id: string, updates: Partial<RoutineTemplate>) => void
  deleteTemplate: (id: string) => void
  getTemplate: (id: string) => RoutineTemplate | null
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

export const useRoutineStore = create<RoutineState>()(
  persist(
    (set, get) => ({
      templates: [],
      addTemplate: (name, blocks) => {
        const now = new Date().toISOString()
        const template: RoutineTemplate = {
          id: Math.random().toString(36).substring(7),
          name,
          blocks,
          created_at: now,
          updated_at: now,
        }
        set({ templates: [template, ...get().templates] })
        return template
      },
      updateTemplate: (id, updates) => {
        set({
          templates: get().templates.map((t) =>
            t.id === id ? { ...t, ...updates, updated_at: new Date().toISOString() } : t
          ),
        })
      },
      deleteTemplate: (id) => {
        set({ templates: get().templates.filter((t) => t.id !== id) })
      },
      getTemplate: (id) => {
        return get().templates.find((t) => t.id === id) || null
      },
    }),
    {
      name: "routine_templates_v1",
      storage: createJSONStorage(() => zustandStorage),
    }
  )
)

