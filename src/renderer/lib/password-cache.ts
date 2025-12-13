/**
 * Password Cache
 * Temporarily stores user password in memory for encryption key derivation
 * Password is cleared on logout or after a timeout
 * NEVER persisted to disk or localStorage
 */

// In-memory password cache (cleared on logout)
let passwordCache: {
  userId: string
  password: string
  timestamp: number
} | null = null

const PASSWORD_CACHE_TIMEOUT = 30 * 60 * 1000 // 30 minutes

/**
 * Cache password in memory (session only)
 * @param userId - User ID
 * @param password - User password
 */
export function cachePassword(userId: string, password: string): void {
  passwordCache = {
    userId,
    password,
    timestamp: Date.now(),
  }
}

/**
 * Get cached password
 * @param userId - User ID
 * @returns Cached password or null if not cached/expired
 */
export function getCachedPassword(userId: string): string | null {
  if (!passwordCache || passwordCache.userId !== userId) {
    return null
  }

  // Check if cache expired
  const age = Date.now() - passwordCache.timestamp
  if (age > PASSWORD_CACHE_TIMEOUT) {
    clearPasswordCache()
    return null
  }

  return passwordCache.password
}

/**
 * Clear password cache (called on logout)
 */
export function clearPasswordCache(): void {
  passwordCache = null
}

/**
 * Check if password is cached
 */
export function hasCachedPassword(userId: string): boolean {
  return getCachedPassword(userId) !== null
}

