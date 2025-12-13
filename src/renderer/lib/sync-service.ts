import { supabase, isSupabaseConfigured } from "./supabase"
import type { JournalEntry } from "./journal-store"
import type { DayCommit, TimeBlock } from "./schedule-store"
import type { Task } from "./tasks-store"
import type { UserSettings } from "./settings-store"
import { storage } from "./storage"
import { encryptJournalEntry, decryptJournalEntry, encryptScheduleCommit, decryptScheduleCommit, encryptTask, decryptTask } from "./encrypted-storage"
import { getCachedPassword } from "./password-cache"
import { isEncryptionEnabled } from "./key-manager"

/**
 * Sync Service
 * Handles syncing local data to Supabase in background
 * Local-first: Always write to local storage first, sync in background
 */

interface SyncQueue {
  type: "journal_insert" | "journal_update" | "journal_delete" | "schedule_commit" | "schedule_delete" | "task_insert" | "task_update" | "task_delete" | "settings_update"
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
      
      // Check if encryption is enabled and encrypt if needed
      let encryptedEntry: any = {
        id: entry.id,
        user_id: user.id,
        title: entry.title || null,
        content: entry.content || "",
        mood: entry.mood || null,
        tags: tagsArray.length > 0 ? tagsArray : [],
        is_sensitive: entry.is_sensitive ?? false,
        visibility: entry.visibility || "private",
        ai_summary: entry.ai_summary || null,
        created_at: entry.created_at,
        updated_at: new Date().toISOString(),
        encrypted: false,
        encryption_version: 1,
        encrypted_content: null,
      }

      // Encrypt if encryption is enabled
      if (isEncryptionEnabled(user.id)) {
        const password = getCachedPassword(user.id)
        if (password) {
          try {
            encryptedEntry = await encryptJournalEntry(entry, user.id, password)
          } catch (error) {
            console.error("Encryption failed, syncing unencrypted:", error)
            // Continue with unencrypted if encryption fails
          }
        } else {
          console.warn("Encryption enabled but password not cached. Syncing unencrypted.")
        }
      }
      
      const { error } = await supabase.from("journal_entries").upsert(encryptedEntry)

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
      let encryptedCommit: any = {
        id: commit.date, // Use date as ID for upsert
        user_id: user.id,
        date: commit.date,
        blocks: commit.blocks,
        committed_at: commit.committed_at,
        committed: commit.committed,
        finalized_at: commit.finalized_at || null,
        encrypted: false,
        encryption_version: 1,
        encrypted_blocks: null,
      }

      // Encrypt if encryption is enabled
      if (isEncryptionEnabled(user.id)) {
        const password = getCachedPassword(user.id)
        if (password) {
          try {
            encryptedCommit = await encryptScheduleCommit(commit, user.id, password)
          } catch (error) {
            console.error("Encryption failed, syncing unencrypted:", error)
            // Continue with unencrypted if encryption fails
          }
        } else {
          console.warn("Encryption enabled but password not cached. Syncing unencrypted.")
        }
      }

      const { error } = await supabase.from("schedule_commits").upsert(encryptedCommit)

      if (error) throw error
    }
  } catch (error: any) {
    console.error("Sync error:", error)
    
    // Check if error is due to missing finalized_at column
    if (error?.message?.includes("finalized_at") || error?.code === "PGRST204") {
      console.warn("⚠️ finalized_at column missing in Supabase. Attempting sync without it...")
      
      // Retry sync without finalized_at column (for backwards compatibility)
      try {
        if (action === "delete") {
          const { error: deleteError } = await supabase
            .from("schedule_commits")
            .delete()
            .eq("id", commit.date)
            .eq("user_id", user.id)
          if (deleteError) throw deleteError
        } else {
          // Insert or update without finalized_at
          const { error: upsertError } = await supabase.from("schedule_commits").upsert({
            id: commit.date,
            user_id: user.id,
            date: commit.date,
            blocks: commit.blocks,
            committed_at: commit.committed_at,
            committed: commit.committed,
            // Omit finalized_at - column doesn't exist yet
          })
          if (upsertError) throw upsertError
        }
        console.log("✅ Sync succeeded without finalized_at column")
        return // Success - don't queue
      } catch (retryError) {
        console.error("Retry sync also failed:", retryError)
        // Fall through to queue sync
      }
    }
    
    // Queue for retry if sync failed
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
      error: authError,
    } = await supabase.auth.getUser()
    
    if (authError) {
      console.error('❌ Auth error in syncTask:', authError)
      queueSync({ type: `task_${action}` as any, data: task })
      return
    }
    
    if (!user) {
      console.warn('⚠️ No user found in syncTask, queuing for later')
      queueSync({ type: `task_${action}` as any, data: task })
      return
    }
    
    console.log('✅ Authenticated user in syncTask:', { userId: user.id, email: user.email })

    if (action === "insert" || action === "update") {
      // Check if encryption is enabled and encrypt if needed
      let encryptedTask: any = {
        id: task.id,
        user_id: user.id,
        text: task.text || "",
        completed: task.completed ?? false,
        created_at: task.created_at,
        updated_at: new Date().toISOString(),
        encrypted: false,
        encryption_version: 1,
        encrypted_text: null,
      }

      // Encrypt if encryption is enabled
      const encryptionEnabled = isEncryptionEnabled(user.id)
      console.log('🔐 Task sync - Encryption check:', { userId: user.id, encryptionEnabled })
      
      if (encryptionEnabled) {
        const password = getCachedPassword(user.id)
        console.log('🔐 Task sync - Password cached:', !!password)
        
        if (password) {
          try {
            encryptedTask = await encryptTask(task, user.id, password)
            // Ensure user_id is set (encryptTask should include it, but double-check)
            encryptedTask.user_id = user.id
            console.log('✅ Task encrypted successfully:', { 
              encrypted: encryptedTask.encrypted, 
              hasEncryptedText: !!encryptedTask.encrypted_text,
              userId: encryptedTask.user_id,
              authUid: user.id
            })
          } catch (error) {
            console.error("❌ Encryption failed, syncing unencrypted:", error)
            // Continue with unencrypted if encryption fails
            encryptedTask.user_id = user.id  // Ensure user_id is set
          }
        } else {
          console.warn("⚠️ Encryption enabled but password not cached. Syncing unencrypted.")
          encryptedTask.user_id = user.id  // Ensure user_id is set
        }
      } else {
        console.log('ℹ️ Encryption not enabled for user, syncing unencrypted')
        encryptedTask.user_id = user.id  // Ensure user_id is set
      }

      console.log('📤 Sending task to Supabase:', { 
        id: encryptedTask.id, 
        userId: encryptedTask.user_id, 
        encrypted: encryptedTask.encrypted,
        hasText: !!encryptedTask.text,
        hasEncryptedText: !!encryptedTask.encrypted_text
      })
      
      const { error } = await supabase.from("tasks").upsert(encryptedTask)

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
      } else if (item.type === "settings_update") {
        await syncUserSettings(item.data)
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
 * Sync user settings to Supabase
 */
export async function syncUserSettings(settings: UserSettings): Promise<void> {
  if (!isSupabaseConfigured()) {
    queueSync({ type: "settings_update", data: settings })
    return
  }

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      queueSync({ type: "settings_update", data: settings })
      return
    }

    // Prepare settings for Supabase
    const { userGoals, ...otherSettings } = settings

    const { error } = await supabase.from("user_settings").upsert({
      user_id: user.id,
      user_goals: userGoals || null,
      theme: otherSettings.theme || "dark",
      widget_enabled: otherSettings.widgetEnabled ?? true,
      wake_up_time: otherSettings.wakeUpTime || "07:00",
      wake_up_enabled: otherSettings.wakeUpEnabled ?? false,
      evening_wind_down_time: otherSettings.eveningWindDownTime || "22:00",
      evening_wind_down_enabled: otherSettings.eveningWindDownEnabled ?? true,
      commit_cutoff_time: otherSettings.commitCutoffTime || "22:00",
      // Keep existing ollama_config and personality_preferences if they exist
      updated_at: new Date().toISOString(),
    }, {
      onConflict: "user_id"
    })

    if (error) throw error
  } catch (error) {
    console.error("Sync error:", error)
    
    // Check if error is permanent (data format issue) vs transient (network)
    const isPermanentError = error instanceof Error && 
      (error.message.includes("invalid") || error.message.includes("constraint"))
    
    if (!isPermanentError) {
      // Only queue transient errors for retry
      queueSync({ type: "settings_update", data: settings })
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
  userSettings: UserSettings | null
}> {
  if (!isSupabaseConfigured()) {
    return { journalEntries: [], scheduleCommits: [], tasks: [], userSettings: null }
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

    // Decrypt journal entries if encrypted
    const decryptedJournalEntries = await Promise.all(
      (journalData || []).map(async (item: any) => {
        if (item.encrypted && item.encrypted_content) {
          const password = getCachedPassword(user.id)
          if (password) {
            try {
              return await decryptJournalEntry(item, user.id, password)
            } catch (error) {
              console.error("Failed to decrypt journal entry:", error)
              // Return entry with empty content if decryption fails
              return {
                id: item.id,
                title: undefined,
                content: "",
                mood: item.mood as any,
                tags: item.tags || [],
                is_sensitive: item.is_sensitive ?? false,
                visibility: item.visibility as any,
                ai_summary: undefined,
                created_at: item.created_at,
              }
            }
          } else {
            console.warn("Encrypted entry but password not cached. Skipping decryption.")
            return {
              id: item.id,
              title: undefined,
              content: "",
              mood: item.mood as any,
              tags: item.tags || [],
              is_sensitive: item.is_sensitive ?? false,
              visibility: item.visibility as any,
              ai_summary: undefined,
              created_at: item.created_at,
            }
          }
        }
        // Not encrypted, return as-is
        return {
          id: item.id,
          title: item.title || undefined,
          content: item.content || "",
          mood: item.mood as any,
          tags: item.tags || [],
          is_sensitive: item.is_sensitive ?? false,
          visibility: item.visibility as any,
          ai_summary: item.ai_summary || undefined,
          created_at: item.created_at,
        } as JournalEntry
      })
    )

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

    // Convert schedule data to DayCommit format (decrypt if encrypted)
    const scheduleCommits: DayCommit[] = await Promise.all(
      (scheduleData || []).map(async (item: any) => {
        // If encrypted, decrypt it
        if (item.encrypted && item.encrypted_blocks) {
          const password = getCachedPassword(user.id)
          if (password) {
            try {
              return await decryptScheduleCommit(item, user.id, password)
            } catch (error) {
              console.error("Failed to decrypt schedule commit:", error)
              // Return empty blocks if decryption fails
              return {
                date: item.date,
                blocks: [],
                committed_at: item.committed_at,
                committed: item.committed ?? true,
                finalized_at: item.finalized_at || undefined,
              }
            }
          } else {
            console.warn("Encrypted commit but password not cached. Skipping decryption.")
            return {
              date: item.date,
              blocks: [],
              committed_at: item.committed_at,
              committed: item.committed ?? true,
              finalized_at: item.finalized_at || undefined,
            }
          }
        }
        // Not encrypted, return as-is
        return {
          date: item.date,
          blocks: item.blocks as TimeBlock[],
          committed_at: item.committed_at,
          committed: item.committed ?? true,
          finalized_at: item.finalized_at || undefined,
        }
      })
    )

    // Convert tasks data to Task format (decrypt if encrypted)
    const tasks: Task[] = await Promise.all(
      (tasksData || []).map(async (item: any) => {
        // If encrypted, decrypt it
        if (item.encrypted && item.encrypted_text) {
          const password = getCachedPassword(user.id)
          if (password) {
            try {
              return await decryptTask(item, user.id, password)
            } catch (error) {
              console.error("Failed to decrypt task:", error)
              // Return task with empty text if decryption fails
              return {
                id: item.id,
                text: "",
                completed: item.completed ?? false,
                created_at: item.created_at,
              }
            }
          } else {
            console.warn("Encrypted task but password not cached. Skipping decryption.")
            return {
              id: item.id,
              text: "",
              completed: item.completed ?? false,
              created_at: item.created_at,
            }
          }
        }
        // Not encrypted, return as-is
        return {
          id: item.id,
          text: item.text || "",
          completed: item.completed ?? false,
          created_at: item.created_at,
        }
      })
    )

    // Pull user settings
    const { data: settingsData, error: settingsError } = await supabase
      .from("user_settings")
      .select("*")
      .eq("user_id", user.id)
      .single()

    if (settingsError && settingsError.code !== "PGRST116") {
      // PGRST116 = no rows returned, which is fine (user hasn't set settings yet)
      console.warn("Settings pull error:", settingsError)
    }

    // Convert settings data to UserSettings format
    let userSettings: UserSettings | null = null
    if (settingsData) {
      userSettings = {
        aiProvider: (settingsData.ollama_config as any)?.provider || "ollama",
        ollamaUrl: (settingsData.ollama_config as any)?.url || "http://localhost:11434",
        ollamaModel: (settingsData.ollama_config as any)?.model || "llama3.2:1b",
        geminiApiKey: (settingsData.ollama_config as any)?.geminiApiKey || "",
        theme: (settingsData.theme as "dark" | "light") || "dark",
        widgetEnabled: settingsData.widget_enabled ?? true,
        wakeUpTime: settingsData.wake_up_time || "07:00",
        wakeUpEnabled: settingsData.wake_up_enabled ?? false,
        eveningWindDownTime: settingsData.evening_wind_down_time || "22:00",
        eveningWindDownEnabled: settingsData.evening_wind_down_enabled ?? true,
        commitCutoffTime: settingsData.commit_cutoff_time || "22:00",
        userGoals: settingsData.user_goals || undefined,
      }
    }

    return {
      journalEntries: decryptedJournalEntries,
      scheduleCommits,
      tasks,
      userSettings,
    }
  } catch (error) {
    console.error("Pull error:", error)
    return { journalEntries: decryptedJournalEntries || [], scheduleCommits: [], tasks: [], userSettings: null }
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
