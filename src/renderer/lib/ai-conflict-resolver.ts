/**
 * AI Conflict Resolver
 * Detects and resolves scheduling conflicts between identity blocks
 * and calendar events
 */

import type { TimeBlock } from './schedule-store'
import type { CalendarEvent } from '../components/today/day-timeline'

export interface Conflict {
  id: string
  type: 'overlap' | 'insufficient-time' | 'back-to-back' | 'overbooked'
  severity: 'critical' | 'warning' | 'info'
  description: string
  blocks: TimeBlock[]
  events: CalendarEvent[]
  suggestedResolutions: ConflictResolution[]
}

export interface ConflictResolution {
  id: string
  action: 'move' | 'shrink' | 'remove' | 'merge' | 'split'
  description: string
  preview: {
    before: { blockId: string; start: string; end: string }
    after: { blockId: string; start: string; end: string }
  }
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

/**
 * Check if two time ranges overlap
 */
function doRangesOverlap(
  start1: string, end1: string,
  start2: string, end2: string
): boolean {
  const s1 = timeToMinutes(start1)
  const e1 = timeToMinutes(end1)
  const s2 = timeToMinutes(start2)
  const e2 = timeToMinutes(end2)
  
  return !(e1 <= s2 || e2 <= s1)
}

/**
 * Calculate overlap duration between two time ranges
 */
function getOverlapMinutes(
  start1: string, end1: string,
  start2: string, end2: string
): number {
  const s1 = timeToMinutes(start1)
  const e1 = timeToMinutes(end1)
  const s2 = timeToMinutes(start2)
  const e2 = timeToMinutes(end2)
  
  const overlapStart = Math.max(s1, s2)
  const overlapEnd = Math.min(e1, e2)
  
  return Math.max(0, overlapEnd - overlapStart)
}

/**
 * Detect all conflicts in a schedule
 */
export function detectConflicts(
  blocks: TimeBlock[],
  calendarEvents: CalendarEvent[]
): Conflict[] {
  const conflicts: Conflict[] = []
  
  // Sort by start time
  const sortedBlocks = [...blocks].sort((a, b) => 
    timeToMinutes(a.start) - timeToMinutes(b.start)
  )
  const sortedEvents = [...calendarEvents].sort((a, b) => 
    timeToMinutes(a.start) - timeToMinutes(b.start)
  )
  
  // 1. Check for block-to-block overlaps
  for (let i = 0; i < sortedBlocks.length; i++) {
    for (let j = i + 1; j < sortedBlocks.length; j++) {
      const block1 = sortedBlocks[i]
      const block2 = sortedBlocks[j]
      
      if (doRangesOverlap(block1.start, block1.end, block2.start, block2.end)) {
        const overlapMins = getOverlapMinutes(block1.start, block1.end, block2.start, block2.end)
        
        conflicts.push({
          id: `overlap-${block1.id}-${block2.id}`,
          type: 'overlap',
          severity: overlapMins > 30 ? 'critical' : 'warning',
          description: `"${block1.identity}" and "${block2.identity}" overlap by ${overlapMins} minutes`,
          blocks: [block1, block2],
          events: [],
          suggestedResolutions: generateBlockOverlapResolutions(block1, block2),
        })
      }
    }
  }
  
  // 2. Check for block-to-event overlaps
  for (const block of sortedBlocks) {
    for (const event of sortedEvents) {
      if (doRangesOverlap(block.start, block.end, event.start, event.end)) {
        const overlapMins = getOverlapMinutes(block.start, block.end, event.start, event.end)
        
        conflicts.push({
          id: `event-conflict-${block.id}-${event.id}`,
          type: 'overlap',
          severity: 'critical', // Calendar events are fixed
          description: `"${block.identity}" conflicts with calendar event "${event.title}"`,
          blocks: [block],
          events: [event],
          suggestedResolutions: generateEventConflictResolutions(block, event),
        })
      }
    }
  }
  
  // 3. Check for back-to-back blocks without breaks
  for (let i = 1; i < sortedBlocks.length; i++) {
    const prevBlock = sortedBlocks[i - 1]
    const currBlock = sortedBlocks[i]
    const gap = timeToMinutes(currBlock.start) - timeToMinutes(prevBlock.end)
    
    if (gap >= 0 && gap < 5) { // Less than 5 min gap
      conflicts.push({
        id: `back-to-back-${prevBlock.id}-${currBlock.id}`,
        type: 'back-to-back',
        severity: 'info',
        description: `No break between "${prevBlock.identity}" and "${currBlock.identity}"`,
        blocks: [prevBlock, currBlock],
        events: [],
        suggestedResolutions: generateBufferResolutions(prevBlock, currBlock),
      })
    }
  }
  
  // 4. Check for overbooked days
  const totalBlockMinutes = sortedBlocks.reduce((sum, b) => 
    sum + (timeToMinutes(b.end) - timeToMinutes(b.start)), 0
  )
  const totalEventMinutes = sortedEvents.reduce((sum, e) => 
    sum + (timeToMinutes(e.end) - timeToMinutes(e.start)), 0
  )
  const dayLength = 17 * 60 // 17 hours (6am to 11pm)
  
  if (totalBlockMinutes + totalEventMinutes > dayLength) {
    conflicts.push({
      id: 'overbooked-day',
      type: 'overbooked',
      severity: 'warning',
      description: `Day is overbooked by ${Math.round((totalBlockMinutes + totalEventMinutes - dayLength) / 60 * 10) / 10} hours`,
      blocks: sortedBlocks,
      events: sortedEvents,
      suggestedResolutions: [{
        id: 'reduce-blocks',
        action: 'remove',
        description: 'Consider removing or shortening some identity blocks',
        preview: {
          before: { blockId: '', start: '', end: '' },
          after: { blockId: '', start: '', end: '' },
        },
      }],
    })
  }
  
  // Sort by severity
  const severityOrder = { critical: 0, warning: 1, info: 2 }
  conflicts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])
  
  return conflicts
}

/**
 * Generate resolutions for block-to-block overlaps
 */
function generateBlockOverlapResolutions(
  block1: TimeBlock,
  block2: TimeBlock
): ConflictResolution[] {
  const resolutions: ConflictResolution[] = []
  const s1 = timeToMinutes(block1.start)
  const e1 = timeToMinutes(block1.end)
  const s2 = timeToMinutes(block2.start)
  const e2 = timeToMinutes(block2.end)
  
  // Option 1: Move block2 after block1
  resolutions.push({
    id: 'move-block2-after',
    action: 'move',
    description: `Move "${block2.identity}" to start after "${block1.identity}"`,
    preview: {
      before: { blockId: block2.id, start: block2.start, end: block2.end },
      after: { 
        blockId: block2.id, 
        start: block1.end, 
        end: minutesToTime(timeToMinutes(block1.end) + (e2 - s2)),
      },
    },
  })
  
  // Option 2: Shrink block1 to end where block2 starts
  if (s2 > s1) {
    resolutions.push({
      id: 'shrink-block1',
      action: 'shrink',
      description: `Shorten "${block1.identity}" to end at ${block2.start}`,
      preview: {
        before: { blockId: block1.id, start: block1.start, end: block1.end },
        after: { blockId: block1.id, start: block1.start, end: block2.start },
      },
    })
  }
  
  // Option 3: Merge if same identity
  if (block1.identity.toLowerCase() === block2.identity.toLowerCase()) {
    resolutions.push({
      id: 'merge-blocks',
      action: 'merge',
      description: `Merge both "${block1.identity}" blocks into one`,
      preview: {
        before: { blockId: block1.id, start: block1.start, end: block1.end },
        after: { 
          blockId: block1.id, 
          start: minutesToTime(Math.min(s1, s2)), 
          end: minutesToTime(Math.max(e1, e2)),
        },
      },
    })
  }
  
  return resolutions
}

/**
 * Generate resolutions for block-to-event conflicts
 */
function generateEventConflictResolutions(
  block: TimeBlock,
  event: CalendarEvent
): ConflictResolution[] {
  const resolutions: ConflictResolution[] = []
  const blockStart = timeToMinutes(block.start)
  const blockEnd = timeToMinutes(block.end)
  const eventStart = timeToMinutes(event.start)
  const eventEnd = timeToMinutes(event.end)
  const blockDuration = blockEnd - blockStart
  
  // Option 1: Move block before the event
  if (eventStart >= blockDuration + 360) { // If there's room before (after 6am)
    resolutions.push({
      id: 'move-before-event',
      action: 'move',
      description: `Move "${block.identity}" to before "${event.title}"`,
      preview: {
        before: { blockId: block.id, start: block.start, end: block.end },
        after: { 
          blockId: block.id, 
          start: minutesToTime(eventStart - blockDuration - 10), 
          end: minutesToTime(eventStart - 10),
        },
      },
    })
  }
  
  // Option 2: Move block after the event
  if (eventEnd + blockDuration <= 1380) { // If there's room after (before 11pm)
    resolutions.push({
      id: 'move-after-event',
      action: 'move',
      description: `Move "${block.identity}" to after "${event.title}"`,
      preview: {
        before: { blockId: block.id, start: block.start, end: block.end },
        after: { 
          blockId: block.id, 
          start: minutesToTime(eventEnd + 10), 
          end: minutesToTime(eventEnd + blockDuration + 10),
        },
      },
    })
  }
  
  // Option 3: Split the block around the event
  const beforeDuration = eventStart - blockStart
  const afterDuration = blockEnd - eventEnd
  
  if (beforeDuration >= 15 || afterDuration >= 15) {
    resolutions.push({
      id: 'split-around-event',
      action: 'split',
      description: `Split "${block.identity}" around "${event.title}"`,
      preview: {
        before: { blockId: block.id, start: block.start, end: block.end },
        after: { 
          blockId: block.id, 
          start: block.start, 
          end: minutesToTime(eventStart - 5),
        },
      },
    })
  }
  
  // Option 4: Remove the block
  resolutions.push({
    id: 'remove-block',
    action: 'remove',
    description: `Remove "${block.identity}" (calendar event takes priority)`,
    preview: {
      before: { blockId: block.id, start: block.start, end: block.end },
      after: { blockId: block.id, start: '', end: '' },
    },
  })
  
  return resolutions
}

/**
 * Generate resolutions for back-to-back blocks
 */
function generateBufferResolutions(
  prevBlock: TimeBlock,
  currBlock: TimeBlock
): ConflictResolution[] {
  const prevEnd = timeToMinutes(prevBlock.end)
  const currStart = timeToMinutes(currBlock.start)
  const currEnd = timeToMinutes(currBlock.end)
  const currDuration = currEnd - currStart
  
  return [
    {
      id: 'add-10min-buffer',
      action: 'move',
      description: 'Add 10-minute buffer by moving the second block',
      preview: {
        before: { blockId: currBlock.id, start: currBlock.start, end: currBlock.end },
        after: { 
          blockId: currBlock.id, 
          start: minutesToTime(prevEnd + 10), 
          end: minutesToTime(prevEnd + 10 + currDuration),
        },
      },
    },
    {
      id: 'shrink-prev-5min',
      action: 'shrink',
      description: 'Shorten the first block by 5 minutes',
      preview: {
        before: { blockId: prevBlock.id, start: prevBlock.start, end: prevBlock.end },
        after: { 
          blockId: prevBlock.id, 
          start: prevBlock.start, 
          end: minutesToTime(prevEnd - 5),
        },
      },
    },
  ]
}

/**
 * Apply a conflict resolution
 */
export function applyResolution(
  blocks: TimeBlock[],
  resolution: ConflictResolution
): TimeBlock[] {
  if (resolution.action === 'remove') {
    return blocks.filter(b => b.id !== resolution.preview.before.blockId)
  }
  
  return blocks.map(block => {
    if (block.id === resolution.preview.before.blockId) {
      return {
        ...block,
        start: resolution.preview.after.start || block.start,
        end: resolution.preview.after.end || block.end,
      }
    }
    return block
  })
}

/**
 * Get conflict summary for display
 */
export function getConflictSummary(conflicts: Conflict[]): {
  critical: number
  warnings: number
  info: number
  message: string
} {
  const critical = conflicts.filter(c => c.severity === 'critical').length
  const warnings = conflicts.filter(c => c.severity === 'warning').length
  const info = conflicts.filter(c => c.severity === 'info').length
  
  let message = ''
  if (critical > 0) {
    message = `${critical} critical conflict${critical > 1 ? 's' : ''} need attention`
  } else if (warnings > 0) {
    message = `${warnings} warning${warnings > 1 ? 's' : ''} to review`
  } else if (info > 0) {
    message = `${info} suggestion${info > 1 ? 's' : ''} to optimize`
  } else {
    message = 'No conflicts detected'
  }
  
  return { critical, warnings, info, message }
}




