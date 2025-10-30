"use client"

import type React from "react"

import { useState } from "react"
import type { TimeBlock } from "./today-tab"

interface DayTimelineProps {
  blocks: TimeBlock[]
  onUpdateBlock: (id: string, updates: Partial<TimeBlock>) => void
  onDeleteBlock: (id: string) => void
}

const HOURS = Array.from({ length: 18 }, (_, i) => i + 5) // 5am to 11pm

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number)
  return hours * 60 + minutes
}

function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`
}

export function DayTimeline({ blocks, onUpdateBlock, onDeleteBlock }: DayTimelineProps) {
  const [contextMenu, setContextMenu] = useState<{ blockId: string; x: number; y: number } | null>(null)

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

  const handleSplit = (blockId: string) => {
    // Placeholder for split functionality
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
  }

  return (
    <>
      <div className="relative timeline-grid rounded-lg border border-border bg-card p-4">
        <div className="space-y-3">
          {HOURS.map((hour) => (
            <div key={hour} className="flex items-start gap-3 h-[60px]">
              <div className="w-16 text-sm text-muted-foreground pt-1">{hour.toString().padStart(2, "0")}:00</div>
              <div className="flex-1 relative">
                {blocks
                  .filter((block) => {
                    const startHour = Number.parseInt(block.start.split(":")[0])
                    return startHour === hour
                  })
                  .map((block) => {
                    const startMinutes = timeToMinutes(block.start)
                    const endMinutes = timeToMinutes(block.end)
                    const duration = endMinutes - startMinutes
                    const height = (duration / 60) * 60 // 60px per hour

                    return (
                      <div
                        key={block.id}
                        onContextMenu={(e) => handleContextMenu(e, block.id)}
                        className={`absolute left-0 right-0 rounded-md px-3 py-2 cursor-pointer transition-colors ${
                          block.optional
                            ? "bg-secondary/50 border border-dashed border-border hover:bg-secondary/70"
                            : "bg-primary/20 border border-primary/50 hover:bg-primary/30"
                        }`}
                        style={{ height: `${height}px` }}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-sm font-medium text-foreground">{block.identity}</p>
                            <p className="text-xs text-muted-foreground">
                              {block.start} - {block.end}
                            </p>
                          </div>
                          {block.streak && (
                            <span className="px-1.5 py-0.5 text-xs bg-primary/30 text-primary rounded">
                              {block.streak}🔥
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
              </div>
            </div>
          ))}
        </div>
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
              onClick={() => handleSplit(contextMenu.blockId)}
              className="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-secondary transition-colors"
            >
              Split
            </button>
            <button
              onClick={() => handleToggleOptional(contextMenu.blockId)}
              className="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-secondary transition-colors"
            >
              Toggle Optional
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
