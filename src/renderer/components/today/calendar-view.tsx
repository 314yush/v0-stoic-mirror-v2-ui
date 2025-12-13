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
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [visibleRange, setVisibleRange] = useState<{ start: Date; end: Date } | null>(null)
  const [weekCalendarEvents, setWeekCalendarEvents] = useState<Map<string, CalendarEvent[]>>(new Map())
  const [loadingEvents, setLoadingEvents] = useState(false)
  
  const { getCommitByDate, commits } = useScheduleStore()

  // Navigate to viewing date when it changes
  useEffect(() => {
    const calendarApi = calendarRef.current?.getApi()
    if (calendarApi) {
      calendarApi.gotoDate(viewingDate)
    }
  }, [viewingDate])
  
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
        for (const block of commit.blocks) {
          events.push({
            id: `block-${dateStr}-${block.id}`,
            title: block.identity,
            start: `${dateStr}T${block.start}:00`,
            end: `${dateStr}T${block.end}:00`,
            backgroundColor: block.optional ? 'rgba(156, 163, 175, 0.3)' : 'rgba(34, 197, 94, 0.3)',
            borderColor: block.optional ? '#9ca3af' : '#22c55a',
            textColor: 'var(--foreground)',
            extendedProps: {
              type: 'identity-block',
              block,
              dateStr,
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
    const dateStr = props.dateStr
    const newStart = info.event.start?.toTimeString().slice(0, 5) || block.start
    const newEnd = info.event.end?.toTimeString().slice(0, 5) || block.end
    
    // Update the block in the store
    // Note: This would require extending the schedule store to support cross-day moves
    // For now, we just show a toast
    console.log('Block moved:', { block, newStart, newEnd, newDate: info.event.start?.toISOString().split('T')[0] })
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
    const newStart = info.event.start?.toTimeString().slice(0, 5) || block.start
    const newEnd = info.event.end?.toTimeString().slice(0, 5) || block.end
    
    console.log('Block resized:', { block, newStart, newEnd })
  }

  // Custom event rendering
  const renderEventContent = (eventInfo: any) => {
    const props = eventInfo.event.extendedProps
    const isGoogleEvent = props.type === 'google-calendar'
    const hasMeetingLink = props.hasMeetingLink
    
    return (
      <div className="p-1 overflow-hidden h-full">
        <div className="flex items-center justify-between gap-1">
          <span className="text-xs font-medium truncate">
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
              className="text-[9px] px-1.5 py-0.5 bg-secondary border border-border rounded hover:bg-accent shrink-0"
            >
              Join
            </button>
          )}
        </div>
        <span className="text-[10px] text-muted-foreground">
          {eventInfo.timeText}
        </span>
      </div>
    )
  }

  return (
    <div className="calendar-view h-full">
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
          padding: 8px 0;
        }
        .calendar-view .fc-col-header-cell-cushion {
          color: var(--foreground);
          font-weight: 500;
          font-size: 12px;
        }
        .calendar-view .fc-timegrid-slot-label {
          font-size: 11px;
          color: var(--muted-foreground);
        }
        .calendar-view .fc-timegrid-slot {
          height: 48px;
        }
        .calendar-view .fc-event {
          border-radius: 4px;
          border-width: 0 0 0 3px;
          cursor: pointer;
        }
        .calendar-view .fc-event:hover {
          opacity: 0.9;
        }
        .calendar-view .fc-daygrid-day-number {
          color: var(--foreground);
          font-size: 12px;
          padding: 4px 8px;
        }
        .calendar-view .fc-daygrid-day.fc-day-today {
          background: rgba(34, 197, 94, 0.1);
        }
        .calendar-view .fc-toolbar-title {
          color: var(--foreground);
          font-size: 16px;
          font-weight: 600;
        }
        .calendar-view .fc-button {
          font-size: 12px;
          padding: 4px 12px;
          border-radius: 6px;
        }
        .calendar-view .fc-button-primary:not(:disabled).fc-button-active {
          background: var(--primary);
          border-color: var(--primary);
        }
        .calendar-view .fc-scrollgrid {
          border-radius: 8px;
          overflow: hidden;
        }
        .calendar-view .fc-timegrid-now-indicator-line {
          border-color: #ef4444;
          border-width: 2px;
        }
        .calendar-view .fc-timegrid-now-indicator-arrow {
          border-color: #ef4444;
          border-top-color: transparent;
          border-bottom-color: transparent;
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

