/**
 * Calendar View Component
 * Uses FullCalendar for Week and Month views
 * Displays both Google Calendar events (context) and Identity blocks (commitment)
 */

import { useRef, useEffect, useState, useMemo } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import type { EventInput, EventClickArg, DateSelectArg, DatesSetArg } from '@fullcalendar/core'
import type { TimeBlock, DayCommit } from '../../lib/schedule-store'
import { useScheduleStore } from '../../lib/schedule-store'
import type { CalendarEvent } from './day-timeline'
import { loadAccounts } from '../../lib/google-oauth-electron'
import { importEventsFromAllAccounts, googleEventToTimeRange } from '../../lib/google-calendar-api'
import { useToastStore } from '../toasts'
import { getTodayDateStrLocal } from '../../lib/date-utils'

interface CalendarViewProps {
  viewMode: 'week'
  blocks: TimeBlock[]  // Current day's blocks
  calendarEvents: CalendarEvent[]  // Current day's events
  viewingDate: Date
  onDateChange: (date: Date) => void
  onBlockClick?: (blockId: string) => void
  onEventClick?: (event: CalendarEvent) => void
  onAddBlock?: (start: string, end: string, date: string) => void
}

export function CalendarView({
  viewMode,
  blocks,
  calendarEvents,
  viewingDate,
  onDateChange,
  onBlockClick,
  onEventClick,
  onAddBlock,
}: CalendarViewProps) {
  const calendarRef = useRef<FullCalendar>(null)
  const calendarContainerRef = useRef<HTMLDivElement>(null)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [visibleRange, setVisibleRange] = useState<{ start: Date; end: Date } | null>(null)
  const [weekCalendarEvents, setWeekCalendarEvents] = useState<Map<string, CalendarEvent[]>>(new Map())
  const [loadingEvents, setLoadingEvents] = useState(false)
  
  const { getCommitByDate, commits, updateBlocksInCommit } = useScheduleStore()
  const { addToast } = useToastStore()
  
  // Calculate current time for scroll position - use state so it's reactive
  const [scrollTime, setScrollTime] = useState(() => {
    const now = new Date()
    const hours = now.getHours()
    const minutes = now.getMinutes()
    // Format as HH:MM:SS for FullCalendar scrollTime prop
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`
  })

  // Navigate to viewing date when it changes
  useEffect(() => {
    const calendarApi = calendarRef.current?.getApi()
    if (calendarApi) {
      calendarApi.gotoDate(viewingDate)
    }
  }, [viewingDate])
  
  // Force scroll to current time on initial mount
  useEffect(() => {
    const scrollToCurrentTime = () => {
      if (calendarContainerRef.current) {
        const scrollEl = calendarContainerRef.current.querySelector('.fc-timegrid-body') as HTMLElement
        if (scrollEl) {
          const now = new Date()
          const hours = now.getHours()
          const minutes = now.getMinutes()
          
          // Calculate scroll position
          const slotDuration = 30 // minutes
          const slotHeight = 48 // pixels per slot
          const startHour = 6 // slotMinTime
          
          const currentSlotMinutes = hours * 60 + minutes
          const startSlotMinutes = startHour * 60
          const slotOffset = currentSlotMinutes - startSlotMinutes
          const slotsFromStart = slotOffset / slotDuration
          
          const scrollPosition = slotsFromStart * slotHeight - 200 // 200px padding
          
          scrollEl.scrollTo({
            top: Math.max(0, scrollPosition),
            behavior: 'auto'
          })
        }
      }
    }
    
    // Try multiple times to ensure it works after calendar renders
    const timeouts = [
      setTimeout(scrollToCurrentTime, 100),
      setTimeout(scrollToCurrentTime, 300),
      setTimeout(scrollToCurrentTime, 600),
    ]
    
    return () => {
      timeouts.forEach(clearTimeout)
    }
  }, []) // Run once on mount
  
  // Fetch calendar events for the visible date range
  useEffect(() => {
    if (!visibleRange) return
    
    const fetchEvents = async () => {
      const accounts = loadAccounts()
      if (accounts.length === 0) {
        setWeekCalendarEvents(new Map())
        return
      }
      
      setLoadingEvents(true)
      try {
        const eventsByDate = await importEventsFromAllAccounts(visibleRange.start, visibleRange.end)
        
        // Convert to CalendarEvent format
        const processedEvents = new Map<string, CalendarEvent[]>()
        
        for (const [dateStr, events] of eventsByDate) {
          const calEvents: CalendarEvent[] = []
          for (const event of events) {
            const timeRange = googleEventToTimeRange(event)
            if (!timeRange) continue
            
            let meetingLink = event.hangoutLink
            let meetingProvider = meetingLink ? 'Google Meet' : undefined
            
            if (event.conferenceData?.entryPoints) {
              const videoEntry = event.conferenceData.entryPoints.find(
                ep => ep.entryPointType === 'video'
              )
              if (videoEntry?.uri) {
                meetingLink = videoEntry.uri
                const provider = event.conferenceData.conferenceSolution?.name
                if (provider) meetingProvider = provider
              }
            }
            
            calEvents.push({
              id: event.id,
              title: event.summary || 'Untitled Event',
              start: timeRange.start,
              end: timeRange.end,
              accountEmail: event.accountEmail,
              accountLabel: event.accountLabel,
              accountColor: event.accountColor,
              description: event.description,
              location: event.location,
              meetingLink,
              meetingProvider,
              organizer: event.organizer,
              attendees: event.attendees,
            })
          }
          processedEvents.set(dateStr, calEvents)
        }
        
        setWeekCalendarEvents(processedEvents)
      } catch (error) {
        console.error('Failed to fetch calendar events:', error)
      } finally {
        setLoadingEvents(false)
      }
    }
    
    fetchEvents()
  }, [visibleRange])

  // Get all blocks from commits in the visible range
  const allBlockEvents = useMemo(() => {
    const events: EventInput[] = []
    
    if (!visibleRange) return events
    
    // Iterate through each day in the visible range
    const currentDate = new Date(visibleRange.start)
    while (currentDate <= visibleRange.end) {
      const dateStr = currentDate.toISOString().split('T')[0]
      const commit = getCommitByDate(dateStr)
      
      if (commit?.blocks) {
        const isDraft = !commit.committed
        for (const block of commit.blocks) {
          // Apply reduced opacity for drafts
          const baseOpacity = isDraft ? 0.5 : 1.0
          const bgOpacity = isDraft ? 0.15 : 0.3
          events.push({
            id: `block-${dateStr}-${block.id}`,
            title: block.identity,
            start: `${dateStr}T${block.start}:00`,
            end: `${dateStr}T${block.end}:00`,
            backgroundColor: block.optional 
              ? `rgba(156, 163, 175, ${bgOpacity})` 
              : `rgba(34, 197, 94, ${bgOpacity})`,
            borderColor: block.optional ? '#9ca3af' : 'rgba(0, 0, 0, 0.2)',
            borderWidth: 1,
            textColor: 'var(--foreground)',
            classNames: isDraft ? ['draft-block'] : [],
            extendedProps: {
              type: 'identity-block',
              block,
              dateStr,
              isDraft,
            },
          })
        }
      }
      
      currentDate.setDate(currentDate.getDate() + 1)
    }
    
    return events
  }, [visibleRange, commits, getCommitByDate])

  // Convert Google Calendar events from the week map to FullCalendar format
  const allGoogleEvents = useMemo(() => {
    const events: EventInput[] = []
    
    for (const [dateStr, dayEvents] of weekCalendarEvents) {
      for (const event of dayEvents) {
        const borderColor = event.accountColor || '#4285f4'
        events.push({
          id: `gcal-${dateStr}-${event.id}`,
          title: event.title,
          start: `${dateStr}T${event.start}:00`,
          end: `${dateStr}T${event.end}:00`,
          backgroundColor: `${borderColor}20`,
          borderColor: borderColor,
          textColor: 'var(--muted-foreground)',
          extendedProps: {
            type: 'google-calendar',
            event,
            hasMeetingLink: !!event.meetingLink,
          },
        })
      }
    }
    
    return events
  }, [weekCalendarEvents])

  const allEvents = [...allGoogleEvents, ...allBlockEvents]
  
  // Handle visible date range changes
  const handleDatesSet = (arg: DatesSetArg) => {
    setVisibleRange({ start: arg.start, end: arg.end })
    
    // Update scrollTime to current time
    const now = new Date()
    const hours = now.getHours()
    const minutes = now.getMinutes()
    const newScrollTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`
    setScrollTime(newScrollTime)
    
    // Scroll to current time when dates are set (calendar is ready)
    // This runs whenever the calendar view changes or loads
    const scrollToCurrentTime = () => {
      const calendarApi = calendarRef.current?.getApi()
      if (calendarApi) {
        // Try using FullCalendar's scrollToTime method if available
        try {
          // FullCalendar v6+ might have scrollToTime
          if (typeof (calendarApi as any).scrollToTime === 'function') {
            (calendarApi as any).scrollToTime(newScrollTime)
            return
          }
        } catch (e) {
          // Fall through to manual scroll
        }
      }
      
      // Fallback: manual scroll
      if (calendarContainerRef.current) {
        const scrollEl = calendarContainerRef.current.querySelector('.fc-timegrid-body') as HTMLElement
        if (scrollEl) {
          // Calculate scroll position
          // slotMinTime is 06:00:00, slotDuration is 00:30:00
          const slotDuration = 30 // minutes
          const slotHeight = 48 // pixels per slot
          const startHour = 6 // slotMinTime
          
          // Calculate how many slots from start (6am) to current time
          const currentSlotMinutes = hours * 60 + minutes
          const startSlotMinutes = startHour * 60
          const slotOffset = currentSlotMinutes - startSlotMinutes
          const slotsFromStart = slotOffset / slotDuration
          
          // Scroll position with padding
          const scrollPosition = slotsFromStart * slotHeight - 200 // 200px padding from top
          
          scrollEl.scrollTo({
            top: Math.max(0, scrollPosition),
            behavior: 'auto' // Use 'auto' for instant scroll on initial load
          })
        }
      }
    }
    
    // Try scrolling with multiple attempts to ensure it works
    setTimeout(scrollToCurrentTime, 50)
    setTimeout(scrollToCurrentTime, 200)
    setTimeout(scrollToCurrentTime, 500) // Final attempt
  }

  const handleEventClick = (info: EventClickArg) => {
    const props = info.event.extendedProps
    if (props.type === 'identity-block' && onBlockClick) {
      onBlockClick(props.block.id)
    } else if (props.type === 'google-calendar' && onEventClick) {
      onEventClick(props.event)
    }
  }

  const handleDateSelect = (info: DateSelectArg) => {
    if (onAddBlock) {
      const start = info.start.toTimeString().slice(0, 5)
      const end = info.end.toTimeString().slice(0, 5)
      const date = info.start.toISOString().split('T')[0]
      onAddBlock(start, end, date)
    }
  }

  const handleDateClick = (info: { date: Date }) => {
    onDateChange(info.date)
  }
  
  // Handle event drag (reschedule)
  const handleEventDrop = (info: any) => {
    const props = info.event.extendedProps
    
    // Only allow dragging identity blocks, not Google Calendar events
    if (props.type !== 'identity-block') {
      info.revert()
      return
    }
    
    const block = props.block as TimeBlock
    const originalDateStr = props.dateStr
    const newDateStr = info.event.start?.toISOString().split('T')[0]
    
    if (!newDateStr) {
      info.revert()
      addToast("Could not determine new date", "error")
      return
    }
    
    const newStart = info.event.start?.toTimeString().slice(0, 5) || block.start
    const newEnd = info.event.end?.toTimeString().slice(0, 5) || block.end
    
    try {
      const { saveDraftBlocks, getCommitByDate: getCommit, updateBlocksInCommit } = useScheduleStore.getState()
      const todayStr = getTodayDateStrLocal()
      const isNewDateFuture = newDateStr > todayStr
      
      // Handle cross-day moves
      if (originalDateStr !== newDateStr) {
        // Remove block from original date
        const originalCommit = getCommit(originalDateStr)
        if (originalCommit) {
          const updatedOriginalBlocks = originalCommit.blocks.filter((b) => b.id !== block.id)
          if (updatedOriginalBlocks.length !== originalCommit.blocks.length) {
            // Only update if block was found
            if (originalCommit.committed) {
              updateBlocksInCommit(originalDateStr, updatedOriginalBlocks)
            } else {
              // It's a draft, use saveDraftBlocks
              saveDraftBlocks(originalDateStr, updatedOriginalBlocks)
            }
          }
        }
        
        // Add block to new date
        const newCommit = getCommit(newDateStr)
        if (newCommit) {
          const updatedNewBlocks = [
            ...newCommit.blocks.filter((b) => b.id !== block.id), // Remove if duplicate
            { ...block, start: newStart, end: newEnd },
          ]
          if (newCommit.committed) {
            updateBlocksInCommit(newDateStr, updatedNewBlocks)
          } else {
            // It's a draft, use saveDraftBlocks
            saveDraftBlocks(newDateStr, updatedNewBlocks)
          }
          addToast(`Block moved to ${new Date(newDateStr).toLocaleDateString()}`)
        } else {
          // No commit exists for new date - save as draft if future, or create commit if past/today
          if (isNewDateFuture) {
            saveDraftBlocks(newDateStr, [{ ...block, start: newStart, end: newEnd }])
            addToast(`Block moved to ${new Date(newDateStr).toLocaleDateString()}`)
          } else {
            // For past/today dates, create a commit (though this shouldn't normally happen)
            const { commitDay } = useScheduleStore.getState()
            commitDay([{ ...block, start: newStart, end: newEnd }], newDateStr)
            addToast(`Block moved to ${new Date(newDateStr).toLocaleDateString()}`)
          }
        }
      } else {
        // Same day, just update times
        const commit = getCommit(originalDateStr)
        if (commit) {
          const updatedBlocks = commit.blocks.map((b) =>
            b.id === block.id ? { ...b, start: newStart, end: newEnd } : b
          )
          if (commit.committed) {
            updateBlocksInCommit(originalDateStr, updatedBlocks)
          } else {
            // It's a draft, use saveDraftBlocks
            saveDraftBlocks(originalDateStr, updatedBlocks)
          }
          addToast("Block time updated")
        } else {
          // No commit exists - save as draft if future
          if (isNewDateFuture || originalDateStr >= todayStr) {
            saveDraftBlocks(originalDateStr, [{ ...block, start: newStart, end: newEnd }])
            addToast("Block time updated")
          } else {
            info.revert()
            addToast("Could not find commit for this date", "error")
          }
        }
      }
    } catch (error) {
      info.revert()
      addToast(error instanceof Error ? error.message : "Failed to update block", "error")
    }
  }
  
  // Handle event resize
  const handleEventResize = (info: any) => {
    const props = info.event.extendedProps
    
    // Only allow resizing identity blocks
    if (props.type !== 'identity-block') {
      info.revert()
      return
    }
    
    const block = props.block as TimeBlock
    const dateStr = props.dateStr
    const newStart = info.event.start?.toTimeString().slice(0, 5) || block.start
    const newEnd = info.event.end?.toTimeString().slice(0, 5) || block.end
    
    try {
      const { saveDraftBlocks, getCommitByDate: getCommit, updateBlocksInCommit } = useScheduleStore.getState()
      const commit = getCommit(dateStr)
      if (commit) {
        const updatedBlocks = commit.blocks.map((b) =>
          b.id === block.id ? { ...b, start: newStart, end: newEnd } : b
        )
        if (commit.committed) {
          updateBlocksInCommit(dateStr, updatedBlocks)
        } else {
          // It's a draft, use saveDraftBlocks
          saveDraftBlocks(dateStr, updatedBlocks)
        }
        addToast("Block duration updated")
      } else {
        // No commit exists - save as draft if future
        const todayStr = getTodayDateStrLocal()
        if (dateStr >= todayStr) {
          saveDraftBlocks(dateStr, [{ ...block, start: newStart, end: newEnd }])
          addToast("Block duration updated")
        } else {
          info.revert()
          addToast("Could not find commit for this date", "error")
        }
      }
    } catch (error) {
      info.revert()
      addToast(error instanceof Error ? error.message : "Failed to resize block", "error")
    }
  }

  // Custom event rendering - cleaner design
  const renderEventContent = (eventInfo: any) => {
    const props = eventInfo.event.extendedProps
    const isGoogleEvent = props.type === 'google-calendar'
    const hasMeetingLink = props.hasMeetingLink
    const isDraft = props.isDraft || false
    
    return (
      <div className="px-2 py-1.5 overflow-hidden h-full flex flex-col justify-between">
        <div className="flex items-center justify-between gap-1.5 min-w-0">
          <span className={`text-xs font-medium truncate ${isDraft ? 'opacity-70' : ''}`}>
            {eventInfo.event.title}
          </span>
          {isGoogleEvent && hasMeetingLink && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                const event = props.event as CalendarEvent
                let url = event.meetingLink!
                if (url.includes('meet.google.com') && event.accountEmail) {
                  const separator = url.includes('?') ? '&' : '?'
                  url = `${url}${separator}authuser=${encodeURIComponent(event.accountEmail)}`
                }
                if (window.electronAPI?.oauth?.openExternal) {
                  window.electronAPI.oauth.openExternal(url)
                } else {
                  window.open(url, '_blank')
                }
              }}
              className="text-[10px] px-2 py-0.5 bg-secondary/80 border border-border rounded hover:bg-accent shrink-0 font-medium transition-colors"
            >
              Join
            </button>
          )}
        </div>
        <span className={`text-[10px] ${isDraft ? 'text-muted-foreground/60' : 'text-muted-foreground'} mt-0.5`}>
          {eventInfo.timeText}
        </span>
      </div>
    )
  }

  return (
    <div ref={calendarContainerRef} className="calendar-view h-full">
      <style>{`
        .calendar-view .fc {
          --fc-border-color: var(--border);
          --fc-button-bg-color: var(--secondary);
          --fc-button-border-color: var(--border);
          --fc-button-text-color: var(--foreground);
          --fc-button-hover-bg-color: var(--accent);
          --fc-button-hover-border-color: var(--border);
          --fc-button-active-bg-color: var(--primary);
          --fc-button-active-border-color: var(--primary);
          --fc-today-bg-color: rgba(34, 197, 94, 0.1);
          --fc-page-bg-color: var(--background);
          --fc-neutral-bg-color: var(--card);
          --fc-list-event-hover-bg-color: var(--accent);
          font-family: inherit;
        }
        .calendar-view .fc-theme-standard td,
        .calendar-view .fc-theme-standard th {
          border-color: var(--border);
        }
        .calendar-view .fc-col-header-cell {
          background: var(--secondary);
          padding: 10px 0;
          border-bottom: 1px solid var(--border);
        }
        .calendar-view .fc-col-header-cell-cushion {
          color: var(--foreground);
          font-weight: 600;
          font-size: 13px;
          letter-spacing: 0.01em;
        }
        .calendar-view .fc-timegrid-slot-label {
          font-size: 12px;
          color: var(--muted-foreground);
          font-weight: 500;
          padding-right: 12px;
        }
        .calendar-view .fc-timegrid-slot {
          height: 48px;
          border-top: 1px solid var(--border);
        }
        .calendar-view .fc-timegrid-slot-minor {
          border-top: 1px solid var(--border);
          opacity: 0.4;
        }
        .calendar-view .fc-event {
          border-radius: 6px;
          border-width: 0 0 0 3px;
          cursor: pointer;
          padding: 0;
          margin: 2px 4px;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
          transition: all 0.2s ease;
        }
        .calendar-view .fc-event:hover {
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          transform: translateY(-1px);
        }
        .calendar-view .fc-event.draft-block {
          opacity: 0.5;
        }
        .calendar-view .fc-event.draft-block:hover {
          opacity: 0.7;
        }
        .calendar-view .fc-daygrid-day-number {
          color: var(--foreground);
          font-size: 13px;
          font-weight: 500;
          padding: 6px 10px;
        }
        .calendar-view .fc-daygrid-day.fc-day-today {
          background: rgba(34, 197, 94, 0.08);
        }
        .calendar-view .fc-toolbar-title {
          color: var(--foreground);
          font-size: 18px;
          font-weight: 600;
          letter-spacing: -0.01em;
        }
        .calendar-view .fc-button {
          font-size: 13px;
          font-weight: 500;
          padding: 6px 14px;
          border-radius: 6px;
          transition: all 0.2s ease;
        }
        .calendar-view .fc-button-primary:not(:disabled).fc-button-active {
          background: var(--primary);
          border-color: var(--primary);
        }
        .calendar-view .fc-button:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        .calendar-view .fc-scrollgrid {
          border-radius: 8px;
          overflow: hidden;
        }
        .calendar-view .fc-timegrid-now-indicator-line {
          border-color: #ef4444;
          border-width: 2px;
          border-style: dashed;
        }
        .calendar-view .fc-timegrid-now-indicator-arrow {
          border-color: #ef4444;
          border-top-color: transparent;
          border-bottom-color: transparent;
        }
        .calendar-view .fc-timegrid-col {
          border-right: 1px solid var(--border);
        }
        .calendar-view .fc-timegrid-col.fc-timegrid-col-frame {
          border-right: 1px solid var(--border);
        }
      `}</style>
      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="timeGridWeek"
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: '',
        }}
        events={allEvents}
        eventClick={handleEventClick}
        select={handleDateSelect}
        dateClick={handleDateClick}
        datesSet={handleDatesSet}
        eventDrop={handleEventDrop}
        eventResize={handleEventResize}
        selectable={true}
        selectMirror={true}
        editable={true}
        eventStartEditable={true}
        eventDurationEditable={true}
        nowIndicator={true}
        scrollTime={scrollTime}
        slotMinTime="06:00:00"
        slotMaxTime="23:00:00"
        slotDuration="00:30:00"
        allDaySlot={false}
        weekends={true}
        firstDay={1} // Monday
        height="100%"
        eventContent={renderEventContent}
        dayMaxEvents={3}
        moreLinkText={(num) => `+${num} more`}
        loading={(isLoading) => {
          // Could show loading indicator
        }}
      />

      {/* Event Details Modal for Google Calendar events */}
      {selectedEvent && (
        <div 
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"
          onClick={() => setSelectedEvent(null)}
        >
          <div 
            className="bg-card border border-border rounded-lg shadow-xl max-w-md w-full mx-4 p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold">{selectedEvent.title}</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {selectedEvent.start} - {selectedEvent.end}
            </p>
            <button
              onClick={() => setSelectedEvent(null)}
              className="mt-4 px-4 py-2 bg-secondary rounded-md text-sm"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

