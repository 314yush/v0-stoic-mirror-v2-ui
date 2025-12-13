/**
 * Today Strip Component
 * A compressed, horizontal view of today's schedule
 * Useful for quick overview or sidebar display
 */

import { useState, useEffect } from 'react'
import type { TimeBlock } from '../../lib/schedule-store'
import type { CalendarEvent } from './day-timeline'

interface TodayStripProps {
  blocks: TimeBlock[]
  calendarEvents: CalendarEvent[]
  currentTime?: Date
  onBlockClick?: (blockId: string) => void
  onEventClick?: (event: CalendarEvent) => void
  onTimeClick?: (time: string) => void
  compact?: boolean
}

const START_HOUR = 6
const END_HOUR = 23
const TOTAL_HOURS = END_HOUR - START_HOUR

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

function timeToPercent(time: string): number {
  const minutes = timeToMinutes(time)
  const startMinutes = START_HOUR * 60
  const endMinutes = END_HOUR * 60
  return ((minutes - startMinutes) / (endMinutes - startMinutes)) * 100
}

function formatTime(time: string): string {
  const [hour, min] = time.split(':').map(Number)
  const suffix = hour >= 12 ? 'pm' : 'am'
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
  return min === 0 ? `${displayHour}${suffix}` : `${displayHour}:${min.toString().padStart(2, '0')}${suffix}`
}

export function TodayStrip({
  blocks,
  calendarEvents,
  currentTime = new Date(),
  onBlockClick,
  onEventClick,
  onTimeClick,
  compact = false,
}: TodayStripProps) {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)
  
  // Current time indicator position
  const currentTimeStr = `${currentTime.getHours().toString().padStart(2, '0')}:${currentTime.getMinutes().toString().padStart(2, '0')}`
  const currentTimePercent = timeToPercent(currentTimeStr)
  const isCurrentTimeVisible = currentTimePercent >= 0 && currentTimePercent <= 100

  // Combine and sort all items
  const allItems = [
    ...blocks.map(b => ({ 
      type: 'block' as const, 
      id: b.id, 
      title: b.identity, 
      start: b.start, 
      end: b.end,
      data: b,
    })),
    ...calendarEvents.map(e => ({ 
      type: 'event' as const, 
      id: e.id, 
      title: e.title, 
      start: e.start, 
      end: e.end,
      data: e,
      color: e.accountColor,
    })),
  ].sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start))

  // Find current/next item
  const currentMinutes = timeToMinutes(currentTimeStr)
  const currentItem = allItems.find(item => 
    timeToMinutes(item.start) <= currentMinutes && 
    timeToMinutes(item.end) > currentMinutes
  )
  const nextItem = allItems.find(item => 
    timeToMinutes(item.start) > currentMinutes
  )

  // Calculate time until next item
  const minutesUntilNext = nextItem 
    ? timeToMinutes(nextItem.start) - currentMinutes 
    : null

  // Hour markers
  const hours = Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => i + START_HOUR)

  return (
    <div className={`bg-secondary/30 border border-border rounded-lg overflow-hidden ${compact ? 'p-2' : 'p-4'}`}>
      {/* Current/Next Status */}
      {!compact && (
        <div className="flex items-center justify-between mb-3">
          <div>
            {currentItem ? (
              <div>
                <span className="text-xs text-muted-foreground">Now: </span>
                <span className={`text-sm font-medium ${currentItem.type === 'block' ? 'text-primary' : 'text-blue-500'}`}>
                  {currentItem.title}
                </span>
                <span className="text-xs text-muted-foreground ml-2">
                  until {formatTime(currentItem.end)}
                </span>
              </div>
            ) : (
              <span className="text-sm text-muted-foreground">No current activity</span>
            )}
          </div>
          {nextItem && (
            <div className="text-right">
              <span className="text-xs text-muted-foreground">Next: </span>
              <span className="text-sm font-medium text-foreground">
                {nextItem.title}
              </span>
              {minutesUntilNext !== null && (
                <span className="text-xs text-muted-foreground ml-2">
                  in {minutesUntilNext < 60 
                    ? `${minutesUntilNext}m` 
                    : `${Math.floor(minutesUntilNext / 60)}h ${minutesUntilNext % 60}m`}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Timeline Strip */}
      <div className="relative">
        {/* Hour markers */}
        <div className={`flex justify-between text-[10px] text-muted-foreground mb-1 ${compact ? 'hidden' : ''}`}>
          {[6, 9, 12, 15, 18, 21].map(hour => (
            <span key={hour} style={{ marginLeft: hour === 6 ? 0 : 'auto' }}>
              {hour === 12 ? '12pm' : hour < 12 ? `${hour}am` : `${hour - 12}pm`}
            </span>
          ))}
        </div>

        {/* Timeline bar */}
        <div 
          className="relative h-8 bg-secondary rounded-full overflow-hidden cursor-pointer"
          onClick={(e) => {
            if (!onTimeClick) return
            const rect = e.currentTarget.getBoundingClientRect()
            const x = e.clientX - rect.left
            const percent = (x / rect.width) * 100
            const minutes = START_HOUR * 60 + (percent / 100) * TOTAL_HOURS * 60
            const hours = Math.floor(minutes / 60)
            const mins = Math.round(minutes % 60)
            onTimeClick(`${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`)
          }}
        >
          {/* Calendar events (bottom layer) */}
          {calendarEvents.map(event => {
            const left = Math.max(0, timeToPercent(event.start))
            const right = Math.min(100, timeToPercent(event.end))
            const width = right - left
            
            if (width <= 0) return null
            
            return (
              <div
                key={`event-${event.id}`}
                className="absolute top-0 h-full opacity-50 cursor-pointer hover:opacity-75 transition-opacity"
                style={{
                  left: `${left}%`,
                  width: `${width}%`,
                  backgroundColor: event.accountColor || '#4285f4',
                }}
                onClick={(e) => {
                  e.stopPropagation()
                  onEventClick?.(event)
                }}
                onMouseEnter={() => setHoveredItem(`event-${event.id}`)}
                onMouseLeave={() => setHoveredItem(null)}
              />
            )
          })}

          {/* Identity blocks (top layer) */}
          {blocks.map(block => {
            const left = Math.max(0, timeToPercent(block.start))
            const right = Math.min(100, timeToPercent(block.end))
            const width = right - left
            
            if (width <= 0) return null
            
            return (
              <div
                key={`block-${block.id}`}
                className={`absolute top-1 bottom-1 rounded-full cursor-pointer transition-all ${
                  block.optional ? 'bg-muted-foreground/50' : 'bg-primary'
                } ${hoveredItem === `block-${block.id}` ? 'ring-2 ring-primary ring-offset-1' : ''}`}
                style={{
                  left: `${left}%`,
                  width: `${width}%`,
                }}
                onClick={(e) => {
                  e.stopPropagation()
                  onBlockClick?.(block.id)
                }}
                onMouseEnter={() => setHoveredItem(`block-${block.id}`)}
                onMouseLeave={() => setHoveredItem(null)}
              />
            )
          })}

          {/* Current time indicator */}
          {isCurrentTimeVisible && (
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-destructive z-10"
              style={{ left: `${currentTimePercent}%` }}
            >
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-destructive rounded-full" />
            </div>
          )}
        </div>

        {/* Hover tooltip */}
        {hoveredItem && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-foreground text-background text-xs rounded shadow-lg whitespace-nowrap z-20">
            {hoveredItem.startsWith('block-') 
              ? blocks.find(b => `block-${b.id}` === hoveredItem)?.identity
              : calendarEvents.find(e => `event-${e.id}` === hoveredItem)?.title}
          </div>
        )}
      </div>

      {/* Legend */}
      {!compact && (
        <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-primary rounded-full" />
            <span>Identity blocks</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-blue-500/50 rounded" />
            <span>Calendar events</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-0.5 bg-destructive" />
            <span>Now</span>
          </div>
        </div>
      )}
    </div>
  )
}




