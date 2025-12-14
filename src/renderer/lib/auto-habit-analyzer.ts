/**
 * Auto-Habit Analyzer
 * 
 * Analyzes committed blocks to detect habit patterns.
 * Creates and removes habits based on thresholds.
 * 
 * How it works:
 * 1. User has north star identities (e.g., "Athlete", "Founder")
 * 2. User creates blocks with activity names (e.g., "Morning Run", "Gym")
 * 3. System matches activities to identities (Morning Run → Athlete)
 * 4. System categorizes activities (Morning Run → Cardio)
 * 5. After 3+ times in 10 days with 75%+ completion → create auto-habit
 * 
 * Thresholds:
 * - Create: 3+ occurrences in 10 days, 75%+ completion
 * - Remove: Falls below 75% OR < 3 times in 10 days
 * - At Risk: 60-74% completion rate
 */

import type { DayCommit, TimeBlock } from "./schedule-store"
import { categorizeActivitySync, type CategorizedActivity } from "./activity-categorizer"
import { getCategoriesForIdentity, type ActivityCategory } from "./identity-categories"
import { getDateStrLocal } from "./date-utils"
import { useSettingsStore } from "./settings-store"

// ============================================
// Types
// ============================================

export interface AutoHabit {
  id: string
  identity: string           // North star identity (Athlete, Founder)
  categoryId: string         // Category ID (cardio, strength, deep_work)
  categoryName: string       // Display name (Cardio, Strength, Deep Work)
  categoryEmoji: string      // Emoji for display
  
  // Stats
  occurrences: number        // Times in last 10 days
  completedCount: number     // Times marked "Yes"
  completionRate: number     // 0-100
  streak: number             // Current streak
  
  // Status
  status: "active" | "at_risk" | "inactive"
  atRiskMessage?: string     // Warning message when at risk
  
  // Detected activities
  detectedActivities: string[]  // Block names that contributed
  
  // Timestamps
  firstDetected: string
  lastActivity: string
}

export interface AnalysisResult {
  habits: AutoHabit[]
  newlyCreated: AutoHabit[]
  atRisk: AutoHabit[]
  removed: AutoHabit[]
}

// ============================================
// Constants
// ============================================

const DETECTION_WINDOW_DAYS = 10
const MIN_OCCURRENCES = 3
const MIN_COMPLETION_RATE = 75
const AT_RISK_COMPLETION_RATE = 60

// ============================================
// North Star Identity Extraction
// ============================================

/**
 * Extract north star identities from user's free-form goals
 */
function extractNorthStarIdentities(northStarText?: string): string[] {
  if (!northStarText) return []
  
  const identities: string[] = []
  const text = northStarText.toLowerCase()
  
  // Known identity keywords to look for
  const knownIdentities = [
    { keywords: ['athlete', 'fit', 'fitness', 'healthy', 'active', 'sports'], identity: 'athlete' },
    { keywords: ['founder', 'entrepreneur', 'startup', 'builder', 'ceo', 'business owner'], identity: 'founder' },
    { keywords: ['creator', 'artist', 'creative', 'designer', 'maker'], identity: 'creator' },
    { keywords: ['writer', 'author', 'blogger', 'journalist'], identity: 'creator' },
    { keywords: ['learner', 'student', 'researcher', 'scholar', 'academic'], identity: 'learner' },
    { keywords: ['parent', 'mom', 'dad', 'father', 'mother', 'caregiver', 'homemaker'], identity: 'homemaker' },
    { keywords: ['mindful', 'spiritual', 'meditator', 'zen', 'calm'], identity: 'mindful' },
    { keywords: ['social', 'connector', 'networker', 'community'], identity: 'social' },
  ]
  
  for (const { keywords, identity } of knownIdentities) {
    if (keywords.some(kw => text.includes(kw))) {
      if (!identities.includes(identity)) {
        identities.push(identity)
      }
    }
  }
  
  return identities
}

/**
 * Check if an activity aligns with a north star identity
 */
function checkActivityAlignment(
  activityName: string,
  identity: string
): boolean {
  const activity = activityName.toLowerCase()
  
  // Semantic matches for each identity
  const semanticMatches: Record<string, string[]> = {
    'athlete': [
      'exercise', 'workout', 'training', 'gym', 'running', 'run', 'jog', 'walk',
      'swim', 'cycle', 'bike', 'fitness', 'yoga', 'stretch', 'sports', 'basketball',
      'football', 'soccer', 'tennis', 'hiking', 'cardio', 'weights', 'lifting'
    ],
    'founder': [
      'work', 'coding', 'code', 'build', 'meeting', 'call', 'strategy', 'planning',
      'product', 'development', 'design', 'research', 'writing', 'email', 'admin',
      'startup', 'business', 'investor', 'pitch', 'hiring', 'deep work', 'focus'
    ],
    'creator': [
      'create', 'design', 'draw', 'paint', 'write', 'writing', 'blog', 'content',
      'video', 'photo', 'music', 'art', 'craft', 'edit', 'produce', 'publish',
      'creative', 'brainstorm', 'ideate'
    ],
    'learner': [
      'study', 'read', 'reading', 'learn', 'course', 'class', 'lecture', 'book',
      'research', 'practice', 'tutorial', 'lesson', 'homework', 'exam', 'review'
    ],
    'homemaker': [
      'clean', 'cook', 'cooking', 'meal', 'grocery', 'laundry', 'organize', 'family',
      'kids', 'children', 'home', 'household', 'chore', 'garden', 'maintenance'
    ],
    'mindful': [
      'meditate', 'meditation', 'mindful', 'breathe', 'breathing', 'prayer', 'pray',
      'journal', 'reflect', 'gratitude', 'spiritual', 'yoga', 'calm', 'peace'
    ],
    'social': [
      'friend', 'social', 'network', 'coffee', 'lunch', 'dinner', 'party', 'event',
      'meetup', 'date', 'call', 'catchup', 'hangout'
    ],
  }
  
  const matches = semanticMatches[identity] || []
  return matches.some(kw => activity.includes(kw))
}

// ============================================
// Analysis Functions
// ============================================

/**
 * Analyze committed blocks and detect auto-habits
 */
export function analyzeBlocks(
  commits: DayCommit[],
  existingHabits: AutoHabit[] = []
): AnalysisResult {
  const settings = useSettingsStore.getState().settings
  const northStarText = settings.userGoals?.northStar
  const northStarIdentities = extractNorthStarIdentities(northStarText)
  
  // If no north star identities, can't create habits
  if (northStarIdentities.length === 0) {
    return { habits: [], newlyCreated: [], atRisk: [], removed: existingHabits }
  }
  
  const today = new Date()
  const windowStart = new Date(today)
  windowStart.setDate(windowStart.getDate() - DETECTION_WINDOW_DAYS)
  const windowStartStr = getDateStrLocal(windowStart)
  
  // Get commits within the detection window
  const recentCommits = commits.filter(c => 
    c.date >= windowStartStr && c.committed
  )
  
  // Group blocks by identity + category
  // Key: "athlete-cardio", Value: blocks info
  const patterns = new Map<string, {
    identity: string
    category: ActivityCategory
    blocks: Array<{ block: TimeBlock; date: string; completed: boolean | null }>
    activities: Set<string>
  }>()
  
  for (const commit of recentCommits) {
    for (const block of commit.blocks) {
      const activityName = block.identity
      if (!activityName) continue
      
      // Check which north star identities this activity aligns with
      for (const nsIdentity of northStarIdentities) {
        if (!checkActivityAlignment(activityName, nsIdentity)) continue
        
        // Get categories for this north star identity
        const categories = getCategoriesForIdentity(nsIdentity)
        if (categories.length === 0) continue
        
        // Categorize the activity
        const categorized = categorizeActivitySync(activityName, nsIdentity)
        if (!categorized.category) continue
        
        const key = `${nsIdentity}-${categorized.category.id}`
        
        if (!patterns.has(key)) {
          patterns.set(key, {
            identity: nsIdentity,
            category: categorized.category,
            blocks: [],
            activities: new Set()
          })
        }
        
        const pattern = patterns.get(key)!
        pattern.blocks.push({
          block,
          date: commit.date,
          completed: block.completed ?? null
        })
        pattern.activities.add(activityName)
      }
    }
  }
  
  // Analyze each pattern and create/update habits
  const habits: AutoHabit[] = []
  const newlyCreated: AutoHabit[] = []
  const atRisk: AutoHabit[] = []
  const removed: AutoHabit[] = []
  
  for (const [key, pattern] of patterns) {
    // Count unique days with this pattern
    const uniqueDays = new Set(pattern.blocks.map(b => b.date))
    const occurrences = uniqueDays.size
    
    // Count completions (Yes answers)
    const completedBlocks = pattern.blocks.filter(b => b.completed === true)
    const answeredBlocks = pattern.blocks.filter(b => b.completed !== null)
    const completedCount = completedBlocks.length
    const completionRate = answeredBlocks.length > 0 
      ? Math.round((completedCount / answeredBlocks.length) * 100)
      : 0
    
    // Calculate streak
    const streak = calculateStreak(pattern.blocks, today)
    
    // Find existing habit
    const existingHabit = existingHabits.find(h => 
      h.identity === pattern.identity &&
      h.categoryId === pattern.category.id
    )
    
    // Determine status
    let status: "active" | "at_risk" | "inactive" = "inactive"
    let atRiskMessage: string | undefined
    
    const meetsThreshold = occurrences >= MIN_OCCURRENCES && completionRate >= MIN_COMPLETION_RATE
    const isAtRisk = occurrences >= MIN_OCCURRENCES && 
                     completionRate >= AT_RISK_COMPLETION_RATE && 
                     completionRate < MIN_COMPLETION_RATE
    
    if (meetsThreshold) {
      status = "active"
    } else if (isAtRisk) {
      status = "at_risk"
      const needed = Math.ceil((MIN_COMPLETION_RATE / 100) * answeredBlocks.length) - completedCount
      atRiskMessage = `${Math.max(1, needed)} more to maintain`
    }
    
    // Create habit object
    if (status !== "inactive") {
      const habit: AutoHabit = {
        id: existingHabit?.id || `auto-${key}-${Date.now()}`,
        identity: capitalizeFirst(pattern.identity),
        categoryId: pattern.category.id,
        categoryName: pattern.category.name,
        categoryEmoji: pattern.category.emoji,
        occurrences,
        completedCount,
        completionRate,
        streak,
        status,
        atRiskMessage,
        detectedActivities: Array.from(pattern.activities),
        firstDetected: existingHabit?.firstDetected || new Date().toISOString(),
        lastActivity: pattern.blocks[pattern.blocks.length - 1]?.date || getDateStrLocal(today)
      }
      
      habits.push(habit)
      
      if (status === "at_risk") {
        atRisk.push(habit)
      }
      
      if (!existingHabit && status === "active") {
        newlyCreated.push(habit)
      }
    } else if (existingHabit) {
      // Habit no longer meets threshold - mark as removed
      removed.push(existingHabit)
    }
  }
  
  // Check for existing habits that weren't found in patterns (completely inactive)
  for (const existingHabit of existingHabits) {
    const stillExists = habits.some(h => h.id === existingHabit.id)
    if (!stillExists && !removed.some(r => r.id === existingHabit.id)) {
      removed.push(existingHabit)
    }
  }
  
  return { habits, newlyCreated, atRisk, removed }
}

/**
 * Calculate current streak for a pattern
 */
function calculateStreak(
  blocks: Array<{ block: TimeBlock; date: string; completed: boolean | null }>,
  today: Date
): number {
  // Get unique dates with completed blocks, sorted descending
  const completedDates = [...new Set(
    blocks
      .filter(b => b.completed === true)
      .map(b => b.date)
  )].sort().reverse()
  
  if (completedDates.length === 0) return 0
  
  let streak = 0
  let checkDate = new Date(today)
  
  for (let i = 0; i < 365; i++) {
    const dateStr = getDateStrLocal(checkDate)
    
    if (completedDates.includes(dateStr)) {
      streak++
      checkDate.setDate(checkDate.getDate() - 1)
    } else {
      // Allow one day gap (streak continues if yesterday was completed)
      const yesterday = new Date(checkDate)
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayStr = getDateStrLocal(yesterday)
      
      if (completedDates.includes(yesterdayStr)) {
        checkDate.setDate(checkDate.getDate() - 1)
        continue
      }
      break
    }
  }
  
  return streak
}

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

/**
 * Get completion status for a specific date and category
 */
export function getCompletionForDate(
  commits: DayCommit[],
  identity: string,
  categoryId: string,
  date: string
): { completed: boolean; count: number } {
  const commit = commits.find(c => c.date === date && c.committed)
  if (!commit) return { completed: false, count: 0 }
  
  let completedCount = 0
  const identityLower = identity.toLowerCase()
  
  for (const block of commit.blocks) {
    const activityName = block.identity
    if (!activityName) continue
    
    // Check if this activity aligns with the identity
    if (!checkActivityAlignment(activityName, identityLower)) continue
    
    // Categorize and check category match
    const categorized = categorizeActivitySync(activityName, identityLower)
    if (categorized.category?.id === categoryId && block.completed === true) {
      completedCount++
    }
  }
  
  return { 
    completed: completedCount > 0, 
    count: completedCount 
  }
}

/**
 * Get weekly completion data for an auto-habit
 */
export function getWeeklyCompletions(
  commits: DayCommit[],
  habit: AutoHabit,
  weekStart: Date
): Array<{ date: string; completed: boolean; count: number }> {
  const results: Array<{ date: string; completed: boolean; count: number }> = []
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(weekStart)
    date.setDate(date.getDate() + i)
    const dateStr = getDateStrLocal(date)
    
    const completion = getCompletionForDate(
      commits,
      habit.identity,
      habit.categoryId,
      dateStr
    )
    
    results.push({
      date: dateStr,
      completed: completion.completed,
      count: completion.count
    })
  }
  
  return results
}
