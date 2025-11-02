
import type React from "react"

import { useState, useRef, useEffect } from "react"
import type { TimeBlock } from "../../lib/schedule-store"
import { useScheduleStore } from "../../lib/schedule-store"
import { useToastStore } from "../toasts"

interface DayTimelineProps {
  blocks: TimeBlock[]
  onUpdateBlock: (id: string, updates: Partial<TimeBlock>) => void
  onDeleteBlock: (id: string) => void
  onAddBlock: (block: Omit<TimeBlock, "id">) => void
}

// Show hours from early morning to late night (6am to 11pm for typical day view)
const START_HOUR = 6
const END_HOUR = 23
const HOURS = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => i + START_HOUR)
const PIXELS_PER_HOUR = 60
const TOTAL_HEIGHT = (END_HOUR - START_HOUR + 1) * PIXELS_PER_HOUR

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number)
  return hours * 60 + minutes
}

function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`
}

function getMinutesFromPosition(y: number): number {
  const minutesFromTop = (y / PIXELS_PER_HOUR) * 60
  // Round to nearest 15 minutes
  return Math.round(minutesFromTop / 15) * 15
}

function getTimeFromPosition(y: number, startHour: number = START_HOUR): string {
  const minutesFromTop = (y / PIXELS_PER_HOUR) * 60
  const totalMinutes = startHour * 60 + minutesFromTop
  return minutesToTime(totalMinutes)
}

function timeToPosition(time: string, startHour: number = START_HOUR): number {
  const minutes = timeToMinutes(time)
  const startMinutes = startHour * 60
  const offsetMinutes = minutes - startMinutes
  return (offsetMinutes / 60) * PIXELS_PER_HOUR
}

export function DayTimeline({ blocks, onUpdateBlock, onDeleteBlock, onAddBlock }: DayTimelineProps) {
  const [contextMenu, setContextMenu] = useState<{ blockId: string; x: number; y: number } | null>(null)
  const [dragging, setDragging] = useState<{
    type: "create" | "move" | "resize-start" | "resize-end"
    hourSlot: number
    startY: number
    blockId?: string
    originalStart?: string
    originalEnd?: string
  } | null>(null)
  const [selectedBlocks, setSelectedBlocks] = useState<Set<string>>(new Set())
  const [previewBlock, setPreviewBlock] = useState<{ hour: number; startY: number; currentY: number } | null>(null)
  const [currentTime, setCurrentTime] = useState(new Date())
  const timelineRef = useRef<HTMLDivElement>(null)
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

  // Delete selected blocks on Delete key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedBlocks.size > 0) {
          selectedBlocks.forEach((id) => onDeleteBlock(id))
          setSelectedBlocks(new Set())
        }
      } else if (e.key === "Escape") {
        setSelectedBlocks(new Set())
        setContextMenu(null)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [selectedBlocks, onDeleteBlock])

  const handleMouseDownOnTimeline = (e: React.MouseEvent) => {
    if (e.button !== 0) return // Only left click
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const y = e.clientY - rect.top
    // Calculate which hour this is in
    const hour = Math.floor(y / PIXELS_PER_HOUR) + START_HOUR
    setDragging({ type: "create", hourSlot: hour, startY: y })
    setPreviewBlock({ hour: START_HOUR, startY: y, currentY: y })
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (!timelineRef.current) return
    
    const rect = timelineRef.current.getBoundingClientRect()
    const currentY = e.clientY - rect.top
    
    if (dragging?.type === "create" && previewBlock) {
      setPreviewBlock({ ...previewBlock, currentY })
    } else if (dragging) {
      if (dragging.type === "move" && dragging.blockId) {
        const block = blocks.find((b) => b.id === dragging.blockId)
        if (block) {
          const startMinutes = timeToMinutes(block.start)
          const duration = timeToMinutes(block.end) - startMinutes
          const newStartMinutes = START_HOUR * 60 + getMinutesFromPosition(currentY)
          const newStart = minutesToTime(newStartMinutes)
          const newEnd = minutesToTime(newStartMinutes + duration)
          onUpdateBlock(dragging.blockId, { start: newStart, end: newEnd })
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

      if (timeToMinutes(end) > timeToMinutes(start)) {
        onAddBlock({
          identity: "New Block",
          start,
          end,
          optional: false,
        })
      }
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

    // Start dragging
    const block = blocks.find((b) => b.id === blockId)
    if (block && timelineRef.current) {
      const rect = timelineRef.current.getBoundingClientRect()
      const y = e.clientY - rect.top
      setDragging({
        type: "move",
        hourSlot: START_HOUR,
        startY: y,
        blockId,
        originalStart: block.start,
        originalEnd: block.end,
      })
    }
  }

  const handleResizeHandleMouseDown = (e: React.MouseEvent, blockId: string, type: "resize-start" | "resize-end") => {
    e.stopPropagation()
    const block = blocks.find((b) => b.id === blockId)
    if (block && timelineRef.current) {
      const rect = timelineRef.current.getBoundingClientRect()
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

  // Check if block's end time has passed
  const isBlockPastEndTime = (block: TimeBlock): boolean => {
    const [endHour, endMin] = block.end.split(":").map(Number)
    const blockEndTime = new Date(currentTime)
    blockEndTime.setHours(endHour, endMin, 0, 0)
    return currentTime >= blockEndTime
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
            className="flex-1 relative cursor-crosshair overflow-visible"
            style={{ height: `${TOTAL_HEIGHT}px`, minHeight: `${TOTAL_HEIGHT}px` }}
            onMouseDown={handleMouseDownOnTimeline}
          >
            {/* Hour indicator lines only */}
            {HOURS.map((hour) => {
              const hourPosition = (hour - START_HOUR) * PIXELS_PER_HOUR
              return (
                <div
                  key={hour}
                  className="absolute left-0 right-0 border-t border-border/40"
                  style={{
                    top: `${hourPosition}px`,
                    borderTopWidth: '0.5px',
                  }}
                />
              )
            })}
            
            {/* Current time indicator - red line */}
            {currentTimePos && (
              <div
                className="absolute left-0 right-0 z-50"
                style={{
                  top: `${currentTimePos.topOffset}px`,
                }}
              >
                <div className="absolute left-0 right-0 h-0.5 bg-red-500" />
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-red-500 rounded-full -ml-1" />
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

            {/* Render all blocks */}
            {visibleBlocks.map((block) => {
              const startMinutes = timeToMinutes(block.start)
              const endMinutes = timeToMinutes(block.end)
              const duration = endMinutes - startMinutes
              
              // Calculate absolute positions from timeline start (6am = 0px)
              const top = timeToPosition(block.start)
              // Height should exactly match the duration - no rounding errors
              const height = (duration / 60) * PIXELS_PER_HOUR
              
              
              const isSelected = selectedBlocks.has(block.id)

              return (
                <div
                  key={block.id}
                  onMouseDown={(e) => handleBlockMouseDown(e, block.id)}
                  onContextMenu={(e) => handleContextMenu(e, block.id)}
                  className={`absolute left-0 right-0 rounded-md px-3 py-2 transition-all z-10 ${
                    isSelected
                      ? "ring-2 ring-primary ring-offset-1"
                      : block.optional
                        ? "bg-[rgba(243,244,246,0.3)] dark:bg-[rgba(31,41,55,0.3)] border border-dashed border-border hover:bg-[rgba(243,244,246,0.4)] dark:hover:bg-[rgba(31,41,55,0.4)]"
                        : "bg-[rgba(34,197,94,0.3)] dark:bg-[rgba(34,197,94,0.3)] border border-primary/50 hover:bg-[rgba(34,197,94,0.4)] dark:hover:bg-[rgba(34,197,94,0.4)] dark:border-primary/60"
                  } ${isSelected ? "cursor-grabbing" : "cursor-grab"}`}
                  style={{
                    top: `${top}px`,
                    height: `${Math.max(height, 30)}px`,
                    minHeight: "30px",
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

                  <div className="flex items-start justify-between h-full gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{block.identity}</p>
                      <p className="text-xs text-muted-foreground">
                        {block.start} - {block.end} ({getBlockDuration(block.start, block.end)})
                      </p>
                    </div>
                    {/* Completion buttons - only show after block end time */}
                    {isBlockPastEndTime(block) && (
                      <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => {
                            updateBlockCompletion(block.id, true)
                            onUpdateBlock(block.id, { completed: true })
                            addToast(`"${block.identity}" marked as completed`, "success")
                          }}
                          className={`px-3 py-1.5 text-xs font-medium rounded transition-all ${
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
                          className={`px-3 py-1.5 text-xs font-medium rounded transition-all ${
                            block.completed === false
                              ? "bg-red-500/20 text-red-400 border-2 border-red-500/50 shadow-sm"
                              : "bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80 border border-border"
                          }`}
                        >
                          {block.completed === false ? "✗ No" : "No"}
                        </button>
                      </div>
                    )}
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
    </>
  )
}