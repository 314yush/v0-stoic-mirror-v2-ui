/**
 * Analytics Sync Service
 * Syncs computed analytics to Supabase backend
 * 
 * This is the "Fitbit sync" - pushing locally computed stats to cloud
 */

import { supabase, isSupabaseConfigured } from "./supabase"
import type { DayCommit, TimeBlock } from "./schedule-store"
import { analyzeHabitPatterns, type HabitPattern } from "./habit-pattern-analyzer"
import { useRoutineAnalysis, type RoutineAnalysis } from "./routine-analysis"

// ============================================
// Types
// ============================================

export interface IdentityAnalytics {
  identity: string
  total_occurrences: number
  total_completed: number
  total_minutes: number
  weekly_occurrences: number
  weekly_completed: number
  weekly_minutes: number
  current_streak: number
  longest_streak: number
  last_completed_date: string | null
  avg_start_time: string | null
  avg_duration_minutes: number | null
  preferred_days: number[]
  habit_strength: number
  serves_identity: string[]
  first_seen: string
  last_seen: string
}

export interface DailySnapshot {
  date: string
  total_blocks: number
  completed_blocks: number
  adherence_rate: number
  total_planned_minutes: number
  total_completed_minutes: number
  identity_breakdown: Record<string, { planned: number; completed: number }>
  external_events_count: number
  meeting_minutes: number
  mood: string | null
  committed: boolean
  committed_at: string | null
}

export interface WeeklySummary {
  week_start: string
  total_blocks: number
  completed_blocks: number
  avg_daily_adherence: number
  total_planned_minutes: number
  total_completed_minutes: number
  top_identities: { identity: string; count: number; minutes: number }[]
  adherence_change: number
  consistency_score: number
  ai_insights: { summary?: string; suggestions?: string[]; wins?: string[] } | null
}

// ============================================
// Utility Functions
// ============================================

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
}

function getWeekStart(date: Date): string {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Monday
  d.setDate(diff)
  return d.toISOString().split('T')[0]
}

function computeHabitStrength(
  totalOccurrences: number,
  currentStreak: number,
  lastCompleted: string | null
): number {
  let recencyScore = 0
  let consistencyScore = 0
  let frequencyScore = 0

  // Recency score (max 40 points)
  if (lastCompleted) {
    const daysSince = Math.floor((Date.now() - new Date(lastCompleted).getTime()) / (1000 * 60 * 60 * 24))
    if (daysSince <= 1) recencyScore = 40
    else if (daysSince <= 3) recencyScore = 30
    else if (daysSince <= 7) recencyScore = 20
    else if (daysSince <= 14) recencyScore = 10
  }

  // Streak score (max 30 points)
  consistencyScore = Math.min(30, currentStreak * 5)

  // Frequency score (max 30 points)
  frequencyScore = Math.min(30, totalOccurrences * 2)

  return recencyScore + consistencyScore + frequencyScore
}

// ============================================
// Analytics Computation
// ============================================

/**
 * Compute identity analytics from commits
 */
export function computeIdentityAnalytics(
  commits: DayCommit[],
  northStarIdentities: string[] = []
): IdentityAnalytics[] {
  const analyticsMap = new Map<string, {
    occurrences: number
    completed: number
    minutes: number
    completedMinutes: number
    startTimes: number[]
    durations: number[]
    days: number[]
    dates: string[]
    completedDates: string[]
  }>()

  // Process all commits
  for (const commit of commits) {
    if (!commit.blocks || commit.blocks.length === 0) continue
    
    const dayOfWeek = new Date(commit.date).getDay()
    
    for (const block of commit.blocks) {
      const key = block.identity.toLowerCase().trim()
      
      if (!analyticsMap.has(key)) {
        analyticsMap.set(key, {
          occurrences: 0,
          completed: 0,
          minutes: 0,
          completedMinutes: 0,
          startTimes: [],
          durations: [],
          days: [],
          dates: [],
          completedDates: [],
        })
      }
      
      const data = analyticsMap.get(key)!
      const duration = timeToMinutes(block.end) - timeToMinutes(block.start)
      
      data.occurrences++
      data.minutes += duration
      data.startTimes.push(timeToMinutes(block.start))
      data.durations.push(duration)
      data.days.push(dayOfWeek)
      data.dates.push(commit.date)
      
      if (block.completed === true) {
        data.completed++
        data.completedMinutes += duration
        data.completedDates.push(commit.date)
      }
    }
  }

  // Calculate weekly stats
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0]

  const analytics: IdentityAnalytics[] = []

  for (const [identity, data] of analyticsMap) {
    // Weekly stats
    const weeklyDates = data.dates.filter(d => d >= sevenDaysAgoStr)
    const weeklyCompletedDates = data.completedDates.filter(d => d >= sevenDaysAgoStr)
    
    // Calculate averages
    const avgStartTime = data.startTimes.length > 0
      ? minutesToTime(Math.round(data.startTimes.reduce((a, b) => a + b, 0) / data.startTimes.length))
      : null
    const avgDuration = data.durations.length > 0
      ? Math.round(data.durations.reduce((a, b) => a + b, 0) / data.durations.length)
      : null

    // Calculate preferred days
    const dayFreq = [0, 0, 0, 0, 0, 0, 0]
    data.days.forEach(d => dayFreq[d]++)
    const maxDayFreq = Math.max(...dayFreq)
    const preferredDays = dayFreq
      .map((freq, idx) => freq >= maxDayFreq * 0.5 ? idx : -1)
      .filter(d => d >= 0)

    // Calculate streak
    const sortedDates = [...data.completedDates].sort().reverse()
    let currentStreak = 0
    let longestStreak = 0
    let tempStreak = 0
    let lastDate: Date | null = null

    for (const dateStr of sortedDates) {
      const date = new Date(dateStr)
      if (lastDate === null) {
        tempStreak = 1
        // Check if streak is current (within last 2 days)
        const daysSince = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24))
        if (daysSince <= 1) currentStreak = 1
      } else {
        const diff = Math.floor((lastDate.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
        if (diff === 1) {
          tempStreak++
          if (currentStreak > 0) currentStreak++
        } else {
          longestStreak = Math.max(longestStreak, tempStreak)
          tempStreak = 1
          if (currentStreak > 0) currentStreak = 0 // Streak broken
        }
      }
      lastDate = date
    }
    longestStreak = Math.max(longestStreak, tempStreak)

    // Compute habit strength
    const lastCompleted = sortedDates[0] || null
    const habitStrength = computeHabitStrength(data.occurrences, currentStreak, lastCompleted)

    // Format identity name
    const formattedIdentity = identity
      .split(' ')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')

    analytics.push({
      identity: formattedIdentity,
      total_occurrences: data.occurrences,
      total_completed: data.completed,
      total_minutes: data.minutes,
      weekly_occurrences: weeklyDates.length,
      weekly_completed: weeklyCompletedDates.length,
      weekly_minutes: 0, // Would need more complex calculation
      current_streak: currentStreak,
      longest_streak: longestStreak,
      last_completed_date: lastCompleted,
      avg_start_time: avgStartTime,
      avg_duration_minutes: avgDuration,
      preferred_days: preferredDays,
      habit_strength: habitStrength,
      serves_identity: [], // TODO: Link to north star
      first_seen: data.dates[data.dates.length - 1] || '',
      last_seen: data.dates[0] || '',
    })
  }

  // Sort by habit strength
  analytics.sort((a, b) => b.habit_strength - a.habit_strength)

  return analytics
}

/**
 * Compute daily snapshot for a specific date
 */
export function computeDailySnapshot(
  commit: DayCommit | null,
  calendarEventsCount: number = 0,
  meetingMinutes: number = 0,
  mood: string | null = null
): DailySnapshot | null {
  if (!commit || !commit.blocks || commit.blocks.length === 0) {
    return null
  }

  const totalBlocks = commit.blocks.length
  const completedBlocks = commit.blocks.filter(b => b.completed === true).length
  const adherenceRate = totalBlocks > 0 ? (completedBlocks / totalBlocks) * 100 : 0

  // Calculate time stats
  let totalPlannedMinutes = 0
  let totalCompletedMinutes = 0
  const identityBreakdown: Record<string, { planned: number; completed: number }> = {}

  for (const block of commit.blocks) {
    const duration = timeToMinutes(block.end) - timeToMinutes(block.start)
    totalPlannedMinutes += duration

    const key = block.identity
    if (!identityBreakdown[key]) {
      identityBreakdown[key] = { planned: 0, completed: 0 }
    }
    identityBreakdown[key].planned += duration

    if (block.completed === true) {
      totalCompletedMinutes += duration
      identityBreakdown[key].completed += duration
    }
  }

  return {
    date: commit.date,
    total_blocks: totalBlocks,
    completed_blocks: completedBlocks,
    adherence_rate: Math.round(adherenceRate * 100) / 100,
    total_planned_minutes: totalPlannedMinutes,
    total_completed_minutes: totalCompletedMinutes,
    identity_breakdown: identityBreakdown,
    external_events_count: calendarEventsCount,
    meeting_minutes: meetingMinutes,
    mood,
    committed: commit.committed,
    committed_at: commit.committed_at || null,
  }
}

/**
 * Compute weekly summary
 */
export function computeWeeklySummary(
  commits: DayCommit[],
  weekStart: string,
  previousWeekAdherence?: number
): WeeklySummary {
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 7)
  const weekEndStr = weekEnd.toISOString().split('T')[0]

  // Filter commits for this week
  const weekCommits = commits.filter(c => 
    c.date >= weekStart && c.date < weekEndStr
  )

  // Calculate totals
  let totalBlocks = 0
  let completedBlocks = 0
  let totalPlannedMinutes = 0
  let totalCompletedMinutes = 0
  const dailyAdherences: number[] = []
  const identityStats = new Map<string, { count: number; minutes: number }>()

  for (const commit of weekCommits) {
    if (!commit.blocks || commit.blocks.length === 0) continue

    const dayBlocks = commit.blocks.length
    const dayCompleted = commit.blocks.filter(b => b.completed === true).length
    
    totalBlocks += dayBlocks
    completedBlocks += dayCompleted
    
    if (dayBlocks > 0) {
      dailyAdherences.push((dayCompleted / dayBlocks) * 100)
    }

    for (const block of commit.blocks) {
      const duration = timeToMinutes(block.end) - timeToMinutes(block.start)
      totalPlannedMinutes += duration
      
      if (block.completed === true) {
        totalCompletedMinutes += duration
      }

      const key = block.identity
      if (!identityStats.has(key)) {
        identityStats.set(key, { count: 0, minutes: 0 })
      }
      const stats = identityStats.get(key)!
      stats.count++
      stats.minutes += duration
    }
  }

  // Calculate averages
  const avgDailyAdherence = dailyAdherences.length > 0
    ? dailyAdherences.reduce((a, b) => a + b, 0) / dailyAdherences.length
    : 0

  // Calculate consistency score (inverse of variance)
  let consistencyScore = 100
  if (dailyAdherences.length > 1) {
    const mean = avgDailyAdherence
    const variance = dailyAdherences.reduce((sum, val) => 
      sum + Math.pow(val - mean, 2), 0) / dailyAdherences.length
    const stdDev = Math.sqrt(variance)
    consistencyScore = Math.max(0, Math.round(100 - stdDev))
  }

  // Top identities
  const topIdentities = Array.from(identityStats.entries())
    .map(([identity, stats]) => ({ identity, ...stats }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  // Adherence change
  const adherenceChange = previousWeekAdherence !== undefined
    ? avgDailyAdherence - previousWeekAdherence
    : 0

  return {
    week_start: weekStart,
    total_blocks: totalBlocks,
    completed_blocks: completedBlocks,
    avg_daily_adherence: Math.round(avgDailyAdherence * 100) / 100,
    total_planned_minutes: totalPlannedMinutes,
    total_completed_minutes: totalCompletedMinutes,
    top_identities: topIdentities,
    adherence_change: Math.round(adherenceChange * 100) / 100,
    consistency_score: consistencyScore,
    ai_insights: null, // AI generates this separately
  }
}

// ============================================
// Supabase Sync Functions
// ============================================

/**
 * Sync identity analytics to Supabase
 */
export async function syncIdentityAnalytics(
  userId: string,
  analytics: IdentityAnalytics[]
): Promise<void> {
  if (!isSupabaseConfigured()) {
    console.log('Supabase not configured, skipping analytics sync')
    return
  }

  for (const item of analytics) {
    const { error } = await supabase
      .from('identity_analytics')
      .upsert({
        user_id: userId,
        identity: item.identity,
        total_occurrences: item.total_occurrences,
        total_completed: item.total_completed,
        total_minutes: item.total_minutes,
        weekly_occurrences: item.weekly_occurrences,
        weekly_completed: item.weekly_completed,
        weekly_minutes: item.weekly_minutes,
        current_streak: item.current_streak,
        longest_streak: item.longest_streak,
        last_completed_date: item.last_completed_date,
        avg_start_time: item.avg_start_time,
        avg_duration_minutes: item.avg_duration_minutes,
        preferred_days: item.preferred_days,
        habit_strength: item.habit_strength,
        serves_identity: item.serves_identity,
        first_seen: item.first_seen,
        last_seen: item.last_seen,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,identity',
      })

    if (error) {
      console.error('Error syncing identity analytics:', error)
    }
  }
}

/**
 * Sync daily snapshot to Supabase
 */
export async function syncDailySnapshot(
  userId: string,
  snapshot: DailySnapshot
): Promise<void> {
  if (!isSupabaseConfigured()) {
    console.log('Supabase not configured, skipping daily snapshot sync')
    return
  }

  const { error } = await supabase
    .from('daily_snapshots')
    .upsert({
      user_id: userId,
      date: snapshot.date,
      total_blocks: snapshot.total_blocks,
      completed_blocks: snapshot.completed_blocks,
      adherence_rate: snapshot.adherence_rate,
      total_planned_minutes: snapshot.total_planned_minutes,
      total_completed_minutes: snapshot.total_completed_minutes,
      identity_breakdown: snapshot.identity_breakdown,
      external_events_count: snapshot.external_events_count,
      meeting_minutes: snapshot.meeting_minutes,
      mood: snapshot.mood,
      committed: snapshot.committed,
      committed_at: snapshot.committed_at,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id,date',
    })

  if (error) {
    console.error('Error syncing daily snapshot:', error)
  }
}

/**
 * Sync weekly summary to Supabase
 */
export async function syncWeeklySummary(
  userId: string,
  summary: WeeklySummary
): Promise<void> {
  if (!isSupabaseConfigured()) {
    console.log('Supabase not configured, skipping weekly summary sync')
    return
  }

  const { error } = await supabase
    .from('weekly_summaries')
    .upsert({
      user_id: userId,
      week_start: summary.week_start,
      total_blocks: summary.total_blocks,
      completed_blocks: summary.completed_blocks,
      avg_daily_adherence: summary.avg_daily_adherence,
      total_planned_minutes: summary.total_planned_minutes,
      total_completed_minutes: summary.total_completed_minutes,
      top_identities: summary.top_identities,
      adherence_change: summary.adherence_change,
      consistency_score: summary.consistency_score,
      ai_insights: summary.ai_insights,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id,week_start',
    })

  if (error) {
    console.error('Error syncing weekly summary:', error)
  }
}

/**
 * Sync habit patterns to Supabase
 */
export async function syncHabitPatterns(
  userId: string,
  patterns: HabitPattern[]
): Promise<void> {
  if (!isSupabaseConfigured()) {
    console.log('Supabase not configured, skipping habit patterns sync')
    return
  }

  for (const pattern of patterns) {
    const { error } = await supabase
      .from('habit_patterns')
      .upsert({
        user_id: userId,
        identity: pattern.identity,
        frequency: pattern.frequency,
        avg_start_time: pattern.avgStartTime,
        avg_duration_minutes: pattern.avgDuration,
        day_of_week_frequency: pattern.dayOfWeekFrequency,
        confidence: pattern.confidence,
        last_seen: pattern.lastSeen,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,identity',
      })

    if (error) {
      console.error('Error syncing habit pattern:', error)
    }
  }
}

// ============================================
// Main Sync Function
// ============================================

/**
 * Full analytics sync - call this after commits change
 */
export async function syncAllAnalytics(
  userId: string,
  commits: DayCommit[],
  calendarEventsCount: number = 0,
  mood: string | null = null
): Promise<void> {
  if (!isSupabaseConfigured()) {
    console.log('Supabase not configured, skipping all analytics sync')
    return
  }

  try {
    // 1. Sync identity analytics
    const identityAnalytics = computeIdentityAnalytics(commits)
    await syncIdentityAnalytics(userId, identityAnalytics)

    // 2. Sync today's daily snapshot
    const todayStr = new Date().toISOString().split('T')[0]
    const todayCommit = commits.find(c => c.date === todayStr)
    if (todayCommit) {
      const snapshot = computeDailySnapshot(todayCommit, calendarEventsCount, 0, mood)
      if (snapshot) {
        await syncDailySnapshot(userId, snapshot)
      }
    }

    // 3. Sync current week summary
    const weekStart = getWeekStart(new Date())
    const weeklySummary = computeWeeklySummary(commits, weekStart)
    await syncWeeklySummary(userId, weeklySummary)

    // 4. Sync habit patterns
    const patterns = analyzeHabitPatterns(commits)
    await syncHabitPatterns(userId, patterns)

    console.log('Analytics sync completed')
  } catch (error) {
    console.error('Error in analytics sync:', error)
  }
}

/**
 * Load analytics from Supabase (for fast app startup)
 */
export async function loadAnalyticsFromBackend(userId: string): Promise<{
  identityAnalytics: IdentityAnalytics[]
  habitPatterns: HabitPattern[]
} | null> {
  if (!isSupabaseConfigured()) {
    return null
  }

  try {
    const [analyticsResult, patternsResult] = await Promise.all([
      supabase
        .from('identity_analytics')
        .select('*')
        .eq('user_id', userId)
        .order('habit_strength', { ascending: false }),
      supabase
        .from('habit_patterns')
        .select('*')
        .eq('user_id', userId)
        .order('confidence', { ascending: false }),
    ])

    if (analyticsResult.error || patternsResult.error) {
      console.error('Error loading analytics:', analyticsResult.error || patternsResult.error)
      return null
    }

    return {
      identityAnalytics: analyticsResult.data || [],
      habitPatterns: (patternsResult.data || []).map(p => ({
        identity: p.identity,
        frequency: p.frequency,
        avgStartTime: p.avg_start_time,
        avgDuration: p.avg_duration_minutes,
        dayOfWeekFrequency: p.day_of_week_frequency,
        confidence: p.confidence,
        lastSeen: p.last_seen,
      })),
    }
  } catch (error) {
    console.error('Error loading analytics from backend:', error)
    return null
  }
}




