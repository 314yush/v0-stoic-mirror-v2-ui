import { useMemo } from "react"
import { useScheduleStore, type DayCommit, type TimeBlock } from "./schedule-store"
import { useSettingsStore } from "./settings-store"

export interface RoutineAnalysis {
  identity: string // Normalized activity name
  originalVariants: string[] // All variations seen (for display)
  frequency: number // Average times per week (commits)
  completionRate: number // % of commits completed (0-100)
  consistency: number // How many weeks it appeared (out of total weeks analyzed)
  weeks: string[] // Which weeks it appeared in
  totalOccurrences: number // Total times across all weeks
  totalCompletions: number // Total completed blocks
  northStarAlignment?: string[] // Which north star identities it serves
  status: "established" | "emerging" | "almost" | "fading" | "one-off"
  lastWeekFrequency: number // How many times last week
  lastWeekCompletions: number // How many completed last week
  promotionProgress?: {
    needed: number // How many more commits needed (for "Almost")
    message: string // Clear message for user
  }
}

export interface IdentityProgress {
  identity: string // Extracted from north star
  score: number // 0-100 based on activity frequency and consistency
  totalActions: number // Total activities serving this identity
  routines: RoutineAnalysis[] // Routines that serve this identity
  recentActivity: number // Actions in last 7 days
}

/**
 * Normalize identity names for fuzzy matching
 * Handles case variations, synonyms, and common variations
 * Uses user-declared routine names as canonical forms
 */
function normalizeIdentity(identity: string, userRoutineNames?: string[]): string {
  // 1. Lowercase and trim
  let normalized = identity.toLowerCase().trim()
  
  // 2. Remove extra spaces
  normalized = normalized.replace(/\s+/g, ' ')
  
  // 3. First, check against user-declared routine names (most authoritative)
  if (userRoutineNames && userRoutineNames.length > 0) {
    for (const declaredRoutine of userRoutineNames) {
      const declaredLower = declaredRoutine.toLowerCase().trim()
      
      // Exact match
      if (normalized === declaredLower) {
        return declaredRoutine // Return original casing from user
      }
      
      // Partial match (e.g., "Morning Routine" matches "morning routine" or "morning")
      if (normalized.includes(declaredLower) || declaredLower.includes(normalized)) {
        return declaredRoutine // Return original casing from user
      }
    }
  }
  
  // 4. Basic synonym mapping (common variations)
  const synonyms: Record<string, string> = {
    // Exercise variations
    'workout': 'exercise',
    'gym': 'exercise',
    'training': 'exercise',
    'fitness': 'exercise',
    'work out': 'exercise',
    
    // Routine variations
    'morning routine': 'morning routine',
    'morning workout': 'morning routine',
    'morning exercise': 'morning routine',
    
    // Work variations
    'deep work': 'deep work',
    'focused work': 'deep work',
    'work session': 'deep work',
    
    // Reading variations
    'reading': 'reading',
    'read': 'reading',
    'book reading': 'reading',
    
    // Writing variations
    'writing': 'writing',
    'write': 'writing',
    'journaling': 'writing',
    'journal': 'writing',
    
    // Study variations
    'study': 'study',
    'studying': 'study',
    'learning': 'study',
    'course': 'study',
  }
  
  // Check for exact synonym match
  if (synonyms[normalized]) {
    return synonyms[normalized]
  }
  
  // Check for partial matches (e.g., "morning workout" → "morning routine")
  for (const [key, value] of Object.entries(synonyms)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      // If one is a substring of the other, use the more specific one
      if (normalized.length > key.length) {
        return normalized // Keep the more specific
      }
      return value
    }
  }
  
  return normalized
}

/**
 * Group similar identities together
 * Returns a map: normalized identity → list of original variants
 */
function groupIdentities(identities: string[], userRoutineNames?: string[]): Map<string, string[]> {
  const groups = new Map<string, string[]>()
  
  identities.forEach(identity => {
    const normalized = normalizeIdentity(identity, userRoutineNames)
    
    if (!groups.has(normalized)) {
      groups.set(normalized, [])
    }
    
    const variants = groups.get(normalized)!
    if (!variants.includes(identity)) {
      variants.push(identity)
    }
  })
  
  return groups
}

/**
 * Extract identities from north star text
 * Simple keyword extraction - can be enhanced with AI later
 */
function extractNorthStarIdentities(northStar?: string): string[] {
  if (!northStar) return []
  
  // Common patterns: "world-class athlete", "startup employee", "passionate reader"
  // Extract phrases after common patterns like "a person that's", "becoming", etc.
  const text = northStar.toLowerCase()
  
  // Extract key phrases (simple approach - can be improved)
  const identities: string[] = []
  
  // Look for patterns like "a [adjective] [noun]" or "[noun]"
  const commonPatterns = [
    /(?:a|an|the)\s+([a-z\s]+?)(?:,|and|or|that|who)/gi,
    /([a-z]+(?:\s+[a-z]+){0,2})(?:\s+employee|founder|athlete|reader|researcher|writer|learner)/gi
  ]
  
  // Also look for explicit mentions
  const keywords = [
    'athlete', 'employee', 'founder', 'reader', 'researcher', 'writer',
    'learner', 'parent', 'partner', 'friend', 'creator', 'developer',
    'designer', 'entrepreneur', 'student', 'teacher'
  ]
  
  keywords.forEach(keyword => {
    if (text.includes(keyword)) {
      identities.push(keyword)
    }
  })
  
  // If no keywords found, try to extract from structure
  if (identities.length === 0) {
    // Look for comma-separated lists
    const parts = text.split(',').map(p => p.trim())
    parts.forEach(part => {
      // Remove common intro phrases
      const cleaned = part
        .replace(/^(i want to become|becoming|i'm becoming|a person that's)\s*/i, '')
        .replace(/\s+(person|individual|someone)$/i, '')
        .trim()
      
      if (cleaned.length > 3 && cleaned.length < 50) {
        identities.push(cleaned)
      }
    })
  }
  
  return [...new Set(identities)] // Remove duplicates
}

/**
 * Check if an activity (identity) aligns with north star identities
 */
function checkNorthStarAlignment(
  activityIdentity: string,
  northStarIdentities: string[]
): string[] {
  if (northStarIdentities.length === 0) return []
  
  const activity = activityIdentity.toLowerCase()
  const aligned: string[] = []
  
  northStarIdentities.forEach(northStarIdentity => {
    const identity = northStarIdentity.toLowerCase()
    
    // Check if activity contains identity keywords
    if (activity.includes(identity) || identity.includes(activity)) {
      aligned.push(northStarIdentity)
    }
    
    // Also check for semantic matches (e.g., "exercise" matches "athlete")
    const semanticMatches: Record<string, string[]> = {
      'athlete': ['exercise', 'workout', 'training', 'gym', 'running', 'fitness'],
      'reader': ['reading', 'books', 'study'],
      'writer': ['writing', 'journal', 'blog'],
      'learner': ['study', 'learning', 'course', 'education'],
      'employee': ['work', 'deep work', 'meeting'],
      'founder': ['work', 'startup', 'business'],
    }
    
    Object.entries(semanticMatches).forEach(([key, matches]) => {
      if (identity.includes(key) && matches.some(m => activity.includes(m))) {
        aligned.push(northStarIdentity)
      }
    })
  })
  
  return [...new Set(aligned)]
}

/**
 * Analyze schedule commits to detect routines
 * Now includes completion tracking and fuzzy identity matching
 */
export function analyzeRoutines(
  commits: DayCommit[],
  weeksToAnalyze: number = 4,
  userRoutineNames?: string[]
): RoutineAnalysis[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  // Group commits by week
  const weeks: Map<string, DayCommit[]> = new Map()
  
  commits.forEach(commit => {
    if (!commit.committed) return
    
    // ANTI-GAMING: Only count finalized commits OR commits where blocks have passed
    // This prevents users from uncommitting after blocks pass to avoid incomplete stats
    // If a commit is finalized, it's locked and must be counted
    // If not finalized, we still check if blocks have passed (as before)
    
    const date = new Date(commit.date)
    const weekStart = new Date(date)
    const dayOfWeek = date.getDay()
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
    weekStart.setDate(date.getDate() - daysToMonday)
    weekStart.setHours(0, 0, 0, 0)
    
    const weekKey = weekStart.toISOString().split('T')[0]
    
    if (!weeks.has(weekKey)) {
      weeks.set(weekKey, [])
    }
    weeks.get(weekKey)!.push(commit)
  })
  
  // Get recent weeks only
  const weekKeys = Array.from(weeks.keys())
    .sort()
    .slice(-weeksToAnalyze)
  
  // Collect all unique identities (before normalization)
  const allIdentities = new Set<string>()
  commits.forEach(commit => {
    if (!commit.committed) return
    commit.blocks.forEach(block => {
      allIdentities.add(block.identity)
    })
  })
  
  // Group identities by normalized name (using user-declared names)
  const identityGroups = groupIdentities(Array.from(allIdentities), userRoutineNames)
  
  // Track stats per normalized identity
  const identityStats = new Map<string, {
    occurrences: Map<string, number> // week -> commit count (blocks that have passed)
    completions: Map<string, number> // week -> completion count
    totalOccurrences: number // Total blocks that have passed their end time
    totalCompletions: number
    originalVariants: string[]
  }>()
  
  weekKeys.forEach(weekKey => {
    const weekCommits = weeks.get(weekKey) || []
    
    weekCommits.forEach(commit => {
      const commitDate = new Date(commit.date)
      commitDate.setHours(0, 0, 0, 0)
      const isToday = commitDate.getTime() === today.getTime()
      
      commit.blocks.forEach(block => {
        const normalized = normalizeIdentity(block.identity, userRoutineNames)
        
        if (!identityStats.has(normalized)) {
          identityStats.set(normalized, {
            occurrences: new Map(),
            completions: new Map(),
            totalOccurrences: 0,
            totalCompletions: 0,
            originalVariants: []
          })
        }
        
        const stats = identityStats.get(normalized)!
        
        // Track variants
        if (!stats.originalVariants.includes(block.identity)) {
          stats.originalVariants.push(block.identity)
        }
        
        // ANTI-GAMING PROTECTION:
        // 1. If commit is finalized, always count it (cannot be uncommitted)
        // 2. If not finalized, only count blocks AFTER their end time has passed
        // This prevents users from uncommitting after blocks pass to avoid incomplete stats
        const [endHour, endMin] = block.end.split(":").map(Number)
        const blockEndTime = new Date()
        blockEndTime.setHours(endHour, endMin, 0, 0)
        blockEndTime.setSeconds(0, 0)
        
        const now = new Date()
        const isPastDate = commitDate.getTime() < today.getTime()
        const isPastBlockTime = isToday ? (now.getTime() >= blockEndTime.getTime()) : true
        
        // Count block if:
        // - Commit is finalized (locked, cannot be uncommitted) OR
        // - Block end time has passed (normal case)
        const shouldCount = commit.finalized_at || isPastDate || (isToday && isPastBlockTime)
        
        if (shouldCount) {
          // Count this block occurrence
          const currentCommits = stats.occurrences.get(weekKey) || 0
          stats.occurrences.set(weekKey, currentCommits + 1)
          stats.totalOccurrences++
          
          // Count completions (only for blocks past their end time)
          if (block.completed === true) {
            const currentCompletions = stats.completions.get(weekKey) || 0
            stats.completions.set(weekKey, currentCompletions + 1)
            stats.totalCompletions++
          }
        }
        // If it's today and block hasn't passed yet, don't count it in stats (it's still pending)
      })
    })
  })
  
  // Calculate routine status with simplified logic
  const routines: RoutineAnalysis[] = []
  
  identityStats.forEach((stats, normalizedIdentity) => {
    const weeksAppeared = Array.from(stats.occurrences.values())
    const consistency = stats.occurrences.size
    const avgFrequency = weeksAppeared.reduce((a, b) => a + b, 0) / weekKeys.length
    const lastWeekFrequency = stats.occurrences.get(weekKeys[weekKeys.length - 1]) || 0
    
    // Calculate completion rates
    const completionRate = stats.totalOccurrences > 0
      ? Math.round((stats.totalCompletions / stats.totalOccurrences) * 100)
      : 0
    
    const lastWeekCompletions = stats.completions.get(weekKeys[weekKeys.length - 1]) || 0
    const lastWeekCompletionRate = lastWeekFrequency > 0
      ? Math.round((lastWeekCompletions / lastWeekFrequency) * 100)
      : 0
    
    // Determine status with simplified logic
    let status: RoutineAnalysis['status'] = 'one-off'
    let promotionProgress: RoutineAnalysis['promotionProgress'] | undefined
    
    // Established: 3+ times/week average, 2+ weeks, 70%+ completion, maintaining last week
    if (consistency >= 2 && avgFrequency >= 3 && completionRate >= 70) {
      if (lastWeekFrequency >= 3) {
        status = 'established'
      } else {
        status = 'fading'
      }
    }
    // Emerging: 3+ times this week, first week, 50%+ completion
    else if (lastWeekFrequency >= 3 && consistency === 1 && lastWeekCompletionRate >= 50) {
      status = 'emerging'
    }
    // Almost: 2 times this week (most common case)
    else if (lastWeekFrequency === 2) {
      status = 'almost'
      promotionProgress = {
        needed: 1,
        message: `Commit 1 more time this week to make it a routine`
      }
    }
    // Almost: 3+ times but low completion (needs better completion)
    else if (lastWeekFrequency >= 3 && lastWeekCompletionRate < 50 && consistency === 1) {
      status = 'almost'
      const targetCompletions = Math.ceil(lastWeekFrequency * 0.7)
      const needed = Math.max(1, targetCompletions - lastWeekCompletions)
      promotionProgress = {
        needed,
        message: `Complete ${needed} more time${needed > 1 ? 's' : ''} to reach 70% completion`
      }
    }
    // Fading: Was established (2+ weeks, 3+ avg), but last week declined
    else if (consistency >= 2 && avgFrequency >= 3 && lastWeekFrequency < 3) {
      status = 'fading'
    }
    
    // Use normalized name (which may be a user-declared routine) as display name
    // Or use first variant if no clear canonical form
    const displayName = normalizedIdentity
    
    routines.push({
      identity: displayName,
      originalVariants: stats.originalVariants,
      frequency: Math.round(avgFrequency * 10) / 10,
      completionRate,
      consistency,
      weeks: weekKeys.filter(wk => stats.occurrences.has(wk)),
      totalOccurrences: stats.totalOccurrences,
      totalCompletions: stats.totalCompletions,
      lastWeekFrequency,
      lastWeekCompletions,
      promotionProgress,
      status
    })
  })
  
  return routines.sort((a, b) => {
    // Sort by: status priority, then total occurrences
    const statusPriority: Record<string, number> = {
      'established': 5,
      'emerging': 4,
      'almost': 3,
      'fading': 2,
      'one-off': 1
    }
    const aPriority = statusPriority[a.status] || 0
    const bPriority = statusPriority[b.status] || 0
    if (aPriority !== bPriority) return bPriority - aPriority
    return b.totalOccurrences - a.totalOccurrences
  })
}

/**
 * Calculate identity progress based on routines and activities
 */
export function calculateIdentityProgress(
  routines: RoutineAnalysis[],
  northStarIdentities: string[],
  commits: DayCommit[]
): IdentityProgress[] {
  if (northStarIdentities.length === 0) return []
  
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const sevenDaysAgo = new Date(today)
  sevenDaysAgo.setDate(today.getDate() - 7)
  
  return northStarIdentities.map(identity => {
    // Find routines that align with this identity
    const alignedRoutines = routines
      .filter(r => {
        const alignment = checkNorthStarAlignment(r.identity, [identity])
        r.northStarAlignment = alignment
        return alignment.includes(identity)
      })
    
    // Count total actions serving this identity
    let totalActions = 0
    let recentActivity = 0
    
    commits.forEach(commit => {
      if (!commit.committed) return
      
      const commitDate = new Date(commit.date)
      commitDate.setHours(0, 0, 0, 0)
      
      commit.blocks.forEach(block => {
        const alignment = checkNorthStarAlignment(block.identity, [identity])
        if (alignment.includes(identity)) {
          totalActions++
          if (commitDate >= sevenDaysAgo) {
            recentActivity++
          }
        }
      })
    })
    
    // Calculate score (0-100)
    // Based on: frequency of aligned routines + consistency + recent activity
    const routineScore = alignedRoutines.reduce((sum, r) => {
      return sum + (r.frequency * r.consistency)
    }, 0)
    
    const maxPossibleScore = 20 // Arbitrary max for normalization
    const score = Math.min(100, Math.round((routineScore / maxPossibleScore) * 100))
    
    return {
      identity,
      score: Math.max(score, Math.min(100, recentActivity * 10)), // At least show recent activity
      totalActions,
      routines: alignedRoutines,
      recentActivity
    }
  })
}

/**
 * Hook to get routine analysis and identity progress
 */
export function useRoutineAnalysis() {
  const { commits } = useScheduleStore()
  const { settings } = useSettingsStore()
  
  const routines = useMemo(() => {
    return analyzeRoutines(commits, 4, settings.userGoals?.routineNames) // Analyze last 4 weeks with user-declared routine names
  }, [commits, settings.userGoals?.routineNames])
  
  const northStarIdentities = useMemo(() => {
    return extractNorthStarIdentities(settings.userGoals?.northStar)
  }, [settings.userGoals?.northStar])
  
  // Add north star alignment to routines
  const alignedRoutines = useMemo(() => {
    return routines.map(routine => ({
      ...routine,
      northStarAlignment: checkNorthStarAlignment(routine.identity, northStarIdentities)
    }))
  }, [routines, northStarIdentities])
  
  const identityProgress = useMemo(() => {
    return calculateIdentityProgress(alignedRoutines, northStarIdentities, commits)
  }, [alignedRoutines, northStarIdentities, commits])
  
  return {
    routines: alignedRoutines,
    identityProgress,
    northStarIdentities
  }
}

