import { supabase, isSupabaseConfigured } from "./supabase"
import type { JournalEntry } from "./journal-store"
import type { DayCommit, TimeBlock } from "./schedule-store"
import type { Task } from "./tasks-store"
import { storage } from "./storage"

/**
 * Sync Service
 * Handles syncing local data to Supabase in background
 * Local-first: Always write to local storage first, sync in background
 */

interface SyncQueue {
  type: "journal_insert" | "journal_update" | "journal_delete" | "schedule_commit" | "schedule_delete" | "task_insert" | "task_update" | "task_delete"
  data: any
  timestamp: number
  id: string
  retryCount: number
  lastError?: string
}

const MAX_QUEUE_SIZE = 100 // Maximum items in queue
const MAX_RETRIES = 5 // Maximum retry attempts per item
const QUEUE_CLEANUP_AGE = 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds

/**
 * Get sync queue from local storage
 */
function getSyncQueue(): SyncQueue[] {
  const queue = storage.get<SyncQueue[]>("sync_queue") || []
  
  // Clean up old items (older than 7 days) and failed items (exceeded retries)
  const now = Date.now()
  const cleaned = queue.filter((item) => {
    const age = now - item.timestamp
    return age < QUEUE_CLEANUP_AGE && item.retryCount < MAX_RETRIES
  })
  
  // If cleaned queue is different, update storage
  if (cleaned.length !== queue.length) {
    try {
      storage.set("sync_queue", cleaned)
    } catch (e) {
      // If storage is full, keep only most recent items
      console.warn("Storage full, keeping only most recent sync items")
      storage.set("sync_queue", cleaned.slice(-50))
    }
  }
  
  return cleaned
}

/**
 * Add item to sync queue (with deduplication and size limits)
 */
function queueSync(item: Omit<SyncQueue, "timestamp" | "id" | "retryCount">): void {
  try {
    const queue = getSyncQueue()
    
    // Check if similar item already exists (prevent duplicates)
    const existingIndex = queue.findIndex(
      (q) => q.type === item.type && JSON.stringify(q.data?.id || q.data?.date) === JSON.stringify(item.data?.id || item.data?.date)
    )
    
    if (existingIndex >= 0) {
      // Update existing item's retry count instead of adding duplicate
      queue[existingIndex].retryCount++
      queue[existingIndex].timestamp = Date.now()
      queue[existingIndex].lastError = undefined
    } else {
      // Add new item
      if (queue.length >= MAX_QUEUE_SIZE) {
        // Remove oldest items to make room
        queue.sort((a, b) => a.timestamp - b.timestamp)
        queue.splice(0, queue.length - MAX_QUEUE_SIZE + 1)
      }
      
      queue.push({
        ...item,
        timestamp: Date.now(),
        id: Math.random().toString(36).slice(2),
        retryCount: 0,
      })
    }
    
    storage.set("sync_queue", queue)
  } catch (e) {
    // If storage quota exceeded, clear queue and log error
    console.error("Storage quota exceeded, clearing sync queue:", e)
    try {
      storage.remove("sync_queue")
    } catch {
      // Ignore cleanup errors
    }
  }
}

/**
 * Remove item from sync queue
 */
function removeFromQueue(id: string): void {
  const queue = getSyncQueue()
  storage.set("sync_queue", queue.filter((item) => item.id !== id))
}

/**
 * Sync journal entry to Supabase
 */
export async function syncJournalEntry(entry: JournalEntry, action: "insert" | "update" | "delete"): Promise<void> {
  if (!isSupabaseConfigured()) {
    // Queue for later sync
    queueSync({ type: `journal_${action}` as any, data: entry })
    return
  }

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      queueSync({ type: `journal_${action}` as any, data: entry })
      return
    }

    if (action === "insert" || action === "update") {
      // Ensure tags is properly formatted for PostgreSQL array
      // Supabase expects an array, but handle edge cases
      const tagsArray = Array.isArray(entry.tags) 
        ? entry.tags.filter((tag) => tag && tag.trim().length > 0) // Filter out empty tags
        : []
      
      const { error } = await supabase.from("journal_entries").upsert({
        id: entry.id,
        user_id: user.id,
        title: entry.title || null,
        content: entry.content || "",
        mood: entry.mood || null,
        tags: tagsArray.length > 0 ? tagsArray : [], // Empty array instead of undefined
        is_sensitive: entry.is_sensitive ?? false,
        visibility: entry.visibility || "private",
        ai_summary: entry.ai_summary || null,
        created_at: entry.created_at,
        updated_at: new Date().toISOString(),
      })

      if (error) throw error
    } else if (action === "delete") {
      const { error } = await supabase.from("journal_entries").delete().eq("id", entry.id).eq("user_id", user.id)

      if (error) throw error
    }
  } catch (error) {
    console.error("Sync error:", error)
    
    const errorMessage = error instanceof Error ? error.message : "Failed to sync journal entry"
    const errorCode = (error as any)?.code
    
    // Don't queue if it's a data format error (won't succeed on retry)
    // PGRST102 = "Empty or invalid json"
    // 22P02 = Invalid input syntax
    if (errorCode === "PGRST102" || errorCode === "22P02" || errorMessage.includes("invalid json")) {
      console.error("Permanent sync error - not queuing:", errorMessage)
      // Don't re-throw to prevent infinite loop, but log the error
      return
    }
    
    // Only queue for retry if it's a transient error (network, auth, etc.)
    if (errorMessage.includes("network") || errorMessage.includes("fetch") || errorCode === "PGRST301") {
      queueSync({ type: `journal_${action}` as any, data: entry })
      throw new Error("Network error: Your changes are saved locally and will sync when online.")
    }
    
    // For other errors, queue once but limit retries
    queueSync({ type: `journal_${action}` as any, data: entry })
    throw new Error(`Sync failed: ${errorMessage}`)
  }
}

/**
 * Sync schedule commit to Supabase
 */
export async function syncScheduleCommit(commit: DayCommit, action: "insert" | "update" | "delete" = "insert"): Promise<void> {
  if (!isSupabaseConfigured()) {
    queueSync({ type: action === "delete" ? "schedule_delete" : "schedule_commit", data: commit })
    return
  }

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      queueSync({ type: action === "delete" ? "schedule_delete" : "schedule_commit", data: commit })
      return
    }

    if (action === "delete") {
      const { error } = await supabase.from("schedule_commits").delete().eq("user_id", user.id).eq("date", commit.date)
      if (error) throw error
    } else {
      // Insert or update
      const { error } = await supabase.from("schedule_commits").upsert({
        id: commit.date, // Use date as ID for upsert
        user_id: user.id,
        date: commit.date,
        blocks: commit.blocks,
        committed_at: commit.committed_at,
        committed: commit.committed,
      })

      if (error) throw error
    }
  } catch (error) {
    console.error("Sync error:", error)
    queueSync({ type: action === "delete" ? "schedule_delete" : "schedule_commit", data: commit })
  }
}

/**
 * Sync task to Supabase
 */
export async function syncTask(task: Task, action: "insert" | "update" | "delete"): Promise<void> {
  if (!isSupabaseConfigured()) {
    // Queue for later sync
    queueSync({ type: `task_${action}` as any, data: task })
    return
  }

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      queueSync({ type: `task_${action}` as any, data: task })
      return
    }

    if (action === "insert" || action === "update") {
      const { error } = await supabase.from("tasks").upsert({
        id: task.id,
        user_id: user.id,
        text: task.text || "",
        completed: task.completed ?? false,
        created_at: task.created_at,
        updated_at: new Date().toISOString(),
      })

      if (error) throw error
    } else if (action === "delete") {
      const { error } = await supabase.from("tasks").delete().eq("id", task.id).eq("user_id", user.id)

      if (error) throw error
    }
  } catch (error) {
    console.error("Sync error:", error)
    
    // Check if error is permanent (data format issue) vs transient (network)
    const isPermanentError = error instanceof Error && 
      (error.message.includes("invalid") || error.message.includes("constraint"))
    
    if (!isPermanentError) {
      // Only queue transient errors for retry
      queueSync({ type: `task_${action}` as any, data: task })
    }
  }
}

/**
 * Process sync queue (runs when online)
 */
export async function processSyncQueue(): Promise<void> {
  if (!isSupabaseConfigured() || !navigator.onLine) {
    return
  }

  const queue = getSyncQueue()
  if (queue.length === 0) return

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  for (const item of queue) {
    // Skip items that have exceeded max retries
    if (item.retryCount >= MAX_RETRIES) {
      console.warn(`Skipping ${item.type} after ${item.retryCount} failed attempts`)
      removeFromQueue(item.id)
      continue
    }
    
    try {
      if (item.type === "journal_insert" || item.type === "journal_update") {
        await syncJournalEntry(item.data, item.type === "journal_insert" ? "insert" : "update")
      } else if (item.type === "journal_delete") {
        await syncJournalEntry(item.data, "delete")
      } else if (item.type === "schedule_commit") {
        await syncScheduleCommit(item.data)
      } else if (item.type === "schedule_delete") {
        await syncScheduleCommit(item.data, "delete")
      } else if (item.type === "task_insert" || item.type === "task_update") {
        await syncTask(item.data, item.type === "task_insert" ? "insert" : "update")
      } else if (item.type === "task_delete") {
        await syncTask(item.data, "delete")
      }

      // Success - remove from queue
      removeFromQueue(item.id)
    } catch (error) {
      console.error(`Failed to sync ${item.type}:`, error)
      
      // Update retry count and error message
      const queue = getSyncQueue()
      const itemIndex = queue.findIndex((q) => q.id === item.id)
      if (itemIndex >= 0) {
        queue[itemIndex].retryCount++
        queue[itemIndex].lastError = error instanceof Error ? error.message : String(error)
        try {
          storage.set("sync_queue", queue)
        } catch (e) {
          // If storage is full, remove this item
          console.warn("Storage full, removing failed sync item")
          removeFromQueue(item.id)
        }
      }
    }
  }
}

/**
 * Pull data from Supabase to local storage
 */
export async function pullFromSupabase(): Promise<{
  journalEntries: JournalEntry[]
  scheduleCommits: DayCommit[]
  tasks: Task[]
}> {
  if (!isSupabaseConfigured()) {
    return { journalEntries: [], scheduleCommits: [], tasks: [] }
  }

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return { journalEntries: [], scheduleCommits: [], tasks: [] }
    }

    // Pull journal entries
    const { data: journalData, error: journalError } = await supabase
      .from("journal_entries")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (journalError) throw journalError

    // Pull tasks
    const { data: tasksData, error: tasksError } = await supabase
      .from("tasks")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (tasksError) throw tasksError

    // Pull schedule commits
    const { data: scheduleData, error: scheduleError } = await supabase
      .from("schedule_commits")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: false })

    if (scheduleError) throw scheduleError

    // Convert schedule data to DayCommit format
    const scheduleCommits: DayCommit[] = (scheduleData || []).map((item: any) => ({
      date: item.date,
      blocks: item.blocks as TimeBlock[],
      committed_at: item.committed_at,
      committed: item.committed ?? true,
    }))

    // Convert tasks data to Task format
    const tasks: Task[] = (tasksData || []).map((item: any) => ({
      id: item.id,
      text: item.text,
      completed: item.completed ?? false,
      created_at: item.created_at,
    }))

    return {
      journalEntries: (journalData || []) as JournalEntry[],
      scheduleCommits,
      tasks,
    }
  } catch (error) {
    console.error("Pull error:", error)
    return { journalEntries: [], scheduleCommits: [], tasks: [] }
  }
}

/**
 * Start background sync (runs periodically)
 */
let syncInterval: NodeJS.Timeout | null = null

export function startBackgroundSync(intervalMs: number = 30000): void {
  if (syncInterval) return

  // Initial sync
  processSyncQueue()

  // Periodic sync
  syncInterval = setInterval(() => {
    processSyncQueue()
  }, intervalMs)
}

export function stopBackgroundSync(): void {
  if (syncInterval) {
    clearInterval(syncInterval)
    syncInterval = null
  }
}
