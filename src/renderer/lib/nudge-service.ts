import { storage } from "./storage"
import { useSettingsStore } from "./settings-store"

interface NudgeState {
  lastNudgeTime: number | null
  snoozedUntil: number | null
  lastWakeUpNudgeTime: number | null
}

const SNOOZE_DURATION = 20 * 60 * 1000 // 20 minutes in milliseconds

/**
 * Convert time string (HH:MM) to minutes since midnight
 */
function timeStringToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number)
  return hours * 60 + minutes
}

/**
 * Check if current time is around the evening wind-down time
 */
export function checkEveningNudgeTime(): boolean {
  const settings = useSettingsStore.getState().settings
  if (!settings.eveningWindDownEnabled) return false
  
  const now = new Date()
  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  const nudgeMinutes = timeStringToMinutes(settings.eveningWindDownTime)
  
  // Check if it's around the set time (within 30-minute window)
  return currentMinutes >= nudgeMinutes - 30 && currentMinutes <= nudgeMinutes + 30
}

/**
 * Check if current time is around the wake-up time
 */
export function checkWakeUpNudgeTime(): boolean {
  const settings = useSettingsStore.getState().settings
  if (!settings.wakeUpEnabled) return false
  
  const now = new Date()
  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  const nudgeMinutes = timeStringToMinutes(settings.wakeUpTime)
  
  // Check if it's around the set time (within 30-minute window)
  return currentMinutes >= nudgeMinutes - 30 && currentMinutes <= nudgeMinutes + 30
}

/**
 * @deprecated Use checkEveningNudgeTime() instead
 */
export function checkNudgeTime(): boolean {
  return checkEveningNudgeTime()
}

export function hasBeenNudgedToday(type: 'evening' | 'wakeup' = 'evening'): boolean {
  const state = storage.get<NudgeState>("nudge_state_v1") || {
    lastNudgeTime: null,
    snoozedUntil: null,
    lastWakeUpNudgeTime: null,
  }
  
  const now = Date.now()
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  
  const lastNudgeTime = type === 'evening' ? state.lastNudgeTime : state.lastWakeUpNudgeTime
  
  // Check if we've nudged today
  if (lastNudgeTime) {
    const lastNudgeDate = new Date(lastNudgeTime)
    lastNudgeDate.setHours(0, 0, 0, 0)
    
    if (lastNudgeDate.getTime() === today.getTime()) {
      // Check if snoozed (snooze applies to evening only for now)
      if (type === 'evening' && state.snoozedUntil && now < state.snoozedUntil) {
        return false // Still snoozed, don't show nudge
      }
      // Already nudged today and snooze expired or never snoozed
      // Return false to prevent re-nudging today (unless snoozed)
      return false
    }
  }
  
  // Haven't nudged today - check if snoozed (evening only)
  if (type === 'evening' && state.snoozedUntil && now < state.snoozedUntil) {
    return false // Still snoozed
  }
  
  return true // Haven't nudged today and not snoozed
}

export function markNudged(type: 'evening' | 'wakeup' = 'evening'): void {
  const state = storage.get<NudgeState>("nudge_state_v1") || {
    lastNudgeTime: null,
    snoozedUntil: null,
    lastWakeUpNudgeTime: null,
  }
  
  storage.set("nudge_state_v1", {
    ...state,
    lastNudgeTime: type === 'evening' ? Date.now() : state.lastNudgeTime,
    lastWakeUpNudgeTime: type === 'wakeup' ? Date.now() : state.lastWakeUpNudgeTime,
    snoozedUntil: type === 'evening' ? null : state.snoozedUntil, // Clear snooze when nudging
  })
}

export function snoozeNudge(): void {
  const state = storage.get<NudgeState>("nudge_state_v1") || {
    lastNudgeTime: null,
    snoozedUntil: null,
  }
  
  storage.set("nudge_state_v1", {
    ...state,
    snoozedUntil: Date.now() + SNOOZE_DURATION,
  })
}

