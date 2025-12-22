/**
 * AI Routine Maker
 * Analyzes user's schedule and suggests optimal times for habits
 * Uses AI (Ollama local or Gemini cloud) to provide personalized recommendations
 */

import type { TimeBlock, DayCommit } from './schedule-store'
import type { CalendarEvent } from '../components/today/day-timeline'
import { useSettingsStore } from './settings-store'

// Types for routine suggestions
export interface RoutineSuggestion {
  habit: string
  suggestedTime: string // HH:MM format
  duration: number // minutes
  reason: string
  confidence: number // 0-1
  conflictsWith?: string[] // Event names that might conflict
  alternatives?: { time: string; reason: string }[]
}

export interface TimeSlot {
  start: string // HH:MM
  end: string // HH:MM
  type: 'free' | 'busy' | 'flexible'
  event?: string // Name of event if busy
}

export interface ScheduleAnalysis {
  freeSlots: TimeSlot[]
  busySlots: TimeSlot[]
  peakProductivityTime?: string // Best time for focus work
  morningRoutineWindow?: { start: string; end: string }
  eveningRoutineWindow?: { start: string; end: string }
  lunchWindow?: { start: string; end: string }
  patterns: {
    earlyBird: boolean // Tends to start early
    nightOwl: boolean // Tends to work late
    consistentSchedule: boolean // Similar schedule day-to-day
    meetingHeavy: boolean // Many meetings
  }
}

// Common habits users want to add
export const COMMON_HABITS = [
  { name: 'Meditation', defaultDuration: 15, idealTime: 'morning' },
  { name: 'Exercise', defaultDuration: 60, idealTime: 'morning' },
  { name: 'Reading', defaultDuration: 30, idealTime: 'evening' },
  { name: 'Journaling', defaultDuration: 15, idealTime: 'evening' },
  { name: 'Deep Work', defaultDuration: 120, idealTime: 'morning' },
  { name: 'Learning', defaultDuration: 45, idealTime: 'afternoon' },
  { name: 'Walking', defaultDuration: 30, idealTime: 'afternoon' },
  { name: 'Family Time', defaultDuration: 60, idealTime: 'evening' },
  { name: 'Creative Work', defaultDuration: 90, idealTime: 'morning' },
  { name: 'Planning', defaultDuration: 15, idealTime: 'morning' },
]

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
}

/**
 * Analyze a day's schedule to find free time slots
 */
export function analyzeSchedule(
  blocks: TimeBlock[],
  calendarEvents: CalendarEvent[],
  dayStart = '06:00',
  dayEnd = '23:00'
): ScheduleAnalysis {
  const allEvents: { start: string; end: string; name: string; type: 'block' | 'event' }[] = [
    ...blocks.map(b => ({ start: b.start, end: b.end, name: b.identity, type: 'block' as const })),
    ...calendarEvents.map(e => ({ start: e.start, end: e.end, name: e.title, type: 'event' as const })),
  ]

  // Sort by start time
  allEvents.sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start))

  const freeSlots: TimeSlot[] = []
  const busySlots: TimeSlot[] = allEvents.map(e => ({
    start: e.start,
    end: e.end,
    type: 'busy' as const,
    event: e.name,
  }))

  // Find gaps between events
  let currentTime = timeToMinutes(dayStart)
  const endTime = timeToMinutes(dayEnd)

  for (const event of allEvents) {
    const eventStart = timeToMinutes(event.start)
    const eventEnd = timeToMinutes(event.end)

    if (eventStart > currentTime) {
      // There's a gap before this event
      const gapDuration = eventStart - currentTime
      if (gapDuration >= 15) { // At least 15 minutes
        freeSlots.push({
          start: minutesToTime(currentTime),
          end: minutesToTime(eventStart),
          type: 'free',
        })
      }
    }

    currentTime = Math.max(currentTime, eventEnd)
  }

  // Check for free time at end of day
  if (currentTime < endTime) {
    freeSlots.push({
      start: minutesToTime(currentTime),
      end: minutesToTime(endTime),
      type: 'free',
    })
  }

  // Detect patterns
  const patterns = {
    earlyBird: allEvents.length > 0 && timeToMinutes(allEvents[0].start) < 480, // Before 8am
    nightOwl: allEvents.length > 0 && timeToMinutes(allEvents[allEvents.length - 1].end) > 1200, // After 8pm
    consistentSchedule: true, // Would need historical data to determine
    meetingHeavy: calendarEvents.length > 4,
  }

  // Identify routine windows
  const morningRoutineWindow = freeSlots.find(
    s => timeToMinutes(s.start) >= 360 && timeToMinutes(s.start) < 540 // 6am-9am
  )
  const eveningRoutineWindow = freeSlots.find(
    s => timeToMinutes(s.start) >= 1140 && timeToMinutes(s.start) < 1380 // 7pm-11pm
  )
  const lunchWindow = freeSlots.find(
    s => timeToMinutes(s.start) >= 720 && timeToMinutes(s.end) <= 840 // 12pm-2pm
  )

  // Find peak productivity time (largest free morning block)
  const morningBlocks = freeSlots.filter(
    s => timeToMinutes(s.start) >= 360 && timeToMinutes(s.end) <= 720
  )
  const largestMorningBlock = morningBlocks.reduce((largest, slot) => {
    const duration = timeToMinutes(slot.end) - timeToMinutes(slot.start)
    const largestDuration = largest ? timeToMinutes(largest.end) - timeToMinutes(largest.start) : 0
    return duration > largestDuration ? slot : largest
  }, null as TimeSlot | null)

  return {
    freeSlots,
    busySlots,
    peakProductivityTime: largestMorningBlock?.start,
    morningRoutineWindow: morningRoutineWindow ? { start: morningRoutineWindow.start, end: morningRoutineWindow.end } : undefined,
    eveningRoutineWindow: eveningRoutineWindow ? { start: eveningRoutineWindow.start, end: eveningRoutineWindow.end } : undefined,
    lunchWindow: lunchWindow ? { start: lunchWindow.start, end: lunchWindow.end } : undefined,
    patterns,
  }
}

/**
 * Find the best time slot for a habit
 */
export function findBestTimeForHabit(
  habit: string,
  duration: number, // minutes
  analysis: ScheduleAnalysis,
  preferredTimeOfDay?: 'morning' | 'afternoon' | 'evening'
): RoutineSuggestion | null {
  // Map preference to time ranges
  const timeRanges = {
    morning: { start: 360, end: 720 }, // 6am-12pm
    afternoon: { start: 720, end: 1020 }, // 12pm-5pm
    evening: { start: 1020, end: 1380 }, // 5pm-11pm
  }

  // Get preferred range or all
  const preferredRange = preferredTimeOfDay 
    ? timeRanges[preferredTimeOfDay] 
    : { start: 360, end: 1380 }

  // Find slots that fit the duration and preference
  const suitableSlots = analysis.freeSlots.filter(slot => {
    const slotStart = timeToMinutes(slot.start)
    const slotEnd = timeToMinutes(slot.end)
    const slotDuration = slotEnd - slotStart

    return (
      slotDuration >= duration &&
      slotStart >= preferredRange.start &&
      slotEnd <= preferredRange.end
    )
  })

  if (suitableSlots.length === 0) {
    // Try to find any slot that fits
    const anySlot = analysis.freeSlots.find(slot => {
      const slotDuration = timeToMinutes(slot.end) - timeToMinutes(slot.start)
      return slotDuration >= duration
    })

    if (!anySlot) return null

    return {
      habit,
      suggestedTime: anySlot.start,
      duration,
      reason: `Only available slot found. Consider rescheduling other activities.`,
      confidence: 0.5,
      conflictsWith: [],
      alternatives: [],
    }
  }

  // Pick the best slot based on habit type
  const habitInfo = COMMON_HABITS.find(h => h.name.toLowerCase() === habit.toLowerCase())
  let bestSlot = suitableSlots[0]

  if (habitInfo?.idealTime === 'morning') {
    // Prefer earlier slots
    bestSlot = suitableSlots.reduce((earliest, slot) => 
      timeToMinutes(slot.start) < timeToMinutes(earliest.start) ? slot : earliest
    )
  } else if (habitInfo?.idealTime === 'evening') {
    // Prefer later slots
    bestSlot = suitableSlots.reduce((latest, slot) => 
      timeToMinutes(slot.start) > timeToMinutes(latest.start) ? slot : latest
    )
  }

  // Generate reason based on context
  let reason = `This time slot is free and fits your ${duration}-minute ${habit.toLowerCase()}.`
  
  if (analysis.patterns.earlyBird && timeToMinutes(bestSlot.start) < 480) {
    reason += ` Matches your early-bird pattern.`
  }
  if (analysis.patterns.meetingHeavy && timeToMinutes(bestSlot.start) < 540) {
    reason += ` Before your meetings start.`
  }

  // Find alternatives
  const alternatives = suitableSlots
    .filter(s => s.start !== bestSlot.start)
    .slice(0, 2)
    .map(s => ({
      time: s.start,
      reason: timeToMinutes(s.start) < 720 ? 'Morning option' : 'Afternoon/Evening option',
    }))

  return {
    habit,
    suggestedTime: bestSlot.start,
    duration,
    reason,
    confidence: 0.85,
    conflictsWith: [],
    alternatives,
  }
}

/**
 * Generate AI-powered routine suggestions
 * Uses local AI (Ollama) or cloud AI (Gemini) based on settings
 */
export async function generateAIRoutineSuggestions(
  habits: string[],
  blocks: TimeBlock[],
  calendarEvents: CalendarEvent[],
  userGoals?: string,
  northStar?: string
): Promise<RoutineSuggestion[]> {
  const analysis = analyzeSchedule(blocks, calendarEvents)
  
  // First, generate rule-based suggestions
  const suggestions: RoutineSuggestion[] = []
  
  for (const habit of habits) {
    const habitInfo = COMMON_HABITS.find(h => h.name.toLowerCase() === habit.toLowerCase())
    const duration = habitInfo?.defaultDuration || 30
    const preferredTime = habitInfo?.idealTime as 'morning' | 'afternoon' | 'evening' | undefined
    
    const suggestion = findBestTimeForHabit(habit, duration, analysis, preferredTime)
    if (suggestion) {
      suggestions.push(suggestion)
    }
  }

  // TODO: Enhance with AI call to Ollama/Gemini for personalized reasoning
  // This would analyze user's north star, goals, and historical patterns
  // to provide more nuanced suggestions

  return suggestions
}

/**
 * Build a full routine from selected habits
 */
export function buildRoutineFromSuggestions(
  suggestions: RoutineSuggestion[]
): TimeBlock[] {
  return suggestions.map((s, index) => ({
    id: `routine-${index}-${Date.now()}`,
    identity: s.habit,
    start: s.suggestedTime,
    end: minutesToTime(timeToMinutes(s.suggestedTime) + s.duration),
    optional: false,
  }))
}

/**
 * Check for conflicts between suggested routine and existing events
 */
export function checkRoutineConflicts(
  suggestions: RoutineSuggestion[],
  calendarEvents: CalendarEvent[]
): Map<string, CalendarEvent[]> {
  const conflicts = new Map<string, CalendarEvent[]>()

  for (const suggestion of suggestions) {
    const suggestionStart = timeToMinutes(suggestion.suggestedTime)
    const suggestionEnd = suggestionStart + suggestion.duration

    const conflictingEvents = calendarEvents.filter(event => {
      const eventStart = timeToMinutes(event.start)
      const eventEnd = timeToMinutes(event.end)
      
      // Check for overlap
      return !(suggestionEnd <= eventStart || suggestionStart >= eventEnd)
    })

    if (conflictingEvents.length > 0) {
      conflicts.set(suggestion.habit, conflictingEvents)
    }
  }

  return conflicts
}







