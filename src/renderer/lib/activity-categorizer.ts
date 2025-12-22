/**
 * Activity Categorizer
 * 
 * Categorizes block activities into identity-specific categories.
 * Uses LLM when available, falls back to fuzzy keyword matching.
 */

import { getCategoriesForIdentity, type ActivityCategory } from "./identity-categories"
import { getAIProvider, type AIConfig } from "./ai-providers"
import { useSettingsStore } from "./settings-store"

// ============================================
// Types
// ============================================

export interface CategorizedActivity {
  blockName: string
  identity: string
  category: ActivityCategory | null  // null if uncategorizable
  confidence: "high" | "medium" | "low"
  method: "llm" | "fuzzy" | "none"
}

// ============================================
// Fuzzy Keyword Matching
// ============================================

/**
 * Attempts to categorize an activity using keyword matching
 */
function fuzzyMatch(
  blockName: string, 
  categories: ActivityCategory[]
): { category: ActivityCategory; confidence: "high" | "medium" | "low" } | null {
  const normalized = blockName.toLowerCase().trim()
  const words = normalized.split(/\s+/)
  
  let bestMatch: { category: ActivityCategory; score: number } | null = null
  
  for (const category of categories) {
    let score = 0
    
    for (const keyword of category.keywords) {
      const keywordLower = keyword.toLowerCase()
      
      // Exact word match (highest score)
      if (words.includes(keywordLower)) {
        score += 10
      }
      // Contains keyword
      else if (normalized.includes(keywordLower)) {
        score += 5
      }
      // Keyword contains word (partial match)
      else if (words.some(w => keywordLower.includes(w) && w.length > 3)) {
        score += 2
      }
    }
    
    if (score > 0 && (!bestMatch || score > bestMatch.score)) {
      bestMatch = { category, score }
    }
  }
  
  if (!bestMatch) return null
  
  // Determine confidence based on score
  const confidence = bestMatch.score >= 10 ? "high" 
                   : bestMatch.score >= 5 ? "medium" 
                   : "low"
  
  return { category: bestMatch.category, confidence }
}

// ============================================
// LLM Categorization
// ============================================

/**
 * Uses LLM to categorize an activity
 */
async function llmCategorize(
  blockName: string,
  identity: string,
  categories: ActivityCategory[]
): Promise<{ category: ActivityCategory; confidence: "high" | "medium" } | null> {
  try {
    const settings = useSettingsStore.getState().settings
    
    const config: AIConfig = settings.aiProvider === "ollama" 
      ? {
          provider: "ollama",
          ollamaUrl: settings.ollamaUrl,
          ollamaModel: settings.ollamaModel,
        }
      : {
          provider: "gemini",
          apiKey: settings.geminiApiKey,
          model: "gemini-2.0-flash",
        }
    
    // Skip if no API key for cloud provider
    if (config.provider === "gemini" && !config.apiKey) {
      return null
    }
    
    const provider = getAIProvider(config)
    
    const categoryList = categories.map(c => `${c.id}: ${c.name} (${c.emoji})`).join("\n")
    
    const prompt = `Categorize this activity for someone with "${identity}" identity.

Activity: "${blockName}"

Available categories:
${categoryList}

Respond with ONLY the category ID (e.g., "cardio" or "deep_work") or "none" if it doesn't fit any category.`

    const response = await provider.chat([
      { role: "user", content: prompt }
    ])
    
    if (response.error || !response.content) {
      return null
    }
    
    const categoryId = response.content.toLowerCase().trim()
    
    if (categoryId === "none") {
      return null
    }
    
    const matchedCategory = categories.find(c => c.id === categoryId)
    
    if (matchedCategory) {
      return { category: matchedCategory, confidence: "high" }
    }
    
    return null
  } catch (error) {
    console.error("[Categorizer] LLM error:", error)
    return null
  }
}

// ============================================
// Main Categorization Function
// ============================================

/**
 * Categorizes an activity block into an identity-specific category
 * Uses LLM first, falls back to fuzzy matching
 */
export async function categorizeActivity(
  blockName: string,
  identity: string
): Promise<CategorizedActivity> {
  const categories = getCategoriesForIdentity(identity)
  
  // If no categories defined for this identity, can't categorize
  if (categories.length === 0) {
    return {
      blockName,
      identity,
      category: null,
      confidence: "low",
      method: "none"
    }
  }
  
  // Try fuzzy match first (faster)
  const fuzzyResult = fuzzyMatch(blockName, categories)
  
  // If high confidence fuzzy match, use it
  if (fuzzyResult && fuzzyResult.confidence === "high") {
    return {
      blockName,
      identity,
      category: fuzzyResult.category,
      confidence: "high",
      method: "fuzzy"
    }
  }
  
  // Try LLM for better accuracy
  const llmResult = await llmCategorize(blockName, identity, categories)
  
  if (llmResult) {
    return {
      blockName,
      identity,
      category: llmResult.category,
      confidence: llmResult.confidence,
      method: "llm"
    }
  }
  
  // Fall back to fuzzy result if we had one
  if (fuzzyResult) {
    return {
      blockName,
      identity,
      category: fuzzyResult.category,
      confidence: fuzzyResult.confidence,
      method: "fuzzy"
    }
  }
  
  // No match found
  return {
    blockName,
    identity,
    category: null,
    confidence: "low",
    method: "none"
  }
}

/**
 * Batch categorize multiple activities (more efficient)
 */
export async function categorizeActivities(
  activities: Array<{ blockName: string; identity: string }>
): Promise<CategorizedActivity[]> {
  // Process in parallel for speed
  const results = await Promise.all(
    activities.map(a => categorizeActivity(a.blockName, a.identity))
  )
  return results
}

/**
 * Quick sync categorization (fuzzy only, no LLM)
 * Use when you need immediate results without async
 */
export function categorizeActivitySync(
  blockName: string,
  identity: string
): CategorizedActivity {
  const categories = getCategoriesForIdentity(identity)
  
  if (categories.length === 0) {
    return {
      blockName,
      identity,
      category: null,
      confidence: "low",
      method: "none"
    }
  }
  
  const fuzzyResult = fuzzyMatch(blockName, categories)
  
  if (fuzzyResult) {
    return {
      blockName,
      identity,
      category: fuzzyResult.category,
      confidence: fuzzyResult.confidence,
      method: "fuzzy"
    }
  }
  
  return {
    blockName,
    identity,
    category: null,
    confidence: "low",
    method: "none"
  }
}




