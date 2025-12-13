import { storage } from "./storage"

interface CachedResponse {
  query: string
  response: string
  timestamp: number
  expiresAt: number
}

const CACHE_TTL = 24 * 60 * 60 * 1000 // 24 hours
const MAX_CACHE_SIZE = 50

/**
 * Simple query matching (checks if cached query is similar to new query)
 */
function isSimilarQuery(query1: string, query2: string): boolean {
  const words1 = query1.toLowerCase().split(/\s+/)
  const words2 = query2.toLowerCase().split(/\s+/)
  const commonWords = words1.filter((w) => words2.includes(w))
  const similarity = commonWords.length / Math.max(words1.length, words2.length)
  return similarity > 0.5 // 50% word overlap
}

/**
 * Cache AI responses locally for offline use
 */
export class AICache {
  private getCache(): CachedResponse[] {
    return storage.get<CachedResponse[]>("ai_response_cache") || []
  }

  private setCache(cache: CachedResponse[]): void {
    // Keep only recent entries
    const sorted = cache.sort((a, b) => b.timestamp - a.timestamp)
    storage.set("ai_response_cache", sorted.slice(0, MAX_CACHE_SIZE))
  }

  /**
   * Get cached response if available
   */
  get(query: string): string | null {
    const cache = this.getCache()
    const now = Date.now()

    // Find similar cached response that hasn't expired
    const match = cache.find(
      (cached) => cached.expiresAt > now && isSimilarQuery(cached.query, query)
    )

    return match?.response || null
  }

  /**
   * Store response in cache
   */
  set(query: string, response: string): void {
    const cache = this.getCache()
    const now = Date.now()

    // Remove expired entries
    const valid = cache.filter((c) => c.expiresAt > now)

    // Add new entry
    valid.push({
      query,
      response,
      timestamp: now,
      expiresAt: now + CACHE_TTL,
    })

    this.setCache(valid)
  }

  /**
   * Clear expired entries
   */
  clean(): void {
    const cache = this.getCache()
    const now = Date.now()
    const valid = cache.filter((c) => c.expiresAt > now)
    this.setCache(valid)
  }
}

export const aiCache = new AICache()

