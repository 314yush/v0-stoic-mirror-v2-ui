/**
 * Habit Pattern Analyzer
 * Analyzes historical commits to detect user's recurring habits
 * and generate suggested "ghost blocks" for new days
 */

import type { TimeBlock, DayCommit } from './schedule-store'

export interface HabitPattern {
  identity: string
  frequency: number // How many times this habit appears
  avgStartTime: string // Average start time (HH:MM)
  avgDuration: number // Average duration in minutes
  dayOfWeekFrequency: number[] // [Sun, Mon, Tue, Wed, Thu, Fri, Sat] counts
  confidence: number // 0-1 confidence score
  lastSeen: string // Last date this habit was committed
}

export interface SuggestedBlock extends Omit<TimeBlock, 'id'> {
  id: string
  isGhost: true
  pattern: HabitPattern
  reason: string
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

function minutesToTime(minutes: number): string {
  // Clamp to valid range
  const clamped = Math.max(0, Math.min(minutes, 23 * 60 + 59))
  const hours = Math.floor(clamped / 60)
  const mins = Math.round(clamped % 60 / 5) * 5 // Round to 5 min
  return `${hours.toString().padStart(2, '0')}:${(mins % 60).toString().padStart(2, '0')}`
}

/**
 * Analyze commits to find habit patterns
 */
export function analyzeHabitPatterns(
  commits: DayCommit[],
  minOccurrences: number = 2
): HabitPattern[] {
  const patterns = new Map<string, {
    times: number[]
    durations: number[]
    dayOfWeek: number[]
    dates: string[]
  }>()

  // Collect data for each identity
  for (const commit of commits) {
    if (!commit.committed || !commit.blocks || commit.blocks.length === 0) continue
    
    const dayOfWeek = new Date(commit.date).getDay()
    
    for (const block of commit.blocks) {
      const key = block.identity.toLowerCase().trim()
      
      if (!patterns.has(key)) {
        patterns.set(key, { times: [], durations: [], dayOfWeek: [], dates: [] })
      }
      
      const data = patterns.get(key)!
      data.times.push(timeToMinutes(block.start))
      data.durations.push(timeToMinutes(block.end) - timeToMinutes(block.start))
      data.dayOfWeek.push(dayOfWeek)
      data.dates.push(commit.date)
    }
  }

  // Convert to patterns
  const habitPatterns: HabitPattern[] = []
  
  for (const [identity, data] of patterns) {
    if (data.times.length < minOccurrences) continue
    
    // Calculate averages
    const avgStartMinutes = data.times.reduce((a, b) => a + b, 0) / data.times.length
    const avgDuration = data.durations.reduce((a, b) => a + b, 0) / data.durations.length
    
    // Count day of week frequency
    const dayOfWeekFrequency = [0, 0, 0, 0, 0, 0, 0]
    for (const day of data.dayOfWeek) {
      dayOfWeekFrequency[day]++
    }
    
    // Calculate confidence based on consistency
    const timeVariance = data.times.reduce((sum, t) => sum + Math.pow(t - avgStartMinutes, 2), 0) / data.times.length
    const timeConsistency = Math.max(0, 1 - Math.sqrt(timeVariance) / 120) // High if times are similar
    
    const recency = data.dates.length > 0 
      ? Math.max(0, 1 - (Date.now() - new Date(data.dates[data.dates.length - 1]).getTime()) / (30 * 24 * 60 * 60 * 1000))
      : 0 // Decay over 30 days
    
    const frequency = Math.min(1, data.times.length / 10) // Max out at 10 occurrences
    
    const confidence = (timeConsistency * 0.4 + recency * 0.3 + frequency * 0.3)
    
    // Capitalize identity properly
    const formattedIdentity = identity
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
    
    habitPatterns.push({
      identity: formattedIdentity,
      frequency: data.times.length,
      avgStartTime: minutesToTime(avgStartMinutes),
      avgDuration: Math.round(avgDuration / 5) * 5, // Round to 5 min
      dayOfWeekFrequency,
      confidence,
      lastSeen: data.dates[data.dates.length - 1] || '',
    })
  }
  
  // Sort by confidence
  habitPatterns.sort((a, b) => b.confidence - a.confidence)
  
  return habitPatterns
}

/**
 * Generate suggested ghost blocks for a specific day
 */
export function generateGhostBlocks(
  patterns: HabitPattern[],
  targetDate: Date,
  existingBlocks: TimeBlock[] = [],
  calendarEvents: { start: string; end: string }[] = [],
  maxSuggestions: number = 5
): SuggestedBlock[] {
  const dayOfWeek = targetDate.getDay()
  const suggestions: SuggestedBlock[] = []
  
  // Filter patterns that are relevant for this day of week
  const relevantPatterns = patterns.filter(p => {
    // Check if this habit is commonly done on this day
    const totalForDay = p.dayOfWeekFrequency[dayOfWeek]
    const maxForAnyDay = Math.max(...p.dayOfWeekFrequency)
    
    // Include if this day has at least 30% of the max day's frequency
    return totalForDay > 0 && (totalForDay / maxForAnyDay) >= 0.3
  })
  
  // Sort by day-of-week relevance
  relevantPatterns.sort((a, b) => {
    const aRelevance = a.dayOfWeekFrequency[dayOfWeek] * a.confidence
    const bRelevance = b.dayOfWeekFrequency[dayOfWeek] * b.confidence
    return bRelevance - aRelevance
  })
  
  // Build list of busy times (existing blocks + calendar events)
  const busyTimes: { start: number; end: number }[] = [
    ...existingBlocks.map(b => ({ 
      start: timeToMinutes(b.start), 
      end: timeToMinutes(b.end) 
    })),
    ...calendarEvents.map(e => ({ 
      start: timeToMinutes(e.start), 
      end: timeToMinutes(e.end) 
    })),
  ]
  
  // Check if a time slot conflicts
  const hasConflict = (start: number, end: number): boolean => {
    return busyTimes.some(busy => 
      !(end <= busy.start || start >= busy.end)
    )
  }
  
  // Check if this identity already exists in existing blocks
  const identityExists = (identity: string): boolean => {
    return existingBlocks.some(b => 
      b.identity.toLowerCase() === identity.toLowerCase()
    )
  }
  
  for (const pattern of relevantPatterns) {
    if (suggestions.length >= maxSuggestions) break
    
    // Skip if this identity already has a block
    if (identityExists(pattern.identity)) continue
    
    const startMinutes = timeToMinutes(pattern.avgStartTime)
    const endMinutes = startMinutes + pattern.avgDuration
    
    // Try the preferred time first
    if (!hasConflict(startMinutes, endMinutes)) {
      suggestions.push({
        id: `ghost-${pattern.identity.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
        identity: pattern.identity,
        start: pattern.avgStartTime,
        end: minutesToTime(endMinutes),
        isGhost: true,
        pattern,
        reason: `You've done this ${pattern.frequency} times`,
      })
      busyTimes.push({ start: startMinutes, end: endMinutes })
      continue
    }
    
    // Try to find an alternative time slot
    // Search in 30-minute increments from 6am to 10pm
    let foundSlot = false
    for (let tryStart = 6 * 60; tryStart <= 22 * 60 - pattern.avgDuration; tryStart += 30) {
      const tryEnd = tryStart + pattern.avgDuration
      
      if (!hasConflict(tryStart, tryEnd)) {
        suggestions.push({
          id: `ghost-${pattern.identity.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
          identity: pattern.identity,
          start: minutesToTime(tryStart),
          end: minutesToTime(tryEnd),
          isGhost: true,
          pattern,
          reason: `Usually at ${pattern.avgStartTime}, adjusted for your schedule`,
        })
        busyTimes.push({ start: tryStart, end: tryEnd })
        foundSlot = true
        break
      }
    }
  }
  
  return suggestions
}

/**
 * Check if a day should show ghost blocks
 * (no committed blocks yet, and user has enough history)
 */
export function shouldShowGhostBlocks(
  commits: DayCommit[],
  targetDateStr: string,
  existingBlocks: TimeBlock[]
): boolean {
  // Don't show if user already has blocks for this day
  if (existingBlocks.length > 0) return false
  
  // Don't show if this day is already committed
  const dayCommit = commits.find(c => c.date === targetDateStr)
  if (dayCommit?.committed) return false
  
  // Only show for today or tomorrow
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  
  const targetDate = new Date(targetDateStr)
  targetDate.setHours(0, 0, 0, 0)
  
  const todayStr = today.toISOString().split('T')[0]
  const tomorrowStr = tomorrow.toISOString().split('T')[0]
  
  if (targetDateStr !== todayStr && targetDateStr !== tomorrowStr) {
    return false
  }
  
  // Need at least 2 committed days of history
  const committedDays = commits.filter(c => c.committed && c.blocks.length > 0)
  if (committedDays.length < 2) return false

  return true
}

