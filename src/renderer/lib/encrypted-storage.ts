/**
 * Encrypted Storage Adapters
 * Handles encryption/decryption of data before syncing to Supabase
 * Supports both encrypted and unencrypted data (backward compatible)
 */

import { encryptData, decryptData } from './encryption'
import { getEncryptionKey, isEncryptionEnabled } from './key-manager'
import type { CryptoKey } from './encryption'
import type { JournalEntry } from './journal-store'
import type { DayCommit, TimeBlock } from './schedule-store'
import type { UserSettings, UserGoals } from './settings-store'

/**
 * Encrypt journal entry content
 * Returns entry with encrypted content (or original if encryption disabled)
 */
export async function encryptJournalEntry(
  entry: JournalEntry,
  userId: string,
  password: string
): Promise<{
  content: string | null
  encrypted_content: string | null
  encrypted: boolean
  encryption_version: number
  // Keep all other fields as-is
  id: string
  user_id?: string
  title?: string | null
  mood?: string | null
  tags: string[]
  is_sensitive: boolean
  visibility: string
  ai_summary?: string | null
  created_at: string
  updated_at: string
}> {
  // Check if encryption is enabled
  if (!isEncryptionEnabled(userId)) {
    // Return unencrypted entry
    return {
      ...entry,
      content: entry.content,
      encrypted_content: null,
      encrypted: false,
      encryption_version: 1,
    }
  }

  try {
    // Get encryption key
    const key = await getEncryptionKey(userId, password)

    // Encrypt sensitive fields
    const encryptedContent = await encryptData(entry.content, key)
    const encryptedTitle = entry.title ? await encryptData(entry.title, key) : null
    const encryptedAiSummary = entry.ai_summary ? await encryptData(entry.ai_summary, key) : null

    // Combine encrypted fields into a single JSON string
    const encryptedData = JSON.stringify({
      content: encryptedContent,
      title: encryptedTitle,
      ai_summary: encryptedAiSummary,
    })

    return {
      ...entry,
      content: null, // Set to NULL for encrypted entries
      encrypted_content: encryptedData,
      encrypted: true,
      encryption_version: 1,
      // Keep metadata plaintext
      mood: entry.mood,
      tags: entry.tags,
      is_sensitive: entry.is_sensitive,
      visibility: entry.visibility,
    }
  } catch (error) {
    console.error('Failed to encrypt journal entry:', error)
    // Fallback to unencrypted if encryption fails
    return {
      ...entry,
      content: entry.content,
      encrypted_content: null,
      encrypted: false,
      encryption_version: 1,
    }
  }
}

/**
 * Decrypt journal entry content
 * Returns entry with decrypted content (or original if not encrypted)
 */
export async function decryptJournalEntry(
  entry: {
    content: string | null
    encrypted_content: string | null
    encrypted: boolean
    encryption_version: number
    title?: string | null
    ai_summary?: string | null
    [key: string]: any
  },
  userId: string,
  password: string
): Promise<JournalEntry> {
  // If not encrypted, return as-is
  if (!entry.encrypted || !entry.encrypted_content) {
    return {
      id: entry.id,
      title: entry.title || undefined,
      content: entry.content || '',
      mood: entry.mood as any,
      tags: entry.tags || [],
      is_sensitive: entry.is_sensitive ?? false,
      visibility: entry.visibility as any,
      ai_summary: entry.ai_summary || undefined,
      created_at: entry.created_at,
    }
  }

  try {
    // Get encryption key
    const key = await getEncryptionKey(userId, password)

    // Decrypt combined encrypted data
    const encryptedData = JSON.parse(entry.encrypted_content)
    
    const content = await decryptData(encryptedData.content, key)
    const title = encryptedData.title ? await decryptData(encryptedData.title, key) : undefined
    const ai_summary = encryptedData.ai_summary ? await decryptData(encryptedData.ai_summary, key) : undefined

    return {
      id: entry.id,
      title,
      content,
      mood: entry.mood as any,
      tags: entry.tags || [],
      is_sensitive: entry.is_sensitive ?? false,
      visibility: entry.visibility as any,
      ai_summary,
      created_at: entry.created_at,
    }
  } catch (error) {
    console.error('Failed to decrypt journal entry:', error)
    throw new Error('Failed to decrypt journal entry. Please check your password.')
  }
}

/**
 * Encrypt schedule commit blocks
 */
export async function encryptScheduleCommit(
  commit: DayCommit,
  userId: string,
  password: string
): Promise<{
  blocks: any | null
  encrypted_blocks: string | null
  encrypted: boolean
  encryption_version: number
  // Keep all other fields
  date: string
  committed_at: string
  committed: boolean
  finalized_at?: string | null
  id?: string
  user_id?: string
}> {
  // Check if encryption is enabled
  if (!isEncryptionEnabled(userId)) {
    return {
      ...commit,
      blocks: commit.blocks,
      encrypted_blocks: null,
      encrypted: false,
      encryption_version: 1,
    }
  }

  try {
    // Get encryption key
    const key = await getEncryptionKey(userId, password)

    // Encrypt blocks JSON
    const blocksJson = JSON.stringify(commit.blocks)
    const encryptedBlocks = await encryptData(blocksJson, key)

    return {
      ...commit,
      blocks: null, // Set to NULL for encrypted commits
      encrypted_blocks: encryptedBlocks,
      encrypted: true,
      encryption_version: 1,
    }
  } catch (error) {
    console.error('Failed to encrypt schedule commit:', error)
    // Fallback to unencrypted
    return {
      ...commit,
      blocks: commit.blocks,
      encrypted_blocks: null,
      encrypted: false,
      encryption_version: 1,
    }
  }
}

/**
 * Decrypt schedule commit blocks
 */
export async function decryptScheduleCommit(
  commit: {
    blocks: any | null
    encrypted_blocks: string | null
    encrypted: boolean
    encryption_version: number
    date: string
    committed_at: string
    committed: boolean
    finalized_at?: string | null
    [key: string]: any
  },
  userId: string,
  password: string
): Promise<DayCommit> {
  // If not encrypted, return as-is
  if (!commit.encrypted || !commit.encrypted_blocks) {
    return {
      date: commit.date,
      blocks: commit.blocks || [],
      committed_at: commit.committed_at,
      committed: commit.committed ?? true,
      finalized_at: commit.finalized_at || undefined,
    }
  }

  try {
    // Get encryption key
    const key = await getEncryptionKey(userId, password)

    // Decrypt blocks
    const blocksJson = await decryptData(commit.encrypted_blocks, key)
    const blocks = JSON.parse(blocksJson) as TimeBlock[]

    return {
      date: commit.date,
      blocks,
      committed_at: commit.committed_at,
      committed: commit.committed ?? true,
      finalized_at: commit.finalized_at || undefined,
    }
  } catch (error) {
    console.error('Failed to decrypt schedule commit:', error)
    throw new Error('Failed to decrypt schedule commit. Please check your password.')
  }
}

/**
 * Encrypt user goals
 */
export async function encryptUserGoals(
  userGoals: UserGoals | undefined,
  userId: string,
  password: string
): Promise<string | null> {
  if (!userGoals || !isEncryptionEnabled(userId)) {
    return null
  }

  try {
    const key = await getEncryptionKey(userId, password)
    const goalsJson = JSON.stringify(userGoals)
    return await encryptData(goalsJson, key)
  } catch (error) {
    console.error('Failed to encrypt user goals:', error)
    return null
  }
}

/**
 * Decrypt user goals
 */
export async function decryptUserGoals(
  encryptedGoals: string | null | undefined,
  userId: string,
  password: string
): Promise<UserGoals | undefined> {
  if (!encryptedGoals || !isEncryptionEnabled(userId)) {
    return undefined
  }

  try {
    const key = await getEncryptionKey(userId, password)
    const goalsJson = await decryptData(encryptedGoals, key)
    return JSON.parse(goalsJson) as UserGoals
  } catch (error) {
    console.error('Failed to decrypt user goals:', error)
    return undefined
  }
}

/**
 * Encrypt task text
 */
export async function encryptTask(
  task: { id: string; text: string; completed: boolean; created_at: string },
  userId: string,
  password: string
): Promise<{
  text: string | null
  encrypted_text: string | null
  encrypted: boolean
  encryption_version: number
  // Keep all other fields
  id: string
  user_id: string  // Always include user_id for RLS
  completed: boolean
  created_at: string
  updated_at: string
}> {
  // Check if encryption is enabled
  if (!isEncryptionEnabled(userId)) {
    return {
      ...task,
      user_id: userId,  // Always include user_id
      text: task.text,
      encrypted_text: null,
      encrypted: false,
      encryption_version: 1,
      updated_at: new Date().toISOString(),
    }
  }

  try {
    // Get encryption key
    const key = await getEncryptionKey(userId, password)

    // Encrypt task text
    const encryptedText = await encryptData(task.text, key)

    return {
      ...task,
      user_id: userId,  // Always include user_id for RLS
      text: null, // Set to NULL for encrypted tasks (column should be nullable)
      encrypted_text: encryptedText,
      encrypted: true,
      encryption_version: 1,
      updated_at: new Date().toISOString(),
    }
  } catch (error) {
    console.error('Failed to encrypt task:', error)
    // Fallback to unencrypted if encryption fails
    return {
      ...task,
      user_id: userId,  // Always include user_id
      text: task.text,
      encrypted_text: null,
      encrypted: false,
      encryption_version: 1,
      updated_at: new Date().toISOString(),
    }
  }
}

/**
 * Decrypt task text
 */
export async function decryptTask(
  task: {
    text: string | null
    encrypted_text: string | null
    encrypted: boolean
    encryption_version: number
    id: string
    completed: boolean
    created_at: string
    [key: string]: any
  },
  userId: string,
  password: string
): Promise<{ id: string; text: string; completed: boolean; created_at: string }> {
  // If not encrypted, return as-is
  if (!task.encrypted || !task.encrypted_text) {
    return {
      id: task.id,
      text: task.text || '',
      completed: task.completed ?? false,
      created_at: task.created_at,
    }
  }

  try {
    // Get encryption key
    const key = await getEncryptionKey(userId, password)

    // Decrypt task text
    const text = await decryptData(task.encrypted_text, key)

    return {
      id: task.id,
      text,
      completed: task.completed ?? false,
      created_at: task.created_at,
    }
  } catch (error) {
    console.error('Failed to decrypt task:', error)
    throw new Error('Failed to decrypt task. Please check your password.')
  }
}

// Password is cached in memory during session (cleared on logout)
// This is needed to derive encryption keys
// The password cache is managed by password-cache.ts

