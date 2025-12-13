/**
 * Google Calendar API Client
 * 
 * Handles all Google Calendar API operations using REST API directly
 * (No googleapis package needed in renderer - that's for Node.js)
 * 
 * Supports multiple Google accounts (personal + work)
 */

import { getValidAccessToken, getAllValidAccessTokens } from './google-oauth-electron'

const CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3'

export interface GoogleCalendarAttendee {
  email: string
  displayName?: string
  responseStatus?: 'needsAction' | 'declined' | 'tentative' | 'accepted'
  organizer?: boolean
  self?: boolean
}

export interface GoogleCalendarEvent {
  id: string
  summary: string
  description?: string
  location?: string
  start: {
    dateTime?: string
    date?: string
    timeZone?: string
  }
  end: {
    dateTime?: string
    date?: string
    timeZone?: string
  }
  colorId?: string
  status?: string
  htmlLink?: string
  // Meeting/conference info
  hangoutLink?: string // Google Meet link
  conferenceData?: {
    entryPoints?: Array<{
      entryPointType: string // 'video', 'phone', 'sip', 'more'
      uri: string
      label?: string
    }>
    conferenceSolution?: {
      name: string // "Google Meet", "Zoom", etc.
      iconUri?: string
    }
  }
  // Attendees
  attendees?: GoogleCalendarAttendee[]
  // Organizer
  organizer?: {
    email: string
    displayName?: string
    self?: boolean
  }
  // Creator
  creator?: {
    email: string
    displayName?: string
    self?: boolean
  }
  // Recurrence
  recurringEventId?: string
  // Multi-account metadata
  accountEmail?: string // Which account this event belongs to
  accountLabel?: string // "Personal" or "Work"
  accountColor?: string // For visual distinction
}

export interface CalendarListEntry {
  id: string
  summary: string
  primary?: boolean
  backgroundColor?: string
  foregroundColor?: string
}

/**
 * Make authenticated request to Google Calendar API
 */
async function makeRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const accessToken = await getValidAccessToken()
  if (!accessToken) {
    throw new Error('Not authenticated with Google Calendar')
  }

  const response = await fetch(`${CALENDAR_API_BASE}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }))
    throw new Error(error.error?.message || `API error: ${response.status}`)
  }

  return response.json()
}

/**
 * Get list of calendars
 */
export async function getCalendarList(): Promise<CalendarListEntry[]> {
  const data = await makeRequest<{ items: CalendarListEntry[] }>('/users/me/calendarList')
  return data.items || []
}

/**
 * Get events from a calendar
 */
export async function getEvents(
  calendarId: string = 'primary',
  timeMin: Date,
  timeMax: Date,
  maxResults: number = 250
): Promise<GoogleCalendarEvent[]> {
  const params = new URLSearchParams({
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
    maxResults: maxResults.toString(),
    singleEvents: 'true',
    orderBy: 'startTime',
  })

  const data = await makeRequest<{ items: GoogleCalendarEvent[] }>(
    `/calendars/${encodeURIComponent(calendarId)}/events?${params}`
  )
  
  return data.items || []
}

/**
 * Create a new event
 */
export async function createEvent(
  calendarId: string = 'primary',
  event: Omit<GoogleCalendarEvent, 'id'>
): Promise<GoogleCalendarEvent> {
  return makeRequest<GoogleCalendarEvent>(
    `/calendars/${encodeURIComponent(calendarId)}/events`,
    {
      method: 'POST',
      body: JSON.stringify(event),
    }
  )
}

/**
 * Update an existing event
 */
export async function updateEvent(
  calendarId: string = 'primary',
  eventId: string,
  event: Partial<GoogleCalendarEvent>
): Promise<GoogleCalendarEvent> {
  return makeRequest<GoogleCalendarEvent>(
    `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    {
      method: 'PATCH',
      body: JSON.stringify(event),
    }
  )
}

/**
 * Delete an event
 */
export async function deleteEvent(
  calendarId: string = 'primary',
  eventId: string
): Promise<void> {
  const accessToken = await getValidAccessToken()
  if (!accessToken) {
    throw new Error('Not authenticated with Google Calendar')
  }

  const response = await fetch(
    `${CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  )

  if (!response.ok && response.status !== 204) {
    throw new Error(`Failed to delete event: ${response.status}`)
  }
}

/**
 * Import events for a date range (single account - legacy)
 */
export async function importEventsForDateRange(
  startDate: Date,
  endDate: Date
): Promise<Map<string, GoogleCalendarEvent[]>> {
  const events = await getEvents('primary', startDate, endDate)
  
  // Group by date
  const eventsByDate = new Map<string, GoogleCalendarEvent[]>()
  
  events.forEach(event => {
    const dateStr = event.start.dateTime 
      ? new Date(event.start.dateTime).toISOString().split('T')[0]
      : event.start.date || ''
    
    if (!dateStr) return
    
    if (!eventsByDate.has(dateStr)) {
      eventsByDate.set(dateStr, [])
    }
    eventsByDate.get(dateStr)!.push(event)
  })
  
  return eventsByDate
}

/**
 * Import events from ALL connected accounts for a date range
 */
export async function importEventsFromAllAccounts(
  startDate: Date,
  endDate: Date
): Promise<Map<string, GoogleCalendarEvent[]>> {
  const accounts = await getAllValidAccessTokens()
  
  if (accounts.length === 0) {
    throw new Error('No connected Google Calendar accounts')
  }
  
  // Fetch events from all accounts in parallel
  const allEventsPromises = accounts.map(async (account) => {
    try {
      const events = await getEventsWithToken(account.token, 'primary', startDate, endDate)
      // Add account metadata to each event
      return events.map(event => ({
        ...event,
        accountEmail: account.email,
        accountLabel: account.label,
        accountColor: account.color,
      }))
    } catch (error) {
      console.error(`Error fetching events from ${account.email}:`, error)
      return [] // Return empty array on error, don't fail completely
    }
  })
  
  const allEventsArrays = await Promise.all(allEventsPromises)
  const allEvents = allEventsArrays.flat()
  
  // Group by date
  const eventsByDate = new Map<string, GoogleCalendarEvent[]>()
  
  allEvents.forEach(event => {
    const dateStr = event.start.dateTime 
      ? new Date(event.start.dateTime).toISOString().split('T')[0]
      : event.start.date || ''
    
    if (!dateStr) return
    
    if (!eventsByDate.has(dateStr)) {
      eventsByDate.set(dateStr, [])
    }
    eventsByDate.get(dateStr)!.push(event)
  })
  
  // Sort events within each date by start time
  eventsByDate.forEach((events, date) => {
    events.sort((a, b) => {
      const aTime = a.start.dateTime || a.start.date || ''
      const bTime = b.start.dateTime || b.start.date || ''
      return aTime.localeCompare(bTime)
    })
  })
  
  return eventsByDate
}

/**
 * Get events using a specific access token (for multi-account support)
 */
export async function getEventsWithToken(
  accessToken: string,
  calendarId: string = 'primary',
  timeMin: Date,
  timeMax: Date,
  maxResults: number = 250
): Promise<GoogleCalendarEvent[]> {
  const params = new URLSearchParams({
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
    maxResults: maxResults.toString(),
    singleEvents: 'true',
    orderBy: 'startTime',
  })

  const response = await fetch(
    `${CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  )

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }))
    throw new Error(error.error?.message || `API error: ${response.status}`)
  }

  const data = await response.json()
  return data.items || []
}

/**
 * Convert a Stoic Mirror block to Google Calendar event format
 */
export function blockToGoogleEvent(
  block: { identity: string; start: string; end: string; optional?: boolean },
  date: string // YYYY-MM-DD
): Omit<GoogleCalendarEvent, 'id'> {
  const [year, month, day] = date.split('-').map(Number)
  const [startHour, startMin] = block.start.split(':').map(Number)
  const [endHour, endMin] = block.end.split(':').map(Number)
  
  const startDateTime = new Date(year, month - 1, day, startHour, startMin)
  const endDateTime = new Date(year, month - 1, day, endHour, endMin)
  
  return {
    summary: block.identity,
    description: `Stoic Mirror: ${block.identity}${block.optional ? ' (optional)' : ''}`,
    start: {
      dateTime: startDateTime.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    end: {
      dateTime: endDateTime.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
  }
}

/**
 * Convert Google Calendar event to time for display
 */
export function googleEventToTimeRange(event: GoogleCalendarEvent): { start: string; end: string } | null {
  if (!event.start.dateTime || !event.end.dateTime) {
    // All-day event
    return null
  }
  
  const start = new Date(event.start.dateTime)
  const end = new Date(event.end.dateTime)
  
  return {
    start: `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`,
    end: `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`,
  }
}

