
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

const HOURS = Array.from({ length: 24 }, (_, i) => i) // 12am to 11pm (all 24 hours)
const PIXELS_PER_HOUR = 60

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

function getTimeFromPosition(y: number, hour: number): string {
  const minutesInHour = getMinutesFromPosition(y)
  const totalMinutes = hour * 60 + minutesInHour
  return minutesToTime(totalMinutes)
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

  const handleMouseDownOnSlot = (e: React.MouseEvent, hour: number) => {
    if (e.button !== 0) return // Only left click
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const y = e.clientY - rect.top
    setDragging({ type: "create", hourSlot: hour, startY: y })
    setPreviewBlock({ hour, startY: y, currentY: y })
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (!timelineRef.current) return

    if (dragging?.type === "create" && previewBlock) {
      const hourRow = timelineRef.current.querySelector(`[data-hour="${previewBlock.hour}"]`) as HTMLElement
      if (hourRow) {
        const rect = hourRow.getBoundingClientRect()
        const y = e.clientY - rect.top
        setPreviewBlock({ ...previewBlock, currentY: y })
      }
    } else if (dragging) {
      const hourRow = timelineRef.current.querySelector(`[data-hour="${dragging.hourSlot}"]`) as HTMLElement
      if (hourRow) {
        const rect = hourRow.getBoundingClientRect()
        const currentY = e.clientY - rect.top

        if (dragging.type === "create") {
          // Preview the block being created
        } else if (dragging.type === "move" && dragging.blockId) {
          const block = blocks.find((b) => b.id === dragging.blockId)
          if (block) {
            const startMinutes = timeToMinutes(block.start)
            const duration = timeToMinutes(block.end) - startMinutes
            const newStartMinutes = getMinutesFromPosition(currentY) + dragging.hourSlot * 60
            const newStart = minutesToTime(newStartMinutes)
            const newEnd = minutesToTime(newStartMinutes + duration)
            onUpdateBlock(dragging.blockId, { start: newStart, end: newEnd })
          }
        } else if (dragging.type === "resize-start" && dragging.blockId) {
          const block = blocks.find((b) => b.id === dragging.blockId)
          if (block && dragging.originalEnd) {
            const newStart = getTimeFromPosition(currentY, dragging.hourSlot)
            if (timeToMinutes(newStart) < timeToMinutes(dragging.originalEnd)) {
              onUpdateBlock(dragging.blockId, { start: newStart })
            }
          }
        } else if (dragging.type === "resize-end" && dragging.blockId) {
          const block = blocks.find((b) => b.id === dragging.blockId)
          if (block && dragging.originalStart) {
            const newEnd = getTimeFromPosition(currentY, dragging.hourSlot)
            if (timeToMinutes(newEnd) > timeToMinutes(dragging.originalStart)) {
              onUpdateBlock(dragging.blockId, { end: newEnd })
            }
          }
        }
      }
    }
  }

  const handleMouseUp = () => {
    if (dragging?.type === "create" && previewBlock) {
      const startY = Math.min(previewBlock.startY, previewBlock.currentY)
      const endY = Math.max(previewBlock.startY, previewBlock.currentY)
      const start = getTimeFromPosition(startY, previewBlock.hour)
      const end = getTimeFromPosition(endY, previewBlock.hour)

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
    if (block) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
      const y = e.clientY - rect.top
      const hour = Number.parseInt(block.start.split(":")[0])
      setDragging({
        type: "move",
        hourSlot: hour,
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
    if (block) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
      const y = e.clientY - rect.top
      const hour = Number.parseInt(block.start.split(":")[0])
      setDragging({
        type,
        hourSlot: hour,
        startY: y,
        blockId,
        originalStart: block.start,
        originalEnd: block.end,
      })
    }
  }

  const handleContextMenu = (e: React.MouseEvent, blockId: string) => {
    e.preventDefault()
    setContextMenu({ blockId, x: e.clientX, y: e.clientY })
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
    
    // All hours are now visible (12am to 11pm)
    // Find which hour row this time falls in
    const hourIndex = currentHour // Hour index is now 0-23 directly
    const minutesInHour = currentMinute
    const topOffset = (minutesInHour / 60) * PIXELS_PER_HOUR
    
    return {
      hourIndex,
      topOffset,
      hour: currentHour,
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

  return (
    <>
      <div ref={timelineRef} className="relative timeline-grid rounded-lg border border-border bg-card p-4">
        <div className="space-y-3">
          {HOURS.map((hour, hourIndex) => {
            const hourBlocks = blocks.filter((block) => {
              const startHour = Number.parseInt(block.start.split(":")[0])
              return startHour === hour
            })

            const isCurrentHour = currentTimePos && currentTimePos.hourIndex === hourIndex

            return (
              <div key={hour} data-hour={hour} className="flex items-start gap-3 min-h-[60px]">
                <div className="w-16 text-sm text-muted-foreground pt-1 shrink-0">
                  {hour === 0 ? "12am" : hour < 12 ? `${hour}am` : hour === 12 ? "12pm" : `${hour - 12}pm`}
                </div>
                <div
                  className="flex-1 relative cursor-crosshair overflow-visible"
                  onMouseDown={(e) => handleMouseDownOnSlot(e, hour)}
                >
                  {/* Grid lines for easier resizing */}
                  <div className="absolute inset-0 pointer-events-none">
                    {/* Hour marker line (at top of each hour slot) */}
                    <div className="absolute left-0 right-0 top-0 h-[1px] bg-border/60" />
                    {/* Half-hour marker line (lighter, at 30px = 30 minutes) */}
                    <div className="absolute left-0 right-0 top-[30px] h-[1px] bg-border/30" />
                    
                    {/* Current time indicator - red line */}
                    {isCurrentHour && (
                      <div
                        className="absolute left-0 right-0 z-50"
                        style={{
                          top: `${currentTimePos.topOffset}px`,
                        }}
                      >
                        <div className="absolute left-0 right-0 h-1 bg-red-500" />
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-red-500 rounded-full -ml-1.5" />
                      </div>
                    )}
                  </div>
                  {/* Preview block being created */}
                  {previewBlock?.hour === hour && (
                    <div
                      className="absolute left-0 right-0 bg-primary/10 border-2 border-dashed border-primary rounded-md"
                      style={{
                        top: `${Math.min(previewBlock.startY, previewBlock.currentY)}px`,
                        height: `${Math.abs(previewBlock.currentY - previewBlock.startY)}px`,
                      }}
                    />
                  )}

                  {hourBlocks.map((block) => {
                    const startMinutes = timeToMinutes(block.start)
                    const endMinutes = timeToMinutes(block.end)
                    const duration = endMinutes - startMinutes
                    const startOffset = (startMinutes - hour * 60) / 60
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
                              ? "bg-secondary/50 border border-dashed border-border hover:bg-secondary/70"
                              : "bg-primary/20 border border-primary/50 hover:bg-primary/30"
                        } ${isSelected ? "cursor-grabbing" : "cursor-grab"}`}
                        style={{
                          top: `${startOffset * PIXELS_PER_HOUR}px`,
                          height: `${height}px`,
                          minHeight: "30px",
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
                                  // Also update local state to trigger re-render
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
                                  // Also update local state to trigger re-render
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
            )
          })}
        </div>

        {selectedBlocks.size > 0 && (
          <div className="mt-4 px-4 py-2 bg-primary/10 border border-primary/50 rounded-md text-sm text-foreground">
            {selectedBlocks.size} block{selectedBlocks.size > 1 ? "s" : ""} selected. Press Delete to remove.
          </div>
        )}
      </div>

      {contextMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setContextMenu(null)} />
          <div
            className="fixed z-50 w-48 bg-popover border border-border rounded-lg shadow-lg py-1"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <button
              onClick={() => handleExtend15(contextMenu.blockId)}
              className="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-secondary transition-colors"
            >
              Extend 15m
            </button>
            <button
              onClick={() => handleToggleOptional(contextMenu.blockId)}
              className="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-secondary transition-colors"
            >
              {blocks.find((b) => b.id === contextMenu.blockId)?.optional
                ? "Mark as Necessary"
                : "Mark as Optional"}
            </button>
            <div className="my-1 border-t border-border" />
            <button
              onClick={() => handleDelete(contextMenu.blockId)}
              className="w-full px-3 py-2 text-left text-sm text-destructive hover:bg-destructive/10 transition-colors"
            >
              Delete
            </button>
          </div>
        </>
      )}
    </>
  )
}