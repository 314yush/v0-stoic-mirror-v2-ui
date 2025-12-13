import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import { storage } from "./storage"
import { syncTask } from "./sync-service"

export interface Task {
  id: string
  text: string
  completed: boolean
  created_at: string
}

interface TasksState {
  tasks: Task[]
  addTask: (task: Omit<Task, "id" | "created_at">) => Task
  updateTask: (id: string, updates: Partial<Task>) => void
  removeTask: (id: string) => void
  toggleTask: (id: string) => void
  clearAll: () => void
  setTasks: (tasks: Task[]) => void // For syncing from Supabase
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

export const useTasksStore = create<TasksState>()(
  persist(
    (set, get) => ({
      tasks: [],
      addTask: (task) => {
        const newTask: Task = {
          id: Math.random().toString(36).slice(2),
          created_at: new Date().toISOString(),
          ...task,
        }
        set({ tasks: [newTask, ...get().tasks] })
        // Sync to Supabase in background
        syncTask(newTask, "insert").catch(console.error)
        return newTask
      },
      updateTask: (id, updates) => {
        const updated = get().tasks.map((t) => (t.id === id ? { ...t, ...updates } : t))
        set({ tasks: updated })
        // Sync to Supabase in background
        const task = updated.find((t) => t.id === id)
        if (task) {
          syncTask(task, "update").catch(console.error)
        }
      },
      removeTask: (id) => {
        const task = get().tasks.find((t) => t.id === id)
        set({ tasks: get().tasks.filter((t) => t.id !== id) })
        // Sync deletion to Supabase in background
        if (task) {
          syncTask(task, "delete").catch(console.error)
        }
      },
      toggleTask: (id) => {
        const task = get().tasks.find((t) => t.id === id)
        if (task) {
          const updated = { ...task, completed: !task.completed }
          set({
            tasks: get().tasks.map((t) => (t.id === id ? updated : t)),
          })
          // Sync to Supabase in background
          syncTask(updated, "update").catch(console.error)
        }
      },
      clearAll: () => set({ tasks: [] }),
      setTasks: (tasks) => set({ tasks }), // For syncing from Supabase
    }),
    {
      name: "tasks_v1",
      storage: createJSONStorage(() => zustandStorage),
    }
  )
)

