/**
 * Habit Completion Service
 * 
 * The bridge between calendar blocks and habit tracking.
 * When a user marks a block as completed (Yes/No), this service:
 * 1. Finds the matching habit based on identity
 * 2. Creates/updates the habit completion record
 * 3. Updates identity analytics
 */

import { useHabitsStore, matchBlockToHabit, type Habit, type HabitCompletion } from "./habits-store"
import { syncCompletionToSupabase } from "./habits-sync-service"
import type { TimeBlock } from "./schedule-store"

// ============================================
// Types
// ============================================

export interface BlockCompletionEvent {
  block: TimeBlock
  completed: boolean  // true = user said "Yes", false = user said "No"
  date: string        // YYYY-MM-DD
}

// ============================================
// Main Service Functions
// ============================================

/**
 * Called when a user marks a block as completed or not completed
 * This is the main entry point for habit tracking from calendar blocks
 */
export function onBlockCompleted(event: BlockCompletionEvent): void {
  const { block, completed, date } = event
  
  console.log(`[Habit Service] onBlockCompleted called:`, { 
    blockIdentity: block.identity, 
    completed, 
    date 
  })
  
  // Get habits from store
  const { habits, setCompletion, getCompletionsForDate } = useHabitsStore.getState()
  const activeHabits = habits.filter(h => h.isActive)
  
  console.log(`[Habit Service] Active habits in store:`, activeHabits.map(h => ({ 
    name: h.name, 
    identity: h.identity 
  })))
  
  if (activeHabits.length === 0) {
    console.log("[Habit Service] No active habits, skipping")
    return
  }
  
  // Try to match this block to a habit
  const matchedHabit = matchBlockToHabit(block.identity, activeHabits)
  
  if (!matchedHabit) {
    console.log(`[Habit Service] No habit matched for block identity: "${block.identity}"`)
    console.log(`[Habit Service] Available habits:`, activeHabits.map(h => `"${h.name}" (identity: "${h.identity}")`))
    return
  }
  
  console.log(`[Habit Service] Block "${block.identity}" matched to habit "${matchedHabit.name}"`)
  
  // Calculate duration
  const durationMinutes = calculateBlockDuration(block.start, block.end)
  
  // Set the completion in the habits store
  setCompletion(matchedHabit.id, completed, date, {
    blockId: block.id,
    actualStartTime: block.start,
    actualDurationMinutes: durationMinutes,
  })
  
  // Get the updated completion to sync
  const completions = useHabitsStore.getState().completions
  const completion = completions.find(
    c => c.habitId === matchedHabit.id && c.date === date
  )
  
  if (completion) {
    // Sync to Supabase in background
    syncCompletionToSupabase(completion, "upsert").catch(err => {
      console.error("[Habit Service] Failed to sync completion:", err)
    })
  }
  
  console.log(`[Habit Service] Habit "${matchedHabit.name}" marked as ${completed ? "completed" : "missed"} for ${date}`)
}

/**
 * Process all blocks in a committed schedule
 * Called when analyzing historical data or bulk processing
 */
export function processCommittedBlocks(
  blocks: TimeBlock[],
  date: string
): { matched: number; unmatched: string[] } {
  const { habits } = useHabitsStore.getState()
  const activeHabits = habits.filter(h => h.isActive)
  
  let matched = 0
  const unmatched: string[] = []
  
  for (const block of blocks) {
    // Only process blocks that have been answered (completed is not null/undefined)
    if (block.completed === null || block.completed === undefined) {
      continue
    }
    
    const habit = matchBlockToHabit(block.identity, activeHabits)
    
    if (habit) {
      onBlockCompleted({
        block,
        completed: block.completed,
        date,
      })
      matched++
    } else {
      unmatched.push(block.identity)
    }
  }
  
  return { matched, unmatched: [...new Set(unmatched)] }
}

/**
 * Get habits that don't have any blocks scheduled for today
 * Useful for showing "You haven't scheduled time for these habits"
 */
export function getUnscheduledHabits(
  todayBlocks: TimeBlock[],
  date: string
): Habit[] {
  const { habits, getCompletionsForDate } = useHabitsStore.getState()
  const activeHabits = habits.filter(h => h.isActive)
  const todayCompletions = getCompletionsForDate(date)
  
  return activeHabits.filter(habit => {
    // Check if habit already has a completion for today
    const hasCompletion = todayCompletions.some(c => c.habitId === habit.id)
    if (hasCompletion) return false
    
    // Check if any block matches this habit
    const hasMatchingBlock = todayBlocks.some(block => {
      const matched = matchBlockToHabit(block.identity, [habit])
      return matched !== undefined
    })
    
    return !hasMatchingBlock
  })
}

/**
 * Suggest blocks based on habits that haven't been scheduled
 * Returns habit info that can be used to create blocks
 */
export function getHabitBlockSuggestions(
  todayBlocks: TimeBlock[],
  date: string
): Array<{
  habit: Habit
  suggestedStart: string
  suggestedEnd: string
}> {
  const unscheduledHabits = getUnscheduledHabits(todayBlocks, date)
  
  return unscheduledHabits
    .filter(h => h.preferredTime) // Only suggest if they have a preferred time
    .map(habit => {
      const duration = habit.targetDurationMinutes || 60
      const startMinutes = timeToMinutes(habit.preferredTime!)
      const endMinutes = startMinutes + duration
      
      return {
        habit,
        suggestedStart: habit.preferredTime!,
        suggestedEnd: minutesToTime(endMinutes),
      }
    })
}

// ============================================
// Helper Functions
// ============================================

function calculateBlockDuration(start: string, end: string): number {
  const startMinutes = timeToMinutes(start)
  const endMinutes = timeToMinutes(end)
  return endMinutes - startMinutes
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
}

// ============================================
// Analytics Helpers
// ============================================

/**
 * Calculate completion rate for a habit over a period
 */
export function calculateHabitCompletionRate(
  habitId: string,
  days: number = 7
): { completed: number; total: number; rate: number } {
  const { getCompletionsForHabit } = useHabitsStore.getState()
  
  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)
  
  const completions = getCompletionsForHabit(
    habitId,
    startDate.toISOString().split('T')[0],
    endDate.toISOString().split('T')[0]
  )
  
  const completed = completions.filter(c => c.completed).length
  const total = completions.length
  const rate = total > 0 ? Math.round((completed / total) * 100) : 0
  
  return { completed, total, rate }
}

/**
 * Get identity strength based on habit completion
 */
export function calculateIdentityStrength(identity: string): number {
  const { habits, completions } = useHabitsStore.getState()
  
  // Get all habits for this identity
  const identityHabits = habits.filter(
    h => h.identity.toLowerCase() === identity.toLowerCase() && h.isActive
  )
  
  if (identityHabits.length === 0) return 0
  
  // Calculate average completion rate across all habits for this identity
  let totalScore = 0
  
  for (const habit of identityHabits) {
    const { rate } = calculateHabitCompletionRate(habit.id, 14) // Last 2 weeks
    totalScore += rate
  }
  
  return Math.round(totalScore / identityHabits.length)
}



