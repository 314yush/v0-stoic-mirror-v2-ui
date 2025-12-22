/**
 * AI Schedule Optimizer
 * Analyzes the user's schedule and suggests optimizations
 * to improve productivity, balance, and alignment with goals
 */

import type { TimeBlock, DayCommit } from './schedule-store'
import type { CalendarEvent } from '../components/today/day-timeline'
import { analyzeSchedule, timeToMinutes, minutesToTime, type ScheduleAnalysis } from './ai-routine-maker'

// Optimization types
export type OptimizationType = 
  | 'consolidate'    // Merge fragmented similar blocks
  | 'move'           // Move block to better time
  | 'extend'         // Extend block duration
  | 'shrink'         // Reduce block duration
  | 'add-buffer'     // Add transition time between blocks
  | 'remove'         // Suggest removing low-value activity
  | 'batch'          // Batch similar activities together

export interface OptimizationSuggestion {
  id: string
  type: OptimizationType
  priority: 'high' | 'medium' | 'low'
  title: string
  description: string
  affectedBlocks: string[] // Block IDs
  proposedChange?: {
    blockId: string
    newStart?: string
    newEnd?: string
    newIdentity?: string
  }
  reasoning: string
  impact: {
    focusTime: number // Change in minutes
    transitions: number // Change in number of transitions
    alignment: number // 0-100 score for goal alignment
  }
}

export interface ScheduleScore {
  overall: number // 0-100
  focusTime: number // 0-100
  balance: number // 0-100
  transitions: number // 0-100 (lower is better for too many)
  identityAlignment: number // 0-100
}

export interface WeeklyPattern {
  dayOfWeek: number // 0-6
  averageBlocks: number
  averageFocusHours: number
  commonIdentities: string[]
  typicalStartTime?: string
  typicalEndTime?: string
}

function timeToMinutesLocal(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

function minutesToTimeLocal(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
}

/**
 * Calculate a score for a day's schedule
 */
export function scoreSchedule(
  blocks: TimeBlock[],
  calendarEvents: CalendarEvent[],
  northStarGoals?: string[]
): ScheduleScore {
  if (blocks.length === 0) {
    return { overall: 0, focusTime: 0, balance: 0, transitions: 100, identityAlignment: 0 }
  }

  // Calculate focus time (blocks of 90+ minutes)
  const focusBlocks = blocks.filter(b => {
    const duration = timeToMinutesLocal(b.end) - timeToMinutesLocal(b.start)
    return duration >= 90
  })
  const totalFocusMinutes = focusBlocks.reduce((sum, b) => 
    sum + (timeToMinutesLocal(b.end) - timeToMinutesLocal(b.start)), 0
  )
  const focusScore = Math.min(100, (totalFocusMinutes / 180) * 100) // Target: 3 hours

  // Calculate balance (variety of identities)
  const uniqueIdentities = new Set(blocks.map(b => b.identity.toLowerCase()))
  const balanceScore = Math.min(100, (uniqueIdentities.size / 4) * 100) // Target: 4 different types

  // Calculate transitions (fewer is better, up to a point)
  const sortedBlocks = [...blocks].sort((a, b) => 
    timeToMinutesLocal(a.start) - timeToMinutesLocal(b.start)
  )
  let transitionCount = 0
  for (let i = 1; i < sortedBlocks.length; i++) {
    const gap = timeToMinutesLocal(sortedBlocks[i].start) - timeToMinutesLocal(sortedBlocks[i - 1].end)
    if (gap < 15) transitionCount++ // Back-to-back or small gap
  }
  const transitionScore = blocks.length <= 1 ? 100 : Math.max(0, 100 - (transitionCount * 15))

  // Calculate identity alignment
  let alignmentScore = 50 // Default
  if (northStarGoals && northStarGoals.length > 0) {
    const alignedBlocks = blocks.filter(b => 
      northStarGoals.some(goal => 
        b.identity.toLowerCase().includes(goal.toLowerCase()) ||
        goal.toLowerCase().includes(b.identity.toLowerCase())
      )
    )
    alignmentScore = Math.min(100, (alignedBlocks.length / blocks.length) * 100)
  }

  // Overall score (weighted average)
  const overall = Math.round(
    focusScore * 0.3 +
    balanceScore * 0.2 +
    transitionScore * 0.2 +
    alignmentScore * 0.3
  )

  return {
    overall,
    focusTime: Math.round(focusScore),
    balance: Math.round(balanceScore),
    transitions: Math.round(transitionScore),
    identityAlignment: Math.round(alignmentScore),
  }
}

/**
 * Generate optimization suggestions for a day's schedule
 */
export function generateOptimizations(
  blocks: TimeBlock[],
  calendarEvents: CalendarEvent[],
  northStarGoals?: string[]
): OptimizationSuggestion[] {
  const suggestions: OptimizationSuggestion[] = []
  const analysis = analyzeSchedule(blocks, calendarEvents)
  
  if (blocks.length === 0) return suggestions

  const sortedBlocks = [...blocks].sort((a, b) => 
    timeToMinutesLocal(a.start) - timeToMinutesLocal(b.start)
  )

  // 1. Check for fragmented similar blocks that could be consolidated
  const identityGroups = new Map<string, TimeBlock[]>()
  for (const block of blocks) {
    const key = block.identity.toLowerCase()
    if (!identityGroups.has(key)) {
      identityGroups.set(key, [])
    }
    identityGroups.get(key)!.push(block)
  }

  for (const [identity, group] of identityGroups) {
    if (group.length > 1) {
      // Check if they're not consecutive
      const sorted = group.sort((a, b) => 
        timeToMinutesLocal(a.start) - timeToMinutesLocal(b.start)
      )
      for (let i = 1; i < sorted.length; i++) {
        const gap = timeToMinutesLocal(sorted[i].start) - timeToMinutesLocal(sorted[i - 1].end)
        if (gap > 60) { // More than 1 hour gap
          suggestions.push({
            id: `consolidate-${identity}-${i}`,
            type: 'consolidate',
            priority: 'medium',
            title: `Consolidate ${identity} blocks`,
            description: `You have multiple ${identity} sessions spread throughout the day. Consider consolidating them for deeper focus.`,
            affectedBlocks: [sorted[i - 1].id, sorted[i].id],
            reasoning: `Context switching between ${identity} sessions reduces effectiveness. Consolidating can improve focus by up to 40%.`,
            impact: { focusTime: 30, transitions: -1, alignment: 10 },
          })
        }
      }
    }
  }

  // 2. Check for back-to-back blocks without buffers
  for (let i = 1; i < sortedBlocks.length; i++) {
    const prevEnd = timeToMinutesLocal(sortedBlocks[i - 1].end)
    const currStart = timeToMinutesLocal(sortedBlocks[i].start)
    
    if (currStart - prevEnd === 0) {
      suggestions.push({
        id: `buffer-${sortedBlocks[i].id}`,
        type: 'add-buffer',
        priority: 'low',
        title: 'Add transition time',
        description: `No buffer between "${sortedBlocks[i - 1].identity}" and "${sortedBlocks[i].identity}"`,
        affectedBlocks: [sortedBlocks[i - 1].id, sortedBlocks[i].id],
        proposedChange: {
          blockId: sortedBlocks[i].id,
          newStart: minutesToTimeLocal(currStart + 10),
        },
        reasoning: 'A 10-minute buffer helps with mental transition and prevents burnout.',
        impact: { focusTime: -10, transitions: 0, alignment: 5 },
      })
    }
  }

  // 3. Check for short blocks that could be extended
  for (const block of blocks) {
    const duration = timeToMinutesLocal(block.end) - timeToMinutesLocal(block.start)
    if (duration < 30 && !block.optional) {
      // Check if there's free time after
      const blockIndex = sortedBlocks.findIndex(b => b.id === block.id)
      const nextBlock = sortedBlocks[blockIndex + 1]
      const availableGap = nextBlock 
        ? timeToMinutesLocal(nextBlock.start) - timeToMinutesLocal(block.end)
        : 60 // Assume some free time at end of day

      if (availableGap >= 30) {
        suggestions.push({
          id: `extend-${block.id}`,
          type: 'extend',
          priority: 'low',
          title: `Extend ${block.identity}`,
          description: `${block.identity} is only ${duration} minutes. Consider extending for more impact.`,
          affectedBlocks: [block.id],
          proposedChange: {
            blockId: block.id,
            newEnd: minutesToTimeLocal(timeToMinutesLocal(block.start) + Math.min(60, duration + availableGap)),
          },
          reasoning: 'Blocks under 30 minutes often aren\'t enough time to get into flow state.',
          impact: { focusTime: 30, transitions: 0, alignment: 10 },
        })
      }
    }
  }

  // 4. Check for morning peak productivity usage
  const morningBlocks = blocks.filter(b => 
    timeToMinutesLocal(b.start) >= 360 && timeToMinutesLocal(b.end) <= 720 // 6am-12pm
  )
  const morningFocusBlocks = morningBlocks.filter(b => {
    const duration = timeToMinutesLocal(b.end) - timeToMinutesLocal(b.start)
    const isDeepWork = ['deep work', 'focus', 'creative', 'writing', 'coding'].some(
      kw => b.identity.toLowerCase().includes(kw)
    )
    return duration >= 60 && isDeepWork
  })

  if (morningBlocks.length > 0 && morningFocusBlocks.length === 0) {
    suggestions.push({
      id: 'morning-focus',
      type: 'move',
      priority: 'high',
      title: 'Optimize morning for focus work',
      description: 'Your morning has no deep work blocks. Consider moving focus activities to before noon.',
      affectedBlocks: [],
      reasoning: 'Research shows cognitive performance peaks in the morning for most people.',
      impact: { focusTime: 60, transitions: 0, alignment: 20 },
    })
  }

  // 5. Check for evening wind-down
  const eveningBlocks = blocks.filter(b => 
    timeToMinutesLocal(b.start) >= 1200 // After 8pm
  )
  const hasIntenseEvening = eveningBlocks.some(b => 
    ['deep work', 'exercise', 'workout'].some(
      kw => b.identity.toLowerCase().includes(kw)
    )
  )

  if (hasIntenseEvening) {
    suggestions.push({
      id: 'evening-relax',
      type: 'move',
      priority: 'medium',
      title: 'Move intense activities earlier',
      description: 'You have intense activities scheduled late in the evening which may affect sleep.',
      affectedBlocks: eveningBlocks.filter(b => 
        ['deep work', 'exercise', 'workout'].some(
          kw => b.identity.toLowerCase().includes(kw)
        )
      ).map(b => b.id),
      reasoning: 'Intense activities after 8pm can disrupt sleep quality and recovery.',
      impact: { focusTime: 0, transitions: 0, alignment: 15 },
    })
  }

  // Sort by priority
  const priorityOrder = { high: 0, medium: 1, low: 2 }
  suggestions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])

  return suggestions
}

/**
 * Apply an optimization suggestion to the blocks
 */
export function applyOptimization(
  blocks: TimeBlock[],
  suggestion: OptimizationSuggestion
): TimeBlock[] {
  if (!suggestion.proposedChange) return blocks

  return blocks.map(block => {
    if (block.id === suggestion.proposedChange!.blockId) {
      return {
        ...block,
        start: suggestion.proposedChange!.newStart || block.start,
        end: suggestion.proposedChange!.newEnd || block.end,
        identity: suggestion.proposedChange!.newIdentity || block.identity,
      }
    }
    return block
  })
}

/**
 * Analyze weekly patterns from historical commits
 */
export function analyzeWeeklyPatterns(
  commits: DayCommit[]
): WeeklyPattern[] {
  const patterns: WeeklyPattern[] = []
  
  for (let day = 0; day < 7; day++) {
    const dayCommits = commits.filter(c => {
      const date = new Date(c.date)
      return date.getDay() === day && c.committed && c.blocks.length > 0
    })

    if (dayCommits.length === 0) {
      patterns.push({
        dayOfWeek: day,
        averageBlocks: 0,
        averageFocusHours: 0,
        commonIdentities: [],
      })
      continue
    }

    const totalBlocks = dayCommits.reduce((sum, c) => sum + c.blocks.length, 0)
    const averageBlocks = totalBlocks / dayCommits.length

    // Calculate average focus hours
    let totalFocusMinutes = 0
    for (const commit of dayCommits) {
      for (const block of commit.blocks) {
        const duration = timeToMinutesLocal(block.end) - timeToMinutesLocal(block.start)
        if (duration >= 60) totalFocusMinutes += duration
      }
    }
    const averageFocusHours = (totalFocusMinutes / dayCommits.length) / 60

    // Find common identities
    const identityCounts = new Map<string, number>()
    for (const commit of dayCommits) {
      for (const block of commit.blocks) {
        const key = block.identity.toLowerCase()
        identityCounts.set(key, (identityCounts.get(key) || 0) + 1)
      }
    }
    const commonIdentities = [...identityCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([identity]) => identity)

    // Find typical start/end times
    const startTimes = dayCommits.flatMap(c => 
      c.blocks.map(b => timeToMinutesLocal(b.start))
    ).sort((a, b) => a - b)
    const endTimes = dayCommits.flatMap(c => 
      c.blocks.map(b => timeToMinutesLocal(b.end))
    ).sort((a, b) => b - a)

    patterns.push({
      dayOfWeek: day,
      averageBlocks: Math.round(averageBlocks * 10) / 10,
      averageFocusHours: Math.round(averageFocusHours * 10) / 10,
      commonIdentities,
      typicalStartTime: startTimes.length > 0 ? minutesToTimeLocal(startTimes[0]) : undefined,
      typicalEndTime: endTimes.length > 0 ? minutesToTimeLocal(endTimes[0]) : undefined,
    })
  }

  return patterns
}







