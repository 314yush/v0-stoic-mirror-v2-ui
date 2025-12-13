/**
 * Calendar Store
 * Manages Google Calendar integration state using REST API
 */

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { storage } from './storage'
import { 
  hasValidTokens,
  loadTokens,
  clearTokens,
} from './google-oauth-electron'
import {
  getEvents,
  importEventsForDateRange,
  createEvent,
  updateEvent,
  deleteEvent,
  type GoogleCalendarEvent
} from './google-calendar-api'

interface CalendarState {
  // Connection state
  isConnected: boolean
  lastSyncTime: string | null
  
  // Imported events (cached)
  importedEvents: Record<string, GoogleCalendarEvent[]> // date (YYYY-MM-DD) -> events
  
  // Exported block mappings
  exportedBlockIds: Record<string, string> // blockId -> googleEventId
  
  // Actions
  checkConnection: () => void
  importEvents: (startDate: Date, endDate: Date) => Promise<void>
  getEventsForDate: (date: string) => GoogleCalendarEvent[]
  exportBlock: (block: { id: string; identity: string; start: string; end: string; optional?: boolean }, date: string) => Promise<string | null>
  updateExportedBlock: (blockId: string, block: { identity: string; start: string; end: string; optional?: boolean }, date: string) => Promise<void>
  deleteExportedBlock: (blockId: string) => Promise<void>
  syncEvents: () => Promise<void>
  clearImportedEvents: () => void
  disconnect: () => void
}

// Custom storage adapter for Zustand
const zustandStorage = {
  getItem: (name: string): string | null => {
    const value = storage.get(name)
    return value ? JSON.stringify(value) : null
  },
  setItem: (name: string, value: string): void => {
    storage.set(name, JSON.parse(value))
  },
  removeItem: (name: string): void => {
    storage.remove(name)
  },
}

export const useCalendarStore = create<CalendarState>()(
  persist(
    (set, get) => ({
      isConnected: false,
      lastSyncTime: null,
      importedEvents: {},
      exportedBlockIds: {},

      checkConnection: () => {
        const connected = hasValidTokens()
        set({ isConnected: connected })
      },

      importEvents: async (startDate: Date, endDate: Date) => {
        if (!hasValidTokens()) {
          throw new Error('Not connected to Google Calendar')
        }

        try {
          const eventsByDate = await importEventsForDateRange(startDate, endDate)
          
          // Merge with existing events
          const currentEvents = { ...get().importedEvents }
          
          eventsByDate.forEach((events, date) => {
            currentEvents[date] = events
          })

          set({ 
            importedEvents: currentEvents,
            lastSyncTime: new Date().toISOString(),
            isConnected: true
          })
        } catch (error) {
          console.error('Error importing events:', error)
          throw error
        }
      },

      getEventsForDate: (date: string) => {
        return get().importedEvents[date] || []
      },

      exportBlock: async (block, date) => {
        if (!hasValidTokens()) {
          return null
        }

        try {
          // Convert block to Google Calendar event format
          const [year, month, day] = date.split('-').map(Number)
          const [startHour, startMin] = block.start.split(':').map(Number)
          const [endHour, endMin] = block.end.split(':').map(Number)

          const startDateTime = new Date(year, month - 1, day, startHour, startMin)
          const endDateTime = new Date(year, month - 1, day, endHour, endMin)

          const event = await createEvent('primary', {
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
          })

          // Save mapping
          const exportedIds = { ...get().exportedBlockIds }
          exportedIds[block.id] = event.id
          set({ exportedBlockIds: exportedIds })

          return event.id
        } catch (error) {
          console.error('Error exporting block:', error)
          return null
        }
      },

      updateExportedBlock: async (blockId, block, date) => {
        if (!hasValidTokens()) {
          return
        }

        const exportedIds = get().exportedBlockIds
        const eventId = exportedIds[blockId]
        if (!eventId) {
          return
        }

        try {
          const [year, month, day] = date.split('-').map(Number)
          const [startHour, startMin] = block.start.split(':').map(Number)
          const [endHour, endMin] = block.end.split(':').map(Number)

          const startDateTime = new Date(year, month - 1, day, startHour, startMin)
          const endDateTime = new Date(year, month - 1, day, endHour, endMin)

          await updateEvent('primary', eventId, {
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
          })
        } catch (error) {
          console.error('Error updating exported block:', error)
        }
      },

      deleteExportedBlock: async (blockId) => {
        if (!hasValidTokens()) {
          return
        }

        const exportedIds = get().exportedBlockIds
        const eventId = exportedIds[blockId]
        if (!eventId) {
          return
        }

        try {
          await deleteEvent('primary', eventId)
          
          const newExportedIds = { ...exportedIds }
          delete newExportedIds[blockId]
          set({ exportedBlockIds: newExportedIds })
        } catch (error) {
          console.error('Error deleting exported block:', error)
        }
      },

      syncEvents: async () => {
        // Sync imported events (refresh from Google Calendar)
        const startDate = new Date()
        startDate.setDate(startDate.getDate() - 7) // Last week
        const endDate = new Date()
        endDate.setDate(endDate.getDate() + 30) // Next month
        
        await get().importEvents(startDate, endDate)
      },

      clearImportedEvents: () => {
        set({ importedEvents: {} })
      },

      disconnect: () => {
        clearTokens()
        set({
          isConnected: false,
          importedEvents: {},
          exportedBlockIds: {},
          lastSyncTime: null,
        })
      },
    }),
    {
      name: 'calendar_state_v2',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        importedEvents: state.importedEvents,
        exportedBlockIds: state.exportedBlockIds,
        lastSyncTime: state.lastSyncTime,
      }),
    }
  )
)




