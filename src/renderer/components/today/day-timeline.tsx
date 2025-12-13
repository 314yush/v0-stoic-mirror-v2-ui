
import type React from "react"

import { useState, useRef, useEffect } from "react"
import type { TimeBlock } from "../../lib/schedule-store"
import { useScheduleStore } from "../../lib/schedule-store"
import { useToastStore } from "../toasts"
import { getTodayDateStrLocal, getDateStrLocal } from "../../lib/date-utils"
import type { GoogleCalendarEvent, GoogleCalendarAttendee } from "../../lib/google-calendar-api"

// Calendar event for display (enriched from Google Calendar)
export interface CalendarEvent {
  id: string
  title: string
  start: string // HH:MM format
  end: string // HH:MM format
  isAllDay?: boolean
  accountEmail?: string
  accountLabel?: string // "Personal" or "Work"
  accountColor?: string // For visual distinction
  // Rich details
  description?: string
  location?: string
  htmlLink?: string // Link to open in Google Calendar
  meetingLink?: string // Google Meet, Zoom, etc.
  meetingProvider?: string // "Google Meet", Zoom", etc.
  attendees?: GoogleCalendarAttendee[]
  organizer?: { email: string; displayName?: string }
}

interface DayTimelineProps {
  blocks: TimeBlock[]
  onUpdateBlock: (id: string, updates: Partial<TimeBlock>) => void
  onDeleteBlock: (id: string) => void
  onAddBlock: (block: Omit<TimeBlock, "id">) => void
  viewingDate?: Date // Date being viewed (for determining if blocks are in past/future)
  isCommitted?: boolean // Whether the day has been committed
  calendarEvents?: CalendarEvent[] // Google Calendar events (context, read-only)
}

// Show full 24 hours (midnight to midnight)
const START_HOUR = 0
const END_HOUR = 23
const HOURS = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => i + START_HOUR)
const PIXELS_PER_HOUR = 55 // Height per hour row
const TOTAL_HEIGHT = (END_HOUR - START_HOUR + 1) * PIXELS_PER_HOUR

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number)
  return hours * 60 + minutes
}

function minutesToTime(minutes: number): string {
  // Round to nearest 5 minutes for cleaner times
  const snappedMinutes = Math.round(minutes / 5) * 5
  const hours = Math.floor(snappedMinutes / 60) % 24 // Handle overflow past midnight
  const mins = snappedMinutes % 60
  return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`
}

function getMinutesFromPosition(y: number): number {
  const minutesFromTop = (y / PIXELS_PER_HOUR) * 60
  // Round to nearest 5 minutes
  return Math.round(minutesFromTop / 5) * 5
}

function getTimeFromPosition(y: number, startHour: number = START_HOUR): string {
  const minutesFromTop = (y / PIXELS_PER_HOUR) * 60
  // Round to nearest 5 minutes for snapping
  const snappedMinutesFromTop = Math.round(minutesFromTop / 5) * 5
  const totalMinutes = startHour * 60 + snappedMinutesFromTop
  return minutesToTime(totalMinutes)
}

function timeToPosition(time: string, startHour: number = START_HOUR): number {
  const minutes = timeToMinutes(time)
  const startMinutes = startHour * 60
  const offsetMinutes = minutes - startMinutes
  return (offsetMinutes / 60) * PIXELS_PER_HOUR
}

export function DayTimeline({ 
  blocks, 
  onUpdateBlock, 
  onDeleteBlock, 
  onAddBlock, 
  viewingDate, 
  isCommitted = false, 
  calendarEvents = [],
}: DayTimelineProps) {
  const [contextMenu, setContextMenu] = useState<{ blockId: string; x: number; y: number } | null>(null)
  const [selectedCalendarEvent, setSelectedCalendarEvent] = useState<CalendarEvent | null>(null)
  const [dragging, setDragging] = useState<{
    type: "create" | "move" | "copy" | "resize-start" | "resize-end"
    hourSlot: number
    startY: number
    currentY?: number // Track current mouse position for copy mode
    blockId?: string
    originalStart?: string
    originalEnd?: string
    copiedBlock?: TimeBlock // Store original block for copy mode
  } | null>(null)
  const [selectedBlocks, setSelectedBlocks] = useState<Set<string>>(new Set())
  const [focusedBlockId, setFocusedBlockId] = useState<string | null>(null) // For keyboard navigation
  const [previewBlock, setPreviewBlock] = useState<{ hour: number; startY: number; currentY: number } | null>(null)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState<string>("")
  const editingInputRef = useRef<HTMLInputElement>(null)
  const timelineRef = useRef<HTMLDivElement>(null)
  const timelineGridRef = useRef<HTMLDivElement>(null) // Ref for the actual grid area
  const { updateBlockCompletion } = useScheduleStore()
  const { addToast } = useToastStore()

  // Update current time every minute
  useEffect(() => {
    const updateTime = () => {
      setCurrentTime(new Date())
    }
    
    // Update immediately
    updateTime()
    
    // Update every minute
    const interval = setInterval(updateTime, 60000)
    
    return () => clearInterval(interval)
  }, [])

  // Handle double-click to edit title
  const handleBlockDoubleClick = (e: React.MouseEvent, blockId: string) => {
    e.stopPropagation()
    const block = blocks.find((b) => b.id === blockId)
    if (block) {
      setEditingBlockId(blockId)
      setEditingTitle(block.identity)
    }
  }

  // Save edited title
  const handleTitleEditSave = () => {
    if (editingBlockId && editingTitle.trim()) {
      onUpdateBlock(editingBlockId, { identity: editingTitle.trim() })
      setEditingBlockId(null)
      setEditingTitle("")
    } else if (editingBlockId) {
      // Revert if empty
      const block = blocks.find((b) => b.id === editingBlockId)
      if (block) {
        setEditingTitle(block.identity)
      }
    }
  }

  // Cancel editing
  const handleTitleEditCancel = () => {
    setEditingBlockId(null)
    setEditingTitle("")
  }

  // Focus input when editing starts
  useEffect(() => {
    if (editingBlockId && editingInputRef.current) {
      editingInputRef.current.focus()
      editingInputRef.current.select()
    }
  }, [editingBlockId])

  // Keyboard navigation and shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if editing
      if (editingBlockId) {
        if (e.key === "Enter") {
          e.preventDefault()
          handleTitleEditSave()
        } else if (e.key === "Escape") {
          e.preventDefault()
          handleTitleEditCancel()
        }
        return
      }

      const isMod = e.metaKey || e.ctrlKey

      // Delete key
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedBlocks.size > 0) {
          selectedBlocks.forEach((id) => onDeleteBlock(id))
          setSelectedBlocks(new Set())
        } else if (focusedBlockId) {
          onDeleteBlock(focusedBlockId)
          setFocusedBlockId(null)
        }
        return
      }

      // Duplicate shortcut (Cmd+D)
      if (isMod && e.key === "d") {
        e.preventDefault()
        if (focusedBlockId) {
          const block = blocks.find((b) => b.id === focusedBlockId)
          if (block) {
            onAddBlock({
              identity: `${block.identity} (copy)`,
              start: block.start,
              end: block.end,
              optional: block.optional || false,
            })
            addToast("Block duplicated")
          }
        }
        return
      }

      // Keyboard navigation (Arrow keys and Tab)
      if (focusedBlockId && !isMod) {
        const currentIndex = blocks.findIndex((b) => b.id === focusedBlockId)
        
        if (e.key === "ArrowDown" || e.key === "Tab") {
          e.preventDefault()
          if (currentIndex < blocks.length - 1) {
            const nextBlock = blocks[currentIndex + 1]
            setFocusedBlockId(nextBlock.id)
            setSelectedBlocks(new Set([nextBlock.id]))
          } else {
            // Wrap to first block
            if (blocks.length > 0) {
              setFocusedBlockId(blocks[0].id)
              setSelectedBlocks(new Set([blocks[0].id]))
            }
          }
          return
        }

        if (e.key === "ArrowUp" || (e.key === "Tab" && e.shiftKey)) {
          e.preventDefault()
          if (currentIndex > 0) {
            const prevBlock = blocks[currentIndex - 1]
            setFocusedBlockId(prevBlock.id)
            setSelectedBlocks(new Set([prevBlock.id]))
          } else {
            // Wrap to last block
            if (blocks.length > 0) {
              const lastBlock = blocks[blocks.length - 1]
              setFocusedBlockId(lastBlock.id)
              setSelectedBlocks(new Set([lastBlock.id]))
            }
          }
          return
        }

        if (e.key === "ArrowLeft") {
          e.preventDefault()
          // Select block that starts before current one (if any)
          const currentBlock = blocks[currentIndex]
          const prevBlocks = blocks
            .map((b, idx) => ({ block: b, idx }))
            .filter(({ block }) => timeToMinutes(block.start) < timeToMinutes(currentBlock.start))
            .sort((a, b) => timeToMinutes(b.block.start) - timeToMinutes(a.block.start))
          
          if (prevBlocks.length > 0) {
            const targetBlock = prevBlocks[0].block
            setFocusedBlockId(targetBlock.id)
            setSelectedBlocks(new Set([targetBlock.id]))
          }
          return
        }

        if (e.key === "ArrowRight") {
          e.preventDefault()
          // Select block that starts after current one (if any)
          const currentBlock = blocks[currentIndex]
          const nextBlocks = blocks
            .map((b, idx) => ({ block: b, idx }))
            .filter(({ block }) => timeToMinutes(block.start) > timeToMinutes(currentBlock.start))
            .sort((a, b) => timeToMinutes(a.block.start) - timeToMinutes(b.block.start))
          
          if (nextBlocks.length > 0) {
            const targetBlock = nextBlocks[0].block
            setFocusedBlockId(targetBlock.id)
            setSelectedBlocks(new Set([targetBlock.id]))
          }
          return
        }
      }

      // Escape key
      if (e.key === "Escape") {
        setSelectedBlocks(new Set())
        setContextMenu(null)
        setFocusedBlockId(null)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [selectedBlocks, onDeleteBlock, editingBlockId, focusedBlockId, blocks, onAddBlock, addToast])

  const handleMouseDownOnTimeline = (e: React.MouseEvent) => {
    if (e.button !== 0) return
    
    // Check if click is on empty timeline space (not on an event or block)
    const target = e.target as HTMLElement
    const isOnEmptySpace = target === timelineGridRef.current || 
      target.classList.contains('timeline-grid') ||
      target.classList.contains('hour-row')
    
    if (!isOnEmptySpace) {
      // Click is on an event/block - just clear selections
      setSelectedBlocks(new Set())
      setFocusedBlockId(null)
      setContextMenu(null)
      return
    }
    
    // Start drag-to-create on empty space - use the grid ref for accurate positioning
    if (timelineGridRef.current) {
      const rect = timelineGridRef.current.getBoundingClientRect()
      const y = e.clientY - rect.top
      const hourSlot = Math.floor(y / PIXELS_PER_HOUR) + START_HOUR
      
      setDragging({
        type: "create",
        hourSlot,
        startY: y,
      })
      setPreviewBlock({
        hour: hourSlot,
        startY: y,
        currentY: y,
      })
    }
    
    // Clear selections
    setSelectedBlocks(new Set())
    setFocusedBlockId(null)
    setContextMenu(null)
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (!timelineGridRef.current) return
    
    const rect = timelineGridRef.current.getBoundingClientRect()
    const currentY = e.clientY - rect.top
    
    if (dragging?.type === "create" && previewBlock) {
      setPreviewBlock({ ...previewBlock, currentY })
    } else if (dragging) {
      if ((dragging.type === "move" || dragging.type === "copy") && dragging.blockId) {
        const block = dragging.type === "copy" && dragging.copiedBlock 
          ? dragging.copiedBlock 
          : blocks.find((b) => b.id === dragging.blockId)
        if (block) {
          const startMinutes = timeToMinutes(block.start)
          const duration = timeToMinutes(block.end) - startMinutes
          const newStartMinutes = START_HOUR * 60 + getMinutesFromPosition(currentY)
          const newStart = minutesToTime(newStartMinutes)
          const newEnd = minutesToTime(newStartMinutes + duration)
          
          if (dragging.type === "copy") {
            // Track current position for copy mode
            setDragging({ ...dragging, currentY })
            // Show preview (could add visual feedback here)
          } else {
            onUpdateBlock(dragging.blockId, { start: newStart, end: newEnd })
          }
        }
      } else if (dragging.type === "resize-start" && dragging.blockId) {
        const block = blocks.find((b) => b.id === dragging.blockId)
        if (block && dragging.originalEnd) {
          const newStart = getTimeFromPosition(currentY)
          if (timeToMinutes(newStart) < timeToMinutes(dragging.originalEnd)) {
            onUpdateBlock(dragging.blockId, { start: newStart })
          }
        }
      } else if (dragging.type === "resize-end" && dragging.blockId) {
        const block = blocks.find((b) => b.id === dragging.blockId)
        if (block && dragging.originalStart) {
          const newEnd = getTimeFromPosition(currentY)
          if (timeToMinutes(newEnd) > timeToMinutes(dragging.originalStart)) {
            onUpdateBlock(dragging.blockId, { end: newEnd })
          }
        }
      }
    }
  }

  const handleMouseUp = () => {
    if (dragging?.type === "create" && previewBlock) {
      const startY = Math.min(previewBlock.startY, previewBlock.currentY)
      const endY = Math.max(previewBlock.startY, previewBlock.currentY)
      const start = getTimeFromPosition(startY)
      const end = getTimeFromPosition(endY)

      // Only create if dragged at least 15 minutes
      const durationMinutes = timeToMinutes(end) - timeToMinutes(start)
      if (durationMinutes >= 15) {
        // Create with temporary name, will be edited immediately
        const tempId = `temp-${Date.now()}`
        onAddBlock({
          identity: "New Block",
          start,
          end,
          optional: false,
        })
        
        // Find the newly created block and start editing its title
        // Use setTimeout to let the state update first
        setTimeout(() => {
          const newBlock = blocks.find(b => 
            b.start === start && b.end === end && b.identity === "New Block"
          )
          if (newBlock) {
            setEditingBlockId(newBlock.id)
            setEditingTitle("New Block")
          }
        }, 50)
        
        addToast("Block created - type a name")
      }
    } else if (dragging?.type === "copy" && dragging.blockId && dragging.copiedBlock && dragging.currentY !== undefined && timelineGridRef.current) {
      // Handle drag-to-copy: create new block at new position
      const block = dragging.copiedBlock
      const startMinutes = timeToMinutes(block.start)
      const duration = timeToMinutes(block.end) - startMinutes
      
      // Use the final currentY position
      const blockStartMinutes = START_HOUR * 60 + getMinutesFromPosition(dragging.currentY)
      const newStart = minutesToTime(blockStartMinutes)
      const newEnd = minutesToTime(blockStartMinutes + duration)
      
      onAddBlock({
        identity: block.identity,
        start: newStart,
        end: newEnd,
        optional: block.optional || false,
      })
      addToast("Block duplicated")
    }
    
    setDragging(null)
    setPreviewBlock(null)
  }

  useEffect(() => {
    if (dragging) {
      window.addEventListener("mousemove", handleMouseMove)
      window.addEventListener("mouseup", handleMouseUp)
      return () => {
        window.removeEventListener("mousemove", handleMouseMove)
        window.removeEventListener("mouseup", handleMouseUp)
      }
    }
  }, [dragging, previewBlock, blocks])

  const handleBlockMouseDown = (e: React.MouseEvent, blockId: string) => {
    if (e.button !== 0) return
    e.stopPropagation()

    // Check if Option/Alt is held for drag-to-copy
    const isCopyMode = e.altKey || (e.metaKey && !e.shiftKey) // Option on Mac, Alt on Windows/Linux
    
    // Handle selection
    if (e.shiftKey) {
      setSelectedBlocks((prev) => {
        const next = new Set(prev)
        if (next.has(blockId)) {
          next.delete(blockId)
        } else {
          next.add(blockId)
        }
        return next
      })
    } else {
      if (!selectedBlocks.has(blockId)) {
        setSelectedBlocks(new Set([blockId]))
      }
    }

    // Set focused block for keyboard navigation
    setFocusedBlockId(blockId)

    // Start dragging
    const block = blocks.find((b) => b.id === blockId)
    if (block && timelineGridRef.current) {
      const rect = timelineGridRef.current.getBoundingClientRect()
      const y = e.clientY - rect.top
      setDragging({
        type: isCopyMode ? "copy" : "move",
        hourSlot: START_HOUR,
        startY: y,
        currentY: y,
        blockId,
        originalStart: block.start,
        originalEnd: block.end,
        copiedBlock: isCopyMode ? { ...block } : undefined,
      })
    }
  }

  const handleResizeHandleMouseDown = (e: React.MouseEvent, blockId: string, type: "resize-start" | "resize-end") => {
    e.stopPropagation()
    const block = blocks.find((b) => b.id === blockId)
    if (block && timelineGridRef.current) {
      const rect = timelineGridRef.current.getBoundingClientRect()
      const y = e.clientY - rect.top
      setDragging({
        type,
        hourSlot: START_HOUR,
        startY: y,
        blockId,
        originalStart: block.start,
        originalEnd: block.end,
      })
    }
  }

  const handleContextMenu = (e: React.MouseEvent, blockId: string) => {
    e.preventDefault()
    e.stopPropagation()
    
    // Get menu dimensions (estimated)
    const menuWidth = 192 // w-48 = 192px
    const menuHeight = 120 // Approximate height
    const padding = 8
    
    // Calculate position to avoid overlapping blocks and screen edges
    let x = e.clientX
    let y = e.clientY
    
    // Prefer positioning to the right, but adjust if too close to edge
    if (x + menuWidth + padding > window.innerWidth) {
      x = e.clientX - menuWidth - padding
    } else {
      x = e.clientX + padding
    }
    
    // Prefer positioning below, but adjust if too close to bottom
    if (y + menuHeight + padding > window.innerHeight) {
      y = e.clientY - menuHeight - padding
    } else {
      y = e.clientY + padding
    }
    
    // Ensure menu stays within viewport
    x = Math.max(padding, Math.min(x, window.innerWidth - menuWidth - padding))
    y = Math.max(padding, Math.min(y, window.innerHeight - menuHeight - padding))
    
    setContextMenu({ blockId, x, y })
  }

  const handleExtend15 = (blockId: string) => {
    const block = blocks.find((b) => b.id === blockId)
    if (block) {
      const endMinutes = timeToMinutes(block.end) + 15
      onUpdateBlock(blockId, { end: minutesToTime(endMinutes) })
    }
    setContextMenu(null)
  }

  const handleToggleOptional = (blockId: string) => {
    const block = blocks.find((b) => b.id === blockId)
    if (block) {
      onUpdateBlock(blockId, { optional: !block.optional })
    }
    setContextMenu(null)
  }

  const handleDuplicate = (blockId: string) => {
    const block = blocks.find((b) => b.id === blockId)
    if (block) {
      // Add duplicate block right after the original (same time, will need manual adjustment)
      onAddBlock({
        identity: `${block.identity} (copy)`,
        start: block.start,
        end: block.end,
        optional: block.optional || false,
      })
      addToast("Block duplicated")
    }
    setContextMenu(null)
  }

  const handleDelete = (blockId: string) => {
    onDeleteBlock(blockId)
    setContextMenu(null)
    setSelectedBlocks((prev) => {
      const next = new Set(prev)
      next.delete(blockId)
      return next
    })
  }

  const getBlockDuration = (start: string, end: string): string => {
    const startMins = timeToMinutes(start)
    const endMins = timeToMinutes(end)
    const duration = endMins - startMins
    const hours = Math.floor(duration / 60)
    const minutes = duration % 60
    if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`
    if (hours > 0) return `${hours}h`
    return `${minutes}m`
  }

  // Calculate current time position on timeline
  const getCurrentTimePosition = () => {
    const now = currentTime
    const currentHour = now.getHours()
    const currentMinute = now.getMinutes()
    
    // Only show indicator when viewing today (not past/future dates)
    if (viewingDate) {
      const now = new Date()
      const todayYear = now.getFullYear()
      const todayMonth = now.getMonth()
      const todayDay = now.getDate()
      
      const viewingYear = viewingDate.getFullYear()
      const viewingMonth = viewingDate.getMonth()
      const viewingDay = viewingDate.getDate()
      
      // Only show time indicator if viewing today (local date comparison)
      if (viewingYear !== todayYear || viewingMonth !== todayMonth || viewingDay !== todayDay) {
        return null
      }
    }
    
    // Check if current time is within visible range
    if (currentHour < START_HOUR || currentHour > END_HOUR) {
      return null
    }
    
    const totalMinutes = currentHour * 60 + currentMinute
    const startMinutes = START_HOUR * 60
    const offsetMinutes = totalMinutes - startMinutes
    const topOffset = (offsetMinutes / 60) * PIXELS_PER_HOUR
    
    return {
      topOffset,
      hour: currentHour,
      minute: currentMinute,
    }
  }

  const currentTimePos = getCurrentTimePosition()

  // Helper to get today's date string in LOCAL timezone (YYYY-MM-DD)
  const getTodayDateStrLocal = () => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // Helper to get date string from Date object in LOCAL timezone (YYYY-MM-DD)
  const getDateStrLocal = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // Check if block's end time has passed
  // Only show Yes/No buttons if:
  // 1. The day has been committed (required!)
  // 2. Viewing today: only if block end time has passed today (same day)
  // 3. Viewing past date: always show (all events have passed)
  // 4. Viewing future date: never show (no events have passed yet)
  const isBlockPastEndTime = (block: TimeBlock): boolean => {
    // CRITICAL: Only show Yes/No if the day has been committed
    if (!isCommitted) {
      return false
    }
    
    if (!viewingDate) {
      return false
    }
    
    // Compare dates using LOCAL timezone strings (not UTC)
    const todayStr = getTodayDateStrLocal()
    const viewingDateStr = getDateStrLocal(viewingDate)
    
    // If viewing a future date, never show buttons (blocks haven't happened yet)
    if (viewingDateStr > todayStr) {
      return false
    }
    
    // If viewing a past date, always show buttons (all blocks have passed)
    if (viewingDateStr < todayStr) {
      return true
    }
    
    // If viewing today, check if block end time has passed on the same day
    // Use LOCAL time consistently - no UTC conversion!
    const [endHour, endMin] = block.end.split(":").map(Number)
    
    // Create block end time using today's LOCAL date with the block's end hour/minute
    const now = new Date() // Current time in local timezone
    const blockEndTime = new Date()
    blockEndTime.setFullYear(now.getFullYear(), now.getMonth(), now.getDate()) // Set to today's LOCAL date
    blockEndTime.setHours(endHour, endMin, 0, 0) // Set to block end time (local time)
    blockEndTime.setSeconds(0, 0) // Ensure seconds and milliseconds are 0
    
    // Compare current LOCAL time with block end LOCAL time
    // Both are in local timezone, so comparison works correctly
    const hasPassed = now.getTime() >= blockEndTime.getTime()
    
    // Debug logging (remove after testing)
    if (import.meta.env.DEV && blocks.indexOf(block) === 0) {
      console.log('Block time check (LOCAL):', {
        blockIdentity: block.identity,
        blockEnd: block.end,
        currentTime: now.toLocaleTimeString(),
        blockEndTime: blockEndTime.toLocaleTimeString(),
        currentDate: getDateStrLocal(now),
        blockEndDate: getDateStrLocal(blockEndTime),
        viewingDate: viewingDateStr,
        todayStr,
        currentTimeMs: now.getTime(),
        blockEndTimeMs: blockEndTime.getTime(),
        hasPassed,
        isCommitted,
      })
    }
    
    return hasPassed
  }

  // Filter blocks that are visible in the timeline range
  const visibleBlocks = blocks.filter((block) => {
    const startMinutes = timeToMinutes(block.start)
    const endMinutes = timeToMinutes(block.end)
    const blockStartHour = Math.floor(startMinutes / 60)
    const blockEndHour = Math.floor(endMinutes / 60)
    // Show block if it overlaps with visible time range
    return blockEndHour >= START_HOUR && blockStartHour <= END_HOUR
  })

  return (
    <>
      <div ref={timelineRef} className="relative timeline-grid rounded-lg border border-border bg-card p-4">
        <div className="flex gap-3">
          {/* Hour labels on the left */}
          <div className="w-16 shrink-0 space-y-0">
            {HOURS.map((hour) => {
              const hourPosition = (hour - START_HOUR) * PIXELS_PER_HOUR
              return (
                <div
                  key={hour}
                  className="absolute text-sm text-muted-foreground pt-1"
                  style={{
                    top: `${hourPosition}px`,
                  }}
                >
                  {hour === 0 ? "12am" : hour < 12 ? `${hour}am` : hour === 12 ? "12pm" : `${hour - 12}pm`}
                </div>
              )
            })}
          </div>
          
          {/* Timeline area */}
          <div
            ref={timelineGridRef}
            className="flex-1 relative cursor-crosshair overflow-visible timeline-grid"
            style={{ height: `${TOTAL_HEIGHT}px`, minHeight: `${TOTAL_HEIGHT}px` }}
            onMouseDown={handleMouseDownOnTimeline}
          >
            {/* Hour indicator lines - also act as drop zones */}
            {HOURS.map((hour) => {
              const hourPosition = (hour - START_HOUR) * PIXELS_PER_HOUR
              return (
                <div
                  key={hour}
                  className="absolute left-0 right-0 hour-row border-t border-border"
                  style={{
                    top: `${hourPosition}px`,
                    height: `${PIXELS_PER_HOUR}px`,
                    borderTopColor: 'rgba(255,255,255,0.15)',
                  }}
                />
              )
            })}
            
            {/* Current time indicator - prominent red line */}
            {currentTimePos && (
              <div
                className="absolute left-0 right-0 z-50 pointer-events-none"
                style={{
                  top: `${currentTimePos.topOffset}px`,
                }}
              >
                {/* Main line */}
                <div className="absolute left-0 right-0 h-0.5 bg-red-500" />
                {/* Left indicator dot */}
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-red-500 rounded-full -ml-1" />
                {/* Time label - centered on the line */}
                <div className="absolute left-1/2 -translate-x-1/2 -top-5 px-2 py-0.5 bg-red-500 text-white text-[10px] font-medium rounded">
                  {currentTimePos.hour.toString().padStart(2, '0')}:{currentTimePos.minute.toString().padStart(2, '0')}
                </div>
              </div>
            )}
            
            {/* Preview block being created */}
            {previewBlock && (
              <div
                className="absolute left-0 right-0 bg-primary/10 border-2 border-dashed border-primary rounded-md z-20"
                style={{
                  top: `${Math.min(previewBlock.startY, previewBlock.currentY)}px`,
                  height: `${Math.abs(previewBlock.currentY - previewBlock.startY)}px`,
                }}
              />
            )}

            {/* Render Google Calendar events (context layer - clickable for details) */}
            {calendarEvents
              .filter((event) => {
                if (event.isAllDay) return false // Skip all-day events for now
                const startMinutes = timeToMinutes(event.start)
                const endMinutes = timeToMinutes(event.end)
                const eventStartHour = Math.floor(startMinutes / 60)
                const eventEndHour = Math.floor(endMinutes / 60)
                return eventEndHour >= START_HOUR && eventStartHour <= END_HOUR
              })
              .map((event) => {
                const startMinutes = timeToMinutes(event.start)
                const endMinutes = timeToMinutes(event.end)
                const duration = endMinutes - startMinutes
                const top = timeToPosition(event.start)
                const height = (duration / 60) * PIXELS_PER_HOUR
                
                // Use account color or default blue
                const borderColor = event.accountColor || '#4285f4'
                const hasMeetingLink = !!event.meetingLink
                
                // Build meeting link with correct account (for Google Meet)
                const getMeetingUrl = () => {
                  if (!event.meetingLink) return null
                  let url = event.meetingLink
                  // Add authuser param for Google Meet to open with correct account
                  if (url.includes('meet.google.com') && event.accountEmail) {
                    const separator = url.includes('?') ? '&' : '?'
                    url = `${url}${separator}authuser=${encodeURIComponent(event.accountEmail)}`
                  }
                  return url
                }
                
                const handleJoinMeeting = (e: React.MouseEvent) => {
                  e.stopPropagation()
                  const url = getMeetingUrl()
                  if (url) {
                    // Use Electron's shell.openExternal to open in default browser
                    if (window.electronAPI?.oauth?.openExternal) {
                      window.electronAPI.oauth.openExternal(url)
                    } else {
                      window.open(url, '_blank')
                    }
                  }
                }
                
                return (
                  <div
                    key={`cal-${event.id}`}
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedCalendarEvent(event)
                    }}
                    className="absolute left-0 right-0 rounded-md px-3 py-1.5 cursor-pointer hover:opacity-90 transition-all group"
                    style={{
                      top: `${top}px`,
                      height: `${Math.max(height, 32)}px`,
                      backgroundColor: `${borderColor}20`,
                      borderLeft: `3px solid ${borderColor}`,
                      zIndex: 5,
                    }}
                  >
                    <div className="flex items-center justify-between gap-2 h-full">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <p className="text-xs font-medium text-muted-foreground truncate">
                          {event.title}
                        </p>
                        {event.attendees && event.attendees.length > 0 && (
                          <span className="text-[10px] text-muted-foreground/70 shrink-0" title={`${event.attendees.length} attendees`}>
                            {event.attendees.length} attendees
                          </span>
                        )}
                        {event.accountLabel && (
                          <span 
                            className="text-[10px] px-1.5 py-0.5 rounded-full shrink-0"
                            style={{ 
                              backgroundColor: `${borderColor}30`,
                              color: borderColor
                            }}
                          >
                            {event.accountLabel}
                          </span>
                        )}
                        <span className="text-[10px] text-muted-foreground/60 shrink-0">
                          {event.start} - {event.end}
                        </span>
                      </div>
                      {/* Join Meeting Button */}
                      {hasMeetingLink && (
                        <button
                          onClick={handleJoinMeeting}
                          className="shrink-0 px-3 py-1 text-[11px] font-medium rounded border border-border bg-secondary text-foreground hover:bg-accent transition-colors"
                          title={`Join ${event.meetingProvider || 'meeting'}`}
                        >
                          Join
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}

            {/* Render identity blocks (commitment layer - interactive) */}
            {visibleBlocks.map((block) => {
              const startMinutes = timeToMinutes(block.start)
              const endMinutes = timeToMinutes(block.end)
              const duration = endMinutes - startMinutes
              
              // Calculate absolute positions from timeline start (6am = 0px)
              const top = timeToPosition(block.start)
              // Height should exactly match the duration - no rounding errors
              const height = (duration / 60) * PIXELS_PER_HOUR
              
              const isSelected = selectedBlocks.has(block.id)
              const isFocused = focusedBlockId === block.id
              
              // Determine if block is short (< 30 minutes)
              const isShortBlock = duration < 30
              // Calculate minimum height needed (in pixels) - approximately 32px for single line
              const minUsableHeight = 32
              
              // Dynamic styling for short blocks
              const blockPadding = isShortBlock ? "px-2 py-1" : "px-3 py-1.5"
              const textSize = isShortBlock ? "text-xs" : "text-sm"
              const buttonPadding = isShortBlock ? "px-2 py-1" : "px-3 py-1.5"
              const buttonText = isShortBlock ? "text-[10px]" : "text-xs"

              return (
                <div
                  key={block.id}
                  onMouseDown={(e) => handleBlockMouseDown(e, block.id)}
                  onContextMenu={(e) => handleContextMenu(e, block.id)}
                  className={`absolute left-0 right-0 rounded-md ${blockPadding} transition-all z-10 ${
                    isSelected
                      ? "ring-2 ring-primary ring-offset-1"
                      : isFocused
                        ? "ring-2 ring-primary/50 ring-offset-1"
                        : block.optional
                          ? "bg-[rgba(243,244,246,0.3)] dark:bg-[rgba(31,41,55,0.3)] border border-dashed border-border hover:bg-[rgba(243,244,246,0.4)] dark:hover:bg-[rgba(31,41,55,0.4)]"
                          : "bg-[rgba(34,197,94,0.3)] dark:bg-[rgba(34,197,94,0.3)] border border-primary/50 hover:bg-[rgba(34,197,94,0.4)] dark:hover:bg-[rgba(34,197,94,0.4)] dark:border-primary/60"
                  } ${isSelected ? "cursor-grabbing" : "cursor-grab"}`}
                  style={{
                    top: `${top}px`,
                    height: `${height}px`, // Always use exact calculated height to accurately reflect duration
                    minHeight: height < minUsableHeight ? `${minUsableHeight}px` : undefined, // Only enforce minimum if very short
                    // Ensure block extends to exact end position
                    maxHeight: "none",
                  }}
                >
                  {/* Resize handles */}
                  <div
                    className="absolute top-0 left-0 right-0 h-2 cursor-ns-resize hover:bg-primary/30"
                    onMouseDown={(e) => handleResizeHandleMouseDown(e, block.id, "resize-start")}
                  />
                  <div
                    className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize hover:bg-primary/30"
                    onMouseDown={(e) => handleResizeHandleMouseDown(e, block.id, "resize-end")}
                  />

                  <div className={`flex items-center justify-between h-full gap-2`}>
                    <div className="flex-1 min-w-0 flex items-center gap-2">
                      {editingBlockId === block.id ? (
                        <input
                          ref={editingInputRef}
                          type="text"
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          onBlur={handleTitleEditSave}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault()
                              handleTitleEditSave()
                            } else if (e.key === "Escape") {
                              e.preventDefault()
                              handleTitleEditCancel()
                            }
                          }}
                          className={`${textSize} font-medium text-foreground bg-background border border-primary rounded px-2 py-1 w-full`}
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <p 
                            className={`${textSize} font-medium text-foreground truncate cursor-text`}
                            onDoubleClick={(e) => handleBlockDoubleClick(e, block.id)}
                            title="Double-click to edit"
                          >
                            {block.identity}
                          </p>
                          <span className={`${isShortBlock ? 'text-[10px]' : 'text-xs'} text-muted-foreground shrink-0`}>
                            {getBlockDuration(block.start, block.end)}
                          </span>
                        </div>
                      )}
                    </div>
                    {/* Completion buttons - only show after block end time */}
                    {(() => {
                      const shouldShow = isBlockPastEndTime(block)
                      // Debug: Log button visibility (remove after testing)
                      if (import.meta.env.DEV && blocks.indexOf(block) === 0) {
                        console.log('First block button visibility check:', {
                          shouldShow,
                          blockIdentity: block.identity,
                          blockEnd: block.end,
                          viewingDate: viewingDate ? getDateStrLocal(viewingDate) : null,
                        })
                      }
                      return shouldShow ? (
                        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => {
                              updateBlockCompletion(block.id, true)
                              onUpdateBlock(block.id, { completed: true })
                              addToast(`"${block.identity}" marked as completed`, "success")
                            }}
                            className={`${buttonPadding} ${buttonText} font-medium rounded transition-all ${
                              block.completed === true
                                ? "bg-green-500/20 text-green-400 border-2 border-green-500/50 shadow-sm"
                                : "bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80 border border-border"
                            }`}
                          >
                            {block.completed === true ? "✓ Yes" : "Yes"}
                          </button>
                          <button
                            onClick={() => {
                              updateBlockCompletion(block.id, false)
                              onUpdateBlock(block.id, { completed: false })
                              addToast(`"${block.identity}" marked as not completed`, "info")
                            }}
                            className={`${buttonPadding} ${buttonText} font-medium rounded transition-all ${
                              block.completed === false
                                ? "bg-red-500/20 text-red-400 border-2 border-red-500/50 shadow-sm"
                                : "bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80 border border-border"
                            }`}
                          >
                            {block.completed === false ? "✗ No" : "No"}
                          </button>
                        </div>
                      ) : null
                    })()}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {selectedBlocks.size > 0 && (
          <div className="mt-4 px-4 py-2 bg-primary/10 border border-primary/50 rounded-md text-sm text-foreground">
            {selectedBlocks.size} block{selectedBlocks.size > 1 ? "s" : ""} selected. Press Delete to remove.
          </div>
        )}
      </div>

      {contextMenu && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setContextMenu(null)}
            onContextMenu={(e) => {
              e.preventDefault()
              setContextMenu(null)
            }}
          />
          <div
            className="fixed z-50 w-48 bg-popover/95 backdrop-blur-sm border border-border rounded-lg shadow-xl py-1.5 animate-in fade-in zoom-in-95"
            style={{ 
              left: `${contextMenu.x}px`, 
              top: `${contextMenu.y}px`,
            }}
          >
            <button
              onClick={() => {
                handleExtend15(contextMenu.blockId)
                setContextMenu(null)
              }}
              className="w-full px-4 py-2.5 text-left text-sm font-medium text-foreground hover:bg-accent/50 transition-colors flex items-center gap-2"
            >
              <span className="text-base">⏱️</span>
              <span>Extend 15m</span>
            </button>
            <button
              onClick={() => {
                handleToggleOptional(contextMenu.blockId)
                setContextMenu(null)
              }}
              className="w-full px-4 py-2.5 text-left text-sm font-medium text-foreground hover:bg-accent/50 transition-colors flex items-center gap-2"
            >
              <span className="text-base">
                {blocks.find((b) => b.id === contextMenu.blockId)?.optional ? "✓" : "○"}
              </span>
              <span>
                {blocks.find((b) => b.id === contextMenu.blockId)?.optional
                  ? "Mark as Necessary"
                  : "Mark as Optional"}
              </span>
            </button>
            <button
              onClick={() => {
                handleDuplicate(contextMenu.blockId)
                setContextMenu(null)
              }}
              className="w-full px-4 py-2.5 text-left text-sm font-medium text-foreground hover:bg-accent/50 transition-colors flex items-center gap-2"
            >
              <span className="text-base">📋</span>
              <span>Duplicate</span>
            </button>
            <div className="my-1.5 border-t border-border/50" />
            <button
              onClick={() => {
                handleDelete(contextMenu.blockId)
                setContextMenu(null)
              }}
              className="w-full px-4 py-2.5 text-left text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors flex items-center gap-2"
            >
              <span className="text-base">🗑️</span>
              <span>Delete</span>
            </button>
          </div>
        </>
      )}

      {/* Calendar Event Details Modal */}
      {selectedCalendarEvent && (
        <>
          <div 
            className="fixed inset-0 bg-black/50 z-40" 
            onClick={() => setSelectedCalendarEvent(null)}
          />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-card border border-border rounded-lg shadow-xl animate-in fade-in zoom-in-95">
            {/* Header */}
            <div className="flex items-start justify-between p-4 border-b border-border">
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-foreground truncate">
                  {selectedCalendarEvent.title}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedCalendarEvent.start} - {selectedCalendarEvent.end}
                  {selectedCalendarEvent.accountLabel && (
                    <span 
                      className="ml-2 text-xs px-2 py-0.5 rounded-full"
                      style={{ 
                        backgroundColor: `${selectedCalendarEvent.accountColor || '#4285f4'}20`,
                        color: selectedCalendarEvent.accountColor || '#4285f4'
                      }}
                    >
                      {selectedCalendarEvent.accountLabel}
                    </span>
                  )}
                </p>
              </div>
              <button
                onClick={() => setSelectedCalendarEvent(null)}
                className="text-muted-foreground hover:text-foreground p-1"
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
              {/* Meeting Link */}
              {selectedCalendarEvent.meetingLink && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-foreground">
                    {selectedCalendarEvent.meetingProvider || 'Video Call'}
                  </h4>
                  <button
                    onClick={() => {
                      let url = selectedCalendarEvent.meetingLink!
                      // Add authuser param for Google Meet to open with correct account
                      if (url.includes('meet.google.com') && selectedCalendarEvent.accountEmail) {
                        const separator = url.includes('?') ? '&' : '?'
                        url = `${url}${separator}authuser=${encodeURIComponent(selectedCalendarEvent.accountEmail)}`
                      }
                      // Use Electron's shell.openExternal to open in default browser
                      if (window.electronAPI?.oauth?.openExternal) {
                        window.electronAPI.oauth.openExternal(url)
                      } else {
                        window.open(url, '_blank')
                      }
                    }}
                    className="w-full px-4 py-2.5 bg-secondary border border-border text-foreground rounded-md text-center font-medium hover:bg-accent transition-colors"
                  >
                    Join Meeting
                  </button>
                  {selectedCalendarEvent.accountEmail && (
                    <p className="text-xs text-muted-foreground text-center">
                      Opens with {selectedCalendarEvent.accountEmail}
                    </p>
                  )}
                </div>
              )}

              {/* Location */}
              {selectedCalendarEvent.location && (
                <div className="space-y-1">
                  <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                    📍 Location
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {selectedCalendarEvent.location}
                  </p>
                </div>
              )}

              {/* Organizer */}
              {selectedCalendarEvent.organizer && (
                <div className="space-y-1">
                  <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                    👤 Organizer
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {selectedCalendarEvent.organizer.displayName || selectedCalendarEvent.organizer.email}
                  </p>
                </div>
              )}

              {/* Attendees */}
              {selectedCalendarEvent.attendees && selectedCalendarEvent.attendees.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                    👥 Attendees ({selectedCalendarEvent.attendees.length})
                  </h4>
                  <div className="space-y-1.5 max-h-32 overflow-y-auto">
                    {selectedCalendarEvent.attendees.map((attendee, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm">
                        <span className={`w-2 h-2 rounded-full ${
                          attendee.responseStatus === 'accepted' ? 'bg-green-500' :
                          attendee.responseStatus === 'declined' ? 'bg-red-500' :
                          attendee.responseStatus === 'tentative' ? 'bg-yellow-500' :
                          'bg-gray-400'
                        }`} />
                        <span className="text-muted-foreground truncate">
                          {attendee.displayName || attendee.email}
                          {attendee.organizer && <span className="text-xs ml-1">(organizer)</span>}
                          {attendee.self && <span className="text-xs ml-1 text-primary">(you)</span>}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" /> Accepted</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500" /> Maybe</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> Declined</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-400" /> Pending</span>
                  </div>
                </div>
              )}

              {/* Description */}
              {selectedCalendarEvent.description && (
                <div className="space-y-1">
                  <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                    📝 Description
                  </h4>
                  <div 
                    className="text-sm text-muted-foreground whitespace-pre-wrap bg-secondary/30 p-3 rounded-md max-h-32 overflow-y-auto"
                    dangerouslySetInnerHTML={{ __html: selectedCalendarEvent.description }}
                  />
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-4 border-t border-border">
              <button
                onClick={() => setSelectedCalendarEvent(null)}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Close
              </button>
              {selectedCalendarEvent.htmlLink && (
                <a
                  href={selectedCalendarEvent.htmlLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:text-primary/80 flex items-center gap-1"
                >
                  Open in Google Calendar →
                </a>
              )}
            </div>
          </div>
        </>
      )}
    </>
  )
}