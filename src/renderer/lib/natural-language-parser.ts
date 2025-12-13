/**
 * Natural Language Parser for Schedule Input
 * Uses chrono-node for parsing natural language date/time expressions
 */

import * as chrono from 'chrono-node'

export interface ParsedScheduleItem {
  identity: string
  start: string  // HH:MM format
  end: string    // HH:MM format
  date?: string  // YYYY-MM-DD format (optional, defaults to today)
  confidence: number  // 0-1 confidence score
}

export interface ParseResult {
  success: boolean
  item?: ParsedScheduleItem
  error?: string
  rawText: string
  suggestions?: string[]
}

// Default duration for blocks without explicit end time (in minutes)
const DEFAULT_DURATION = 60

// Common identity keywords and their normalized forms
const IDENTITY_KEYWORDS: Record<string, string> = {
  'workout': 'Exercise',
  'gym': 'Exercise',
  'exercise': 'Exercise',
  'run': 'Exercise',
  'running': 'Exercise',
  'yoga': 'Exercise',
  'meditation': 'Meditation',
  'meditate': 'Meditation',
  'work': 'Deep Work',
  'deep work': 'Deep Work',
  'focus': 'Deep Work',
  'focus time': 'Deep Work',
  'coding': 'Deep Work',
  'code': 'Deep Work',
  'meeting': 'Meeting',
  'call': 'Meeting',
  'standup': 'Meeting',
  'lunch': 'Lunch Break',
  'break': 'Break',
  'rest': 'Break',
  'read': 'Reading',
  'reading': 'Reading',
  'study': 'Study',
  'learn': 'Study',
  'learning': 'Study',
  'write': 'Writing',
  'writing': 'Writing',
  'journal': 'Journaling',
  'journaling': 'Journaling',
  'family': 'Family Time',
  'family time': 'Family Time',
  'social': 'Social Time',
  'friends': 'Social Time',
  'sleep': 'Sleep',
  'morning routine': 'Morning Routine',
  'morning': 'Morning Routine',
  'evening': 'Evening Wind Down',
  'wind down': 'Evening Wind Down',
  'evening routine': 'Evening Wind Down',
  'night routine': 'Evening Wind Down',
}

/**
 * Extract identity from text
 * Tries to match known identity keywords or uses the cleaned text
 */
function extractIdentity(text: string): string {
  const lowerText = text.toLowerCase()
  
  // First, try to find known identity keywords
  for (const [keyword, identity] of Object.entries(IDENTITY_KEYWORDS)) {
    if (lowerText.includes(keyword)) {
      return identity
    }
  }
  
  // If no match, try to extract a meaningful identity from the text
  // Remove time-related words
  const timeWords = [
    'at', 'from', 'to', 'until', 'till', 'am', 'pm',
    'morning', 'afternoon', 'evening', 'night',
    'today', 'tomorrow', 'monday', 'tuesday', 'wednesday',
    'thursday', 'friday', 'saturday', 'sunday',
    'next', 'this', 'for', 'hour', 'hours', 'minute', 'minutes',
    'o\'clock', 'oclock'
  ]
  
  let cleaned = lowerText
  for (const word of timeWords) {
    cleaned = cleaned.replace(new RegExp(`\\b${word}\\b`, 'gi'), '')
  }
  
  // Remove numbers and extra whitespace
  cleaned = cleaned.replace(/\d+/g, '').replace(/\s+/g, ' ').trim()
  
  // Capitalize first letter of each word
  if (cleaned) {
    return cleaned
      .split(' ')
      .filter(w => w.length > 0)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')
  }
  
  return 'Block'  // Default fallback
}

/**
 * Round minutes to nearest 5
 */
function roundToNearest5(minutes: number): number {
  return Math.round(minutes / 5) * 5
}

/**
 * Format time as HH:MM (rounded to nearest 5 minutes)
 */
function formatTime(date: Date): string {
  const hours = date.getHours()
  const rawMinutes = date.getMinutes()
  const roundedMinutes = roundToNearest5(rawMinutes)
  
  // Handle overflow (e.g., 55 -> 60 becomes next hour)
  const finalHours = roundedMinutes >= 60 ? hours + 1 : hours
  const finalMinutes = roundedMinutes >= 60 ? 0 : roundedMinutes
  
  return `${finalHours.toString().padStart(2, '0')}:${finalMinutes.toString().padStart(2, '0')}`
}

/**
 * Format date as YYYY-MM-DD
 */
function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Parse natural language input into a schedule item
 * 
 * Examples:
 * - "Workout at 6am"
 * - "Meeting from 2pm to 3pm"
 * - "Deep work 9am-12pm"
 * - "Gym tomorrow at 7"
 * - "Call at 3pm for 30 minutes"
 */
export function parseNaturalLanguage(input: string): ParseResult {
  const rawText = input.trim()
  
  if (!rawText) {
    return {
      success: false,
      error: 'Please enter something to schedule',
      rawText,
    }
  }
  
  // Use chrono to parse the date/time
  const results = chrono.parse(rawText, new Date(), { forwardDate: true })
  
  if (results.length === 0) {
    // No time found - return error with suggestions
    return {
      success: false,
      error: 'Could not understand the time. Try something like "Workout at 6am" or "Meeting 2pm-3pm"',
      rawText,
      suggestions: [
        `${rawText} at 9am`,
        `${rawText} from 2pm to 3pm`,
        `${rawText} tomorrow at 10am`,
      ],
    }
  }
  
  const parsed = results[0]
  
  // Extract start time
  const startDate = parsed.start.date()
  const start = formatTime(startDate)
  const date = formatDate(startDate)
  
  // Extract end time if available, otherwise calculate from duration
  let end: string
  let confidence = 0.8
  
  if (parsed.end) {
    // Explicit end time
    const endDate = parsed.end.date()
    end = formatTime(endDate)
    confidence = 0.95
  } else {
    // Check for duration keywords in the text
    const durationMatch = rawText.match(/for\s+(\d+)\s*(hour|hr|minute|min)s?/i)
    
    if (durationMatch) {
      const amount = parseInt(durationMatch[1])
      const unit = durationMatch[2].toLowerCase()
      const durationMinutes = unit.startsWith('hour') || unit.startsWith('hr') 
        ? amount * 60 
        : amount
      
      const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000)
      end = formatTime(endDate)
      confidence = 0.9
    } else {
      // Default duration
      const endDate = new Date(startDate.getTime() + DEFAULT_DURATION * 60 * 1000)
      end = formatTime(endDate)
      confidence = 0.7
    }
  }
  
  // Extract identity from the text
  const identity = extractIdentity(rawText)
  
  return {
    success: true,
    item: {
      identity,
      start,
      end,
      date,
      confidence,
    },
    rawText,
  }
}

/**
 * Get smart suggestions based on partial input
 */
export function getSuggestions(input: string): string[] {
  const lowerInput = input.toLowerCase()
  const suggestions: string[] = []
  
  // If input has time, suggest identities
  const hasTime = /\d/.test(input) || /am|pm|morning|afternoon|evening/i.test(input)
  
  if (hasTime) {
    // Suggest adding an identity if not present
    const identities = ['Deep Work', 'Exercise', 'Meeting', 'Reading', 'Meditation']
    for (const identity of identities) {
      if (!lowerInput.includes(identity.toLowerCase())) {
        suggestions.push(`${identity} ${input}`)
      }
    }
  } else {
    // Suggest adding times
    suggestions.push(`${input} at 9am`)
    suggestions.push(`${input} from 2pm to 3pm`)
    suggestions.push(`${input} tomorrow at 10am`)
    suggestions.push(`${input} for 1 hour at 3pm`)
  }
  
  return suggestions.slice(0, 4)
}

/**
 * Validate a parsed schedule item
 */
export function validateParsedItem(item: ParsedScheduleItem): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  
  // Check start time
  const [startHour, startMin] = item.start.split(':').map(Number)
  if (startHour < 0 || startHour > 23 || startMin < 0 || startMin > 59) {
    errors.push('Invalid start time')
  }
  
  // Check end time
  const [endHour, endMin] = item.end.split(':').map(Number)
  if (endHour < 0 || endHour > 23 || endMin < 0 || endMin > 59) {
    errors.push('Invalid end time')
  }
  
  // Check end is after start (considering same day)
  const startMinutes = startHour * 60 + startMin
  const endMinutes = endHour * 60 + endMin
  if (endMinutes <= startMinutes) {
    errors.push('End time must be after start time')
  }
  
  // Check reasonable duration (max 8 hours)
  const duration = endMinutes - startMinutes
  if (duration > 480) {
    errors.push('Duration seems too long (over 8 hours)')
  }
  
  // Check identity is not empty
  if (!item.identity || item.identity.trim() === '') {
    errors.push('Identity cannot be empty')
  }
  
  return {
    valid: errors.length === 0,
    errors,
  }
}

