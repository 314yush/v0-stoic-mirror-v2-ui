/**
 * Conversation Storage
 * Temporarily stores chat conversations in localStorage
 * Auto-clears after 1 hour if not saved
 */

import { storage } from "./storage"
import type { AIMessage } from "./ai-providers"

interface StoredConversation {
  messages: AIMessage[]
  timestamp: number // When conversation was last updated
  saved: boolean // Whether conversation has been saved to journal
}

const CONVERSATION_KEY = "chat_conversation_draft"
const CONVERSATION_TTL = 60 * 60 * 1000 // 1 hour in milliseconds

/**
 * Save conversation to local storage
 */
export function saveConversation(messages: AIMessage[]): void {
  if (messages.length <= 2) {
    // Only system + greeting, nothing to save
    return
  }

  const conversation: StoredConversation = {
    messages,
    timestamp: Date.now(),
    saved: false,
  }

  storage.set(CONVERSATION_KEY, conversation)
}

/**
 * Load conversation from local storage
 * Returns null if conversation is expired or doesn't exist
 */
export function loadConversation(): AIMessage[] | null {
  const stored = storage.get<StoredConversation>(CONVERSATION_KEY)
  
  if (!stored) {
    return null
  }

  // Check if conversation is expired
  const age = Date.now() - stored.timestamp
  if (age > CONVERSATION_TTL) {
    // Conversation expired, clear it
    clearConversation()
    return null
  }

  // Check if conversation was saved (shouldn't happen, but just in case)
  if (stored.saved) {
    clearConversation()
    return null
  }

  return stored.messages
}

/**
 * Clear conversation from storage
 */
export function clearConversation(): void {
  storage.remove(CONVERSATION_KEY)
}

/**
 * Mark conversation as saved (will be cleared on next check)
 */
export function markConversationSaved(): void {
  clearConversation()
}

/**
 * Check and clean up expired conversations
 */
export function cleanupExpiredConversations(): void {
  const stored = storage.get<StoredConversation>(CONVERSATION_KEY)
  
  if (!stored) {
    return
  }

  const age = Date.now() - stored.timestamp
  if (age > CONVERSATION_TTL) {
    clearConversation()
  }
}

