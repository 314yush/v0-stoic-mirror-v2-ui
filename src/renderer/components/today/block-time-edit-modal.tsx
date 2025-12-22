import { useState, useEffect } from "react"
import type { TimeBlock } from "../../lib/schedule-store"

interface BlockTimeEditModalProps {
  block: TimeBlock
  allBlocks: TimeBlock[]
  isOpen: boolean
  onClose: () => void
  onSave: (start: string, end: string) => void
  viewingDate?: Date
  isCommitted?: boolean
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number)
  return hours * 60 + minutes
}

function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60) % 24
  const mins = minutes % 60
  return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`
}

function validateTimeFormat(time: string): boolean {
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
  return timeRegex.test(time)
}

function checkOverlaps(
  blockId: string,
  start: string,
  end: string,
  allBlocks: TimeBlock[]
): TimeBlock[] {
  const startMinutes = timeToMinutes(start)
  const endMinutes = timeToMinutes(end)
  
  return allBlocks.filter((b) => {
    if (b.id === blockId) return false // Don't check against self
    
    const blockStart = timeToMinutes(b.start)
    const blockEnd = timeToMinutes(b.end)
    
    // Check if blocks overlap
    return (
      (startMinutes >= blockStart && startMinutes < blockEnd) ||
      (endMinutes > blockStart && endMinutes <= blockEnd) ||
      (startMinutes <= blockStart && endMinutes >= blockEnd)
    )
  })
}

export function BlockTimeEditModal({
  block,
  allBlocks,
  isOpen,
  onClose,
  onSave,
  viewingDate,
  isCommitted = false,
}: BlockTimeEditModalProps) {
  const [startTime, setStartTime] = useState(block.start)
  const [endTime, setEndTime] = useState(block.end)
  const [startError, setStartError] = useState<string | null>(null)
  const [endError, setEndError] = useState<string | null>(null)
  const [overlappingBlocks, setOverlappingBlocks] = useState<TimeBlock[]>([])

  // Reset state when modal opens/closes or block changes
  useEffect(() => {
    if (isOpen) {
      setStartTime(block.start)
      setEndTime(block.end)
      setStartError(null)
      setEndError(null)
      setOverlappingBlocks([])
    }
  }, [isOpen, block])

  // Validate and check overlaps whenever times change
  useEffect(() => {
    if (!isOpen) return

    // Reset errors
    setStartError(null)
    setEndError(null)
    setOverlappingBlocks([])

    // Validate format
    if (!validateTimeFormat(startTime)) {
      setStartError("Invalid time format. Use HH:MM (e.g., 09:30)")
      return
    }

    if (!validateTimeFormat(endTime)) {
      setEndError("Invalid time format. Use HH:MM (e.g., 17:00)")
      return
    }

    // Validate start < end
    const startMinutes = timeToMinutes(startTime)
    const endMinutes = timeToMinutes(endTime)

    if (startMinutes >= endMinutes) {
      setEndError("End time must be after start time")
      return
    }

    // Check for overlaps
    const overlaps = checkOverlaps(block.id, startTime, endTime, allBlocks)
    setOverlappingBlocks(overlaps)
  }, [startTime, endTime, block.id, allBlocks, isOpen])

  const handleSave = () => {
    // Final validation
    if (!validateTimeFormat(startTime) || !validateTimeFormat(endTime)) {
      return
    }

    const startMinutes = timeToMinutes(startTime)
    const endMinutes = timeToMinutes(endTime)

    if (startMinutes >= endMinutes) {
      return
    }

    onSave(startTime, endTime)
    onClose()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !startError && !endError) {
      handleSave()
    } else if (e.key === "Escape") {
      onClose()
    }
  }

  if (!isOpen) return null

  const canSave = !startError && !endError && timeToMinutes(startTime) < timeToMinutes(endTime)

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-card border border-border rounded-lg shadow-xl">
        {/* Header */}
        <div className="flex items-start justify-between p-4 border-b border-border">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-foreground">Edit Block Times</h3>
            <p className="text-sm text-muted-foreground mt-1">{block.identity}</p>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground p-1 rounded hover:bg-secondary transition-colors"
            title="Close (Esc)"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Start Time */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Start Time
            </label>
            <input
              type="text"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="09:00"
              className={`w-full px-3 py-2 bg-background border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all ${
                startError ? "border-destructive" : "border-border"
              }`}
              autoFocus
            />
            {startError && (
              <p className="text-xs text-destructive mt-1">{startError}</p>
            )}
          </div>

          {/* End Time */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              End Time
            </label>
            <input
              type="text"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="17:00"
              className={`w-full px-3 py-2 bg-background border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all ${
                endError ? "border-destructive" : "border-border"
              }`}
            />
            {endError && (
              <p className="text-xs text-destructive mt-1">{endError}</p>
            )}
          </div>

          {/* Duration Display */}
          {!startError && !endError && timeToMinutes(startTime) < timeToMinutes(endTime) && (
            <div className="text-sm text-muted-foreground">
              Duration: {(() => {
                const duration = timeToMinutes(endTime) - timeToMinutes(startTime)
                const hours = Math.floor(duration / 60)
                const minutes = duration % 60
                if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`
                if (hours > 0) return `${hours}h`
                return `${minutes}m`
              })()}
            </div>
          )}

          {/* Overlap Warning */}
          {overlappingBlocks.length > 0 && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-md p-3">
              <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400 mb-2">
                ⚠️ Overlaps with {overlappingBlocks.length} block{overlappingBlocks.length > 1 ? "s" : ""}:
              </p>
              <ul className="text-xs text-muted-foreground space-y-1">
                {overlappingBlocks.map((overlap) => (
                  <li key={overlap.id}>
                    • {overlap.identity} ({overlap.start} - {overlap.end})
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Info for committed blocks */}
          {isCommitted && (
            <div className="text-xs text-muted-foreground bg-secondary/50 p-2 rounded">
              ℹ️ This block is committed. Changes will be saved to your schedule.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t border-border">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave}
            className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </>
  )
}

