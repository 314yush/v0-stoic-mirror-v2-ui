import { storage } from "./storage"

interface NudgeState {
  lastNudgeTime: number | null
  snoozedUntil: number | null
}

const NUDGE_TIME = 22 * 60 // 10pm in minutes (22:00)
const SNOOZE_DURATION = 20 * 60 * 1000 // 20 minutes in milliseconds

export function checkNudgeTime(): boolean {
  const now = new Date()
  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  
  // Check if it's around 10pm (within 30-minute window: 9:30pm - 10:30pm)
  return currentMinutes >= NUDGE_TIME - 30 && currentMinutes <= NUDGE_TIME + 30
}

export function hasBeenNudgedToday(): boolean {
  const state = storage.get<NudgeState>("nudge_state_v1") || {
    lastNudgeTime: null,
    snoozedUntil: null,
  }
  
  const now = Date.now()
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  
  // Check if we've nudged today
  if (state.lastNudgeTime) {
    const lastNudgeDate = new Date(state.lastNudgeTime)
    lastNudgeDate.setHours(0, 0, 0, 0)
    
    if (lastNudgeDate.getTime() === today.getTime()) {
      // Check if snoozed
      if (state.snoozedUntil && now < state.snoozedUntil) {
        return false // Still snoozed, don't show nudge
      }
      // Already nudged today and snooze expired or never snoozed
      // Return false to prevent re-nudging today (unless snoozed)
      return false
    }
  }
  
  // Haven't nudged today - check if snoozed
  if (state.snoozedUntil && now < state.snoozedUntil) {
    return false // Still snoozed
  }
  
  return true // Haven't nudged today and not snoozed
}

export function markNudged(): void {
  const state = storage.get<NudgeState>("nudge_state_v1") || {
    lastNudgeTime: null,
    snoozedUntil: null,
  }
  
  storage.set("nudge_state_v1", {
    ...state,
    lastNudgeTime: Date.now(),
    snoozedUntil: null, // Clear snooze when nudging
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

