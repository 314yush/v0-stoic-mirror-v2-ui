/**
 * Test Data Seeder
 * 
 * Creates mock historical commits for testing the auto-habit system.
 * Only for development - remove or disable in production.
 */

import { useScheduleStore, type DayCommit, type TimeBlock } from "./schedule-store"
import { getDateStrLocal } from "./date-utils"

/**
 * Seed test commits for the past N days
 */
export function seedTestCommits() {
  const { commits, setCommits } = useScheduleStore.getState()
  
  // Don't add duplicates
  const existingDates = new Set(commits.map(c => c.date))
  
  const testCommits: DayCommit[] = [...commits]
  const today = new Date()
  
  // Create commits for the past 14 days
  for (let daysAgo = 1; daysAgo <= 14; daysAgo++) {
    const date = new Date(today)
    date.setDate(date.getDate() - daysAgo)
    const dateStr = getDateStrLocal(date)
    
    // Skip if already exists
    if (existingDates.has(dateStr)) continue
    
    const blocks: TimeBlock[] = []
    const dayOfWeek = date.getDay()
    
    // Add workout blocks (Mon, Wed, Fri, Sat)
    if ([1, 3, 5, 6].includes(dayOfWeek)) {
      blocks.push({
        id: `test-workout-${dateStr}`,
        identity: dayOfWeek % 2 === 0 ? "Morning Run" : "Gym Workout",
        start: "07:00",
        end: "08:00",
        completed: Math.random() > 0.2  // 80% completion rate
      })
    }
    
    // Add deep work blocks (Mon-Fri)
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      blocks.push({
        id: `test-deepwork-${dateStr}`,
        identity: "Deep Work Session",
        start: "09:00",
        end: "12:00",
        completed: Math.random() > 0.15  // 85% completion rate
      })
    }
    
    // Add reading blocks (every day)
    blocks.push({
      id: `test-reading-${dateStr}`,
      identity: "Evening Reading",
      start: "21:00",
      end: "22:00",
      completed: Math.random() > 0.25  // 75% completion rate
    })
    
    // Add meditation blocks (Mon, Wed, Fri, Sun)
    if ([0, 1, 3, 5].includes(dayOfWeek)) {
      blocks.push({
        id: `test-meditation-${dateStr}`,
        identity: "Meditation",
        start: "06:30",
        end: "07:00",
        completed: Math.random() > 0.3  // 70% completion rate
      })
    }
    
    if (blocks.length > 0) {
      testCommits.push({
        date: dateStr,
        blocks,
        committed_at: date.toISOString(),
        committed: true,
        finalized_at: date.toISOString()
      })
    }
  }
  
  // Sort by date descending
  testCommits.sort((a, b) => b.date.localeCompare(a.date))
  
  setCommits(testCommits)
  
  console.log(`[Seed] Added test commits. Total: ${testCommits.length}`)
  
  return testCommits.length - commits.length
}

/**
 * Clear all test commits (keeps real commits)
 */
export function clearTestCommits() {
  const { commits, setCommits } = useScheduleStore.getState()
  
  const realCommits = commits.filter(c => 
    !c.blocks.some(b => b.id.startsWith("test-"))
  )
  
  setCommits(realCommits)
  
  console.log(`[Seed] Cleared test commits. Remaining: ${realCommits.length}`)
}

/**
 * Make this available globally for console testing
 */
if (typeof window !== "undefined") {
  (window as any).seedTestData = seedTestCommits;
  (window as any).clearTestData = clearTestCommits;
}




