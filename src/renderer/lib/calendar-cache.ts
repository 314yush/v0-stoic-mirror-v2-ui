/**
 * Calendar Events Cache
 * 
 * Caches Google Calendar events to reduce loading delays.
 * Pre-fetches today and surrounding days on app load.
 */

import { create } from "zustand"
import { importEventsFromAllAccounts, googleEventToTimeRange, type GoogleCalendarEvent, type GoogleCalendarAttendee } from "./google-calendar-api"
import { loadAccounts } from "./google-oauth-electron"
import { getDateStrLocal } from "./date-utils"

export interface CalendarEvent {
  id: string
  title: string
  start: string
  end: string
  isAllDay: boolean
  accountEmail?: string
  accountLabel?: string
  accountColor?: string
  description?: string
  location?: string
  htmlLink?: string
  meetingLink?: string
  meetingProvider?: string
  attendees?: GoogleCalendarAttendee[]
  organizer?: {
    email: string
    displayName?: string
    self?: boolean
  }
}

interface CacheEntry {
  events: CalendarEvent[]
  fetchedAt: number
}

interface CalendarCacheState {
  cache: Map<string, CacheEntry>
  loading: Set<string>
  
  getEvents: (dateStr: string) => CalendarEvent[] | null
  fetchAndCache: (dateStr: string) => Promise<CalendarEvent[]>
  prefetch: () => Promise<void>
  invalidate: (dateStr?: string) => void
}

// Cache expires after 5 minutes
const CACHE_TTL_MS = 5 * 60 * 1000

function processGoogleEvents(events: GoogleCalendarEvent[]): CalendarEvent[] {
  const calEvents: CalendarEvent[] = []
  
  for (const event of events) {
    const timeRange = googleEventToTimeRange(event)
    if (!timeRange) continue // Skip all-day events
    
    // Extract meeting link
    let meetingLink = event.hangoutLink
    let meetingProvider = meetingLink ? 'Google Meet' : undefined
    
    if (event.conferenceData?.entryPoints) {
      const videoEntry = event.conferenceData.entryPoints.find(
        ep => ep.entryPointType === 'video'
      )
      if (videoEntry) {
        meetingLink = videoEntry.uri
        meetingProvider = event.conferenceData.conferenceSolution?.name || 'Video Call'
      }
    }
    
    calEvents.push({
      id: event.id,
      title: event.summary,
      start: timeRange.start,
      end: timeRange.end,
      isAllDay: false,
      accountEmail: event.accountEmail,
      accountLabel: event.accountLabel,
      accountColor: event.accountColor,
      description: event.description,
      location: event.location,
      htmlLink: event.htmlLink,
      meetingLink,
      meetingProvider,
      attendees: event.attendees,
      organizer: event.organizer,
    })
  }
  
  return calEvents
}

export const useCalendarCache = create<CalendarCacheState>((set, get) => ({
  cache: new Map(),
  loading: new Set(),
  
  getEvents: (dateStr: string) => {
    const entry = get().cache.get(dateStr)
    if (!entry) return null
    
    if (Date.now() - entry.fetchedAt > CACHE_TTL_MS) {
      return null
    }
    
    return entry.events
  },
  
  fetchAndCache: async (dateStr: string) => {
    // Check cache first
    const cached = get().getEvents(dateStr)
    if (cached !== null) {
      return cached
    }
    
    // Check if already loading
    if (get().loading.has(dateStr)) {
      return new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          const entry = get().cache.get(dateStr)
          if (entry && !get().loading.has(dateStr)) {
            clearInterval(checkInterval)
            resolve(entry.events)
          }
        }, 100)
        setTimeout(() => {
          clearInterval(checkInterval)
          resolve([])
        }, 10000)
      })
    }
    
    // Check for accounts
    const accounts = loadAccounts()
    if (accounts.length === 0) {
      return []
    }
    
    // Mark as loading
    set(state => ({
      loading: new Set([...state.loading, dateStr])
    }))
    
    try {
      // Parse date
      const [year, month, day] = dateStr.split("-").map(Number)
      const startDate = new Date(year, month - 1, day, 0, 0, 0, 0)
      const endDate = new Date(year, month - 1, day, 23, 59, 59, 999)
      
      // Fetch from all accounts
      const eventsByDate = await importEventsFromAllAccounts(startDate, endDate)
      const rawEvents = eventsByDate.get(dateStr) || []
      
      // Process events
      const events = processGoogleEvents(rawEvents)
      
      // Cache the result
      const newCache = new Map(get().cache)
      newCache.set(dateStr, {
        events,
        fetchedAt: Date.now()
      })
      
      set(state => ({
        cache: newCache,
        loading: new Set([...state.loading].filter(d => d !== dateStr))
      }))
      
      return events
    } catch (error) {
      console.error("[Calendar Cache] Fetch error:", error)
      
      set(state => ({
        loading: new Set([...state.loading].filter(d => d !== dateStr))
      }))
      
      return []
    }
  },
  
  prefetch: async () => {
    const accounts = loadAccounts()
    if (accounts.length === 0) {
      console.log("[Calendar Cache] No accounts, skipping prefetch")
      return
    }
    
    const today = new Date()
    const dates: string[] = []
    
    // Pre-fetch today, yesterday, and tomorrow
    for (let offset = -1; offset <= 1; offset++) {
      const date = new Date(today)
      date.setDate(date.getDate() + offset)
      dates.push(getDateStrLocal(date))
    }
    
    console.log("[Calendar Cache] Pre-fetching:", dates)
    
    // Fetch in parallel
    await Promise.all(dates.map(d => get().fetchAndCache(d)))
    
    console.log("[Calendar Cache] Pre-fetch complete")
  },
  
  invalidate: (dateStr?: string) => {
    if (dateStr) {
      const newCache = new Map(get().cache)
      newCache.delete(dateStr)
      set({ cache: newCache })
    } else {
      set({ cache: new Map() })
    }
  }
}))

// Hook to use cached calendar events
import { useEffect, useState } from "react"

export function useCachedCalendarEvents(dateStr: string) {
  const { getEvents, fetchAndCache, loading } = useCalendarCache()
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  useEffect(() => {
    // Try cache first
    const cached = getEvents(dateStr)
    if (cached !== null) {
      setEvents(cached)
      setIsLoading(false)
      return
    }
    
    // Fetch if not cached
    setIsLoading(true)
    fetchAndCache(dateStr).then(fetchedEvents => {
      setEvents(fetchedEvents)
      setIsLoading(false)
    })
  }, [dateStr, getEvents, fetchAndCache])
  
  return { events, loading: isLoading }
}
