/**
 * Key Manager
 * Manages user encryption keys derived from password
 * Keys are cached in memory and cleared on logout
 */

import { deriveKeyFromPassword, generateSalt, saltToBase64, base64ToSalt, type CryptoKey } from './encryption'
import { storage } from './storage'
import { supabase } from './supabase'

const ENCRYPTION_KEY_CACHE_KEY = 'encryption_key_cache'
const ENCRYPTION_SALT_KEY = 'encryption_salt'
const ENCRYPTION_ENABLED_KEY = 'encryption_enabled'

interface KeyCache {
  key: CryptoKey // Not serializable, stored in memory only
  userId: string
  timestamp: number
}

// In-memory cache (cleared on logout)
let keyCache: KeyCache | null = null

/**
 * Initialize encryption for a user
 * Generates salt and stores it (encrypted with password)
 * @param userId - User ID
 * @param password - User's password
 * @returns Salt (base64 encoded) to store in Supabase
 */
export async function initializeEncryption(
  userId: string,
  password: string
): Promise<string> {
  // Generate salt for this user
  const salt = generateSalt()
  const saltBase64 = saltToBase64(salt)

  // Store salt locally (will also be stored in Supabase)
  storage.set(`${ENCRYPTION_SALT_KEY}_${userId}`, saltBase64)
  storage.set(`${ENCRYPTION_ENABLED_KEY}_${userId}`, true)

  // Derive key to verify it works
  const key = await deriveKeyFromPassword(password, salt)
  
  // Cache key in memory
  keyCache = {
    key,
    userId,
    timestamp: Date.now(),
  }

  return saltBase64
}

/**
 * Get encryption key for current user
 * Derives from password if not cached
 * @param userId - User ID
 * @param password - User's password
 * @returns Encryption key
 */
export async function getEncryptionKey(
  userId: string,
  password: string
): Promise<CryptoKey> {
  // Check cache first
  if (keyCache && keyCache.userId === userId) {
    // Cache is valid (not expired, same user)
    return keyCache.key
  }

  // Get salt from storage
  const saltBase64 = storage.get<string>(`${ENCRYPTION_SALT_KEY}_${userId}`)
  if (!saltBase64) {
    throw new Error('Encryption not initialized. Please enable encryption in settings.')
  }

  const salt = base64ToSalt(saltBase64)

  // Derive key from password
  const key = await deriveKeyFromPassword(password, salt)

  // Cache in memory
  keyCache = {
    key,
    userId,
    timestamp: Date.now(),
  }

  return key
}

/**
 * Check if encryption is enabled for user
 */
export function isEncryptionEnabled(userId: string): boolean {
  return storage.get<boolean>(`${ENCRYPTION_ENABLED_KEY}_${userId}`) === true
}

/**
 * Enable encryption for user
 * @param userId - User ID
 * @param password - User's password
 */
export async function enableEncryption(
  userId: string,
  password: string
): Promise<void> {
  // Initialize encryption
  const saltBase64 = await initializeEncryption(userId, password)

  // Store salt in Supabase user_settings
  try {
    const { error } = await supabase
      .from('user_settings')
      .upsert({
        user_id: userId,
        encryption_salt: saltBase64,
        encryption_enabled: true,
        encryption_version: 1,
      }, {
        onConflict: 'user_id'
      })

    if (error) {
      console.error('Failed to store encryption salt in Supabase:', error)
      // Continue anyway - salt is stored locally
    }
  } catch (error) {
    console.error('Error storing encryption salt:', error)
    // Continue anyway - salt is stored locally
  }
}

/**
 * Disable encryption (for testing/migration)
 * WARNING: This will make encrypted data inaccessible
 */
export function disableEncryption(userId: string): void {
  storage.remove(`${ENCRYPTION_SALT_KEY}_${userId}`)
  storage.remove(`${ENCRYPTION_ENABLED_KEY}_${userId}`)
  clearKeyCache()
}

/**
 * Clear encryption key from memory
 * Should be called on logout
 */
export function clearKeyCache(): void {
  keyCache = null
}

/**
 * Get encryption salt from Supabase (for multi-device sync)
 */
export async function loadEncryptionSaltFromSupabase(
  userId: string
): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('user_settings')
      .select('encryption_salt, encryption_enabled')
      .eq('user_id', userId)
      .single()

    if (error || !data) {
      return null
    }

    if (data.encryption_enabled && data.encryption_salt) {
      // Store locally for faster access
      storage.set(`${ENCRYPTION_SALT_KEY}_${userId}`, data.encryption_salt)
      storage.set(`${ENCRYPTION_ENABLED_KEY}_${userId}`, true)
      return data.encryption_salt
    }

    return null
  } catch (error) {
    console.error('Error loading encryption salt from Supabase:', error)
    return null
  }
}

/**
 * Check if user has encryption enabled (check Supabase)
 */
export async function checkEncryptionStatus(userId: string): Promise<boolean> {
  // Check local first
  if (isEncryptionEnabled(userId)) {
    return true
  }

  // Check Supabase
  try {
    const { data } = await supabase
      .from('user_settings')
      .select('encryption_enabled')
      .eq('user_id', userId)
      .single()

    if (data?.encryption_enabled) {
      storage.set(`${ENCRYPTION_ENABLED_KEY}_${userId}`, true)
      return true
    }
  } catch (error) {
    console.error('Error checking encryption status:', error)
  }

  return false
}

