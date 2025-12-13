/**
 * AI Context Builder
 * Gathers relevant app data to provide context-aware AI conversations
 */

import type { DayCommit, TimeBlock } from "./schedule-store"
import type { JournalEntry, Mood } from "./journal-store"

export interface UserProfile {
  northStar?: string // Identity vision
  lifestyle: string[]
  preferences: string[]
}

export interface AIContext {
  today?: {
    date: string
    schedule?: DayCommit
    currentTime?: string // HH:MM format
    completedBlocks?: number
    totalBlocks?: number
  }
  recentJournals?: JournalEntry[] // Last 7 days
  moodTrend?: {
    mostCommon: Mood | null
    recentMoods: Mood[]
  }
  schedulePattern?: {
    adherence: number // 0-100
    topIdentities: string[]
    missedBlocks: number
  }
  userProfile?: UserProfile
}

/**
 * Build context from current app state
 */
export function buildAIContext(params: {
  todayCommit?: DayCommit | null
  commits?: DayCommit[]
  journalEntries?: JournalEntry[]
  userGoals?: {
    northStar?: string
    lifestyle: string[]
    preferences: string[]
    otherLifestyle?: string
    otherPreferences?: string
  }
}): AIContext {
  const { todayCommit, commits = [], journalEntries = [], userGoals } = params

  const today = new Date()
  const todayDate = today.toISOString().split("T")[0]
  const currentTime = `${String(today.getHours()).padStart(2, "0")}:${String(today.getMinutes()).padStart(2, "0")}`

  // Recent journals (last 7 days)
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const recentJournals = journalEntries
    .filter((e) => new Date(e.created_at) >= sevenDaysAgo)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 10)

  // Mood trends
  const recentMoods = recentJournals
    .map((e) => e.mood)
    .filter((m): m is Mood => m !== undefined)

  const moodCounts = recentMoods.reduce<Record<Mood, number>>(
    (acc, mood) => {
      acc[mood] = (acc[mood] || 0) + 1
      return acc
    },
    {} as Record<Mood, number>
  )

  const mostCommonMood = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0]?.[0] as Mood | undefined

  // Schedule patterns (last 7 days)
  const recentCommits = commits.filter((c) => {
    const commitDate = new Date(c.date)
    return commitDate >= sevenDaysAgo
  })

  const allBlocks = recentCommits.flatMap((c) => c.blocks)
  const completedBlocks = allBlocks.filter((b) => b.completed === true).length
  const totalBlocks = allBlocks.length
  const missedBlocks = allBlocks.filter((b) => b.completed === false).length
  const adherence = totalBlocks > 0 ? Math.round((completedBlocks / totalBlocks) * 100) : 0

  // Top identities
  const identityCounts = allBlocks.reduce<Record<string, number>>((acc, b) => {
    acc[b.identity] = (acc[b.identity] || 0) + 1
    return acc
  }, {})
  const topIdentities = Object.entries(identityCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([identity]) => identity)

  // Today's schedule stats
  const todayBlocks = todayCommit?.blocks || []
  const todayCompleted = todayBlocks.filter((b) => b.completed === true).length
  const todayTotal = todayBlocks.length

  // User profile from goals
  const userProfile: UserProfile | undefined = userGoals ? {
    northStar: userGoals.northStar,
    lifestyle: userGoals.lifestyle || [],
    preferences: userGoals.preferences || [],
  } : undefined

  return {
    today: {
      date: todayDate,
      schedule: todayCommit || undefined,
      currentTime,
      completedBlocks: todayCompleted,
      totalBlocks: todayTotal,
    },
    recentJournals: recentJournals.slice(0, 7),
    moodTrend: {
      mostCommon: mostCommonMood || null,
      recentMoods: recentMoods.slice(0, 5),
    },
    schedulePattern: {
      adherence,
      topIdentities,
      missedBlocks,
    },
    userProfile,
  }
}

/**
 * Helper function to calculate time difference in minutes
 */
function timeDifferenceInMinutes(startTime: string, endTime: string): number {
  const [startHour, startMin] = startTime.split(":").map(Number)
  const [endHour, endMin] = endTime.split(":").map(Number)
  const startMinutes = startHour * 60 + startMin
  const endMinutes = endHour * 60 + endMin
  return endMinutes - startMinutes
}

/**
 * Helper function to format time difference
 */
function formatTimeDifference(minutes: number): string {
  if (minutes < 0) return "in the past"
  if (minutes === 0) return "now"
  if (minutes < 60) return `${minutes} minute${minutes !== 1 ? "s" : ""}`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (mins === 0) return `${hours} hour${hours !== 1 ? "s" : ""}`
  return `${hours} hour${hours !== 1 ? "s" : ""} and ${mins} minute${mins !== 1 ? "s" : ""}`
}

/**
 * Format context for AI system prompt
 */
export function formatContextForAI(context: AIContext): string {
  const parts: string[] = []

  // User's north star / identity vision (most important, put first)
  if (context.userProfile?.northStar) {
    parts.push(`USER'S NORTH STAR / IDENTITY VISION:`)
    parts.push(context.userProfile.northStar)
    parts.push("") // Empty line for spacing
  }

  // User profile (lifestyle and preferences)
  if (context.userProfile) {
    const profileParts: string[] = []
    if (context.userProfile.lifestyle.length > 0) {
      profileParts.push(`- Lifestyle: ${context.userProfile.lifestyle.join(", ")}`)
    }
    if (context.userProfile.preferences.length > 0) {
      profileParts.push(`- Preferences: ${context.userProfile.preferences.join(", ")}`)
    }
    if (profileParts.length > 0) {
      parts.push(`USER PROFILE:`)
      parts.push(...profileParts)
      parts.push("") // Empty line for spacing
    }
  }

  // Today's schedule
  if (context.today?.schedule && context.today.totalBlocks > 0) {
    parts.push(`\nTODAY'S SCHEDULE (${context.today.date}):`)
    parts.push(`- Total blocks: ${context.today.totalBlocks}`)
    parts.push(`- Completed: ${context.today.completedBlocks || 0}`)
    if (context.today.currentTime) {
      parts.push(`- Current time: ${context.today.currentTime}`)
    }
    
    const blocks = context.today.schedule.blocks
    const currentTime = context.today.currentTime || ""
    const upcomingBlocks = blocks.filter((b) => b.start > currentTime).sort((a, b) => a.start.localeCompare(b.start))
    const pastBlocks = blocks.filter((b) => b.end <= currentTime)
    const currentBlocks = blocks.filter((b) => b.start <= currentTime && b.end > currentTime)
    
    if (currentBlocks.length > 0) {
      parts.push(`\nCurrent blocks (happening now):`)
      currentBlocks.forEach((b) => {
        const timeUntilEnd = timeDifferenceInMinutes(currentTime, b.end)
        parts.push(`  - ${b.identity}: started at ${b.start}, ends at ${b.end}, ends in ${formatTimeDifference(timeUntilEnd)}`)
      })
    }
    
    if (upcomingBlocks.length > 0) {
      parts.push(`\nUpcoming blocks today:`)
      upcomingBlocks.slice(0, 5).forEach((b) => {
        const timeUntilStart = timeDifferenceInMinutes(currentTime, b.start)
        const duration = timeDifferenceInMinutes(b.start, b.end)
        parts.push(`  - ${b.identity}: starts at ${b.start}, ends at ${b.end} (duration: ${formatTimeDifference(duration)}), starts in ${formatTimeDifference(timeUntilStart)}`)
      })
    }
    
    if (pastBlocks.length > 0) {
      parts.push(`\nPast blocks today:`)
      pastBlocks.slice(0, 5).forEach((b) => {
        const status = b.completed === true ? "✓" : b.completed === false ? "✗" : "?"
        parts.push(`  ${status} ${b.identity} (${b.start}-${b.end})`)
      })
    }
  }

  // Schedule patterns
  if (context.schedulePattern) {
    const { adherence, topIdentities, missedBlocks } = context.schedulePattern
    parts.push(`\nRECENT SCHEDULE PATTERNS (last 7 days):`)
    parts.push(`- Adherence: ${adherence}%`)
    if (missedBlocks > 0) {
      parts.push(`- Missed blocks: ${missedBlocks}`)
    }
    if (topIdentities.length > 0) {
      parts.push(`- Most common activities: ${topIdentities.slice(0, 3).join(", ")}`)
    }
  }

  // Mood trends
  if (context.moodTrend && context.moodTrend.recentMoods.length > 0) {
    parts.push(`\nRECENT MOOD TRENDS:`)
    if (context.moodTrend.mostCommon) {
      parts.push(`- Most common mood: ${context.moodTrend.mostCommon}`)
    }
    parts.push(`- Recent moods: ${context.moodTrend.recentMoods.slice(0, 5).join(" ")}`)
  }

  // Recent journal themes
  if (context.recentJournals && context.recentJournals.length > 0) {
    const recentTags = context.recentJournals.flatMap((e) => e.tags)
    const tagCounts = recentTags.reduce<Record<string, number>>((acc, tag) => {
      acc[tag] = (acc[tag] || 0) + 1
      return acc
    }, {})
    const topTags = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([tag]) => tag)
    
    if (topTags.length > 0) {
      parts.push(`\nRECENT JOURNAL THEMES:`)
      parts.push(`- Common topics: ${topTags.join(", ")}`)
    }
  }

  return parts.length > 0 ? parts.join("\n") : ""
}

