/**
 * Schedule Date Utilities
 * Helper functions for determining effective dates based on commit cutoff time
 * ALL dates use LOCAL timezone to avoid UTC conversion issues
 */

import { getTodayDateStrLocal, getDateStrLocal } from "./date-utils"

/**
 * Get the effective date for committing based on cutoff time
 * Returns the date that you can currently commit for (LOCAL timezone)
 * - Before cutoff time: today's date (if window is open)
 * - After cutoff time: tomorrow's date (window opens)
 */
export function getEffectiveCommitDate(cutoffTime: string = "22:00"): string {
  const now = new Date()
  const [cutoffHour, cutoffMin] = cutoffTime.split(":").map(Number)
  const cutoffMinutes = cutoffHour * 60 + cutoffMin
  
  const currentHour = now.getHours()
  const currentMin = now.getMinutes()
  const currentMinutes = currentHour * 60 + currentMin
  
  // If past cutoff time, the window for tomorrow is open
  if (currentMinutes >= cutoffMinutes) {
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    return getDateStrLocal(tomorrow) // Use LOCAL timezone
  }
  
  // Before cutoff time, you can commit for today (if window is still open)
  return getTodayDateStrLocal() // Use LOCAL timezone
}

/**
 * Check if a specific date is locked (has a commit)
 * A date is locked if it has been committed
 */
export function isDateLocked(dateStr: string, hasCommit: boolean, cutoffTime: string = "22:00"): boolean {
  // If the date has been committed, it's locked
  return hasCommit
}

/**
 * Check if the commit window is open for a specific date
 * Window opens at cutoff time on the previous day and stays open until committed
 */
export function isCommitWindowOpen(dateStr: string, hasCommit: boolean, cutoffTime: string = "22:00"): boolean {
  // If already committed, window is closed
  if (hasCommit) {
    return false
  }
  
  // Parse dates consistently using LOCAL timezone strings (YYYY-MM-DD)
  const todayStr = getTodayDateStrLocal()
  
  // Compare date strings directly to avoid timezone issues
  if (dateStr < todayStr) {
    // Can't commit for past dates
    return false
  }
  
  // For today: window opens at cutoff time yesterday and stays open until committed
  // The window opened at 10 PM yesterday and stays open all day today until committed
  if (dateStr === todayStr) {
    // Window is always open for today if we're past the cutoff time yesterday
    // This means: if we're on today's date, the window opened yesterday at cutoff time
    // and stays open until we commit for today
    return true
  }
  
  // For tomorrow (or future dates): check if we're past cutoff time today
  // Calculate day before by parsing date string and subtracting a day (LOCAL timezone)
  const [year, month, day] = dateStr.split("-").map(Number)
  const dateObj = new Date(year, month - 1, day) // month is 0-indexed, LOCAL timezone
  dateObj.setDate(dateObj.getDate() - 1)
  const dayBeforeStr = getDateStrLocal(dateObj) // Use LOCAL timezone
  
  // If committing for tomorrow: check if we're past cutoff time today
  if (dayBeforeStr === todayStr) {
    const [cutoffHour, cutoffMin] = cutoffTime.split(":").map(Number)
    const cutoffMinutes = cutoffHour * 60 + cutoffMin
    
    const now = new Date()
    const currentHour = now.getHours()
    const currentMin = now.getMinutes()
    const currentMinutes = currentHour * 60 + currentMin
    
    // Window is open if we're past cutoff time today (for tomorrow/future)
    return currentMinutes >= cutoffMinutes
  }
  
  // If the day before is in the past (yesterday or earlier), the window is open
  // This handles viewing dates more than 1 day in the future: window already opened
  return dayBeforeStr < todayStr
}

/**
 * Get the date that should be considered "today" for committing purposes
 * This is the date you can currently commit for
 */
export function getCommitTargetDate(cutoffTime: string = "22:00"): string {
  return getEffectiveCommitDate(cutoffTime)
}

