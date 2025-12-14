
import { useState } from "react"
import { JournalList } from "./journal-list"
import { SearchBar } from "./search-bar"
import { TimelineView } from "./timeline-view"
import { WeeklySnapshot } from "./weekly-snapshot"
import { ChatInterface } from "./chat-interface"
import { FreeFormJournal } from "./free-form-journal"
import { useToastStore } from "../toasts"
import { useJournalStore, searchEntries, type Mood } from "../../lib/journal-store"

// Storage-backed data model lives in lib/journal-store

export function JournalTab() {
  const [searchQuery, setSearchQuery] = useState("")
  const [filterMood, setFilterMood] = useState<string | null>(null)
  const [filterTag, setFilterTag] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<"list" | "timeline" | "weekly">("list")
  const [isPastEntriesOpen, setIsPastEntriesOpen] = useState(false)
  const [aiMode, setAiMode] = useState(true) // Toggle for AI mode
  const { entries } = useJournalStore()
  const { addToast } = useToastStore()

  const handleSaveFromChat = async (content: string, mood: Mood, tags: string[], summary?: string) => {
    try {
      const { addEntry } = useJournalStore.getState()
      const entry = addEntry({
        content,
        mood,
        tags,
        is_sensitive: false,
        visibility: "private",
        ai_summary: summary,
      })
      
      // Explicitly sync to Supabase and wait for result
      const { syncJournalEntry } = await import("../../lib/sync-service")
      try {
        await syncJournalEntry(entry, "insert")
        addToast("Saved to journal and synced to cloud ✨")
      } catch (syncError) {
        // Entry is saved locally, but sync failed
        console.error("Sync error:", syncError)
        const errorMsg = syncError instanceof Error ? syncError.message : "Unknown error"
        if (errorMsg.includes("Network error") || errorMsg.includes("offline")) {
          addToast("Saved locally. Will sync when online.", "info")
        } else {
          addToast("Saved locally. Sync may retry later.", "info")
        }
      }
    } catch (error) {
      console.error("Failed to save entry:", error)
      addToast("Failed to save entry", "error")
    }
  }

  const filteredEntries = searchEntries(entries as any, {
    query: searchQuery,
    mood: (filterMood as any) || null,
    tag: filterTag,
  })

  return (
    <div className="h-full flex flex-col">
      {/* AI Mode Toggle */}
      <div className="border-b border-border px-6 py-3 pt-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Journal</h2>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Free Form</span>
          <button
            onClick={() => setAiMode(!aiMode)}
            className={`relative w-12 h-6 rounded-full transition-colors ${
              aiMode ? "bg-primary" : "bg-secondary"
            }`}
            aria-label={aiMode ? "Switch to free form journaling" : "Switch to AI mode"}
            aria-pressed={aiMode}
            role="switch"
          >
            <span
              className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                aiMode ? "translate-x-6" : "translate-x-0"
              }`}
            />
          </button>
          <span className="text-xs text-muted-foreground">AI Mode</span>
        </div>
      </div>
      
      <div className="flex-1">
        {aiMode ? (
          <ChatInterface onSaveEntry={handleSaveFromChat} />
        ) : (
          <FreeFormJournal />
        )}
      </div>
      
      {/* View past entries - collapsible */}
      <div className="border-t border-border">
        <button
          onClick={() => setIsPastEntriesOpen(!isPastEntriesOpen)}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-secondary/30 transition-colors"
          aria-label={isPastEntriesOpen ? "Collapse past entries" : "Expand past entries"}
          aria-expanded={isPastEntriesOpen}
        >
          <h2 className="text-lg font-semibold text-foreground">Past Entries</h2>
          <span className="text-muted-foreground">
            {isPastEntriesOpen ? "▼" : "▶"}
          </span>
        </button>
        
        {isPastEntriesOpen && (
          <div className="px-6 pb-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setViewMode("list")}
                  className={`btn btn-sm ${
                    viewMode === "list"
                      ? "btn-primary"
                      : "btn-ghost"
                  }`}
                >
                  List
                </button>
                <button
                  onClick={() => setViewMode("timeline")}
                  className={`btn btn-sm ${
                    viewMode === "timeline"
                      ? "btn-primary"
                      : "btn-ghost"
                  }`}
                >
                  Timeline
                </button>
                <button
                  onClick={() => setViewMode("weekly")}
                  className={`btn btn-sm ${
                    viewMode === "weekly"
                      ? "btn-primary"
                      : "btn-ghost"
                  }`}
                >
                  Weekly
                </button>
              </div>
            </div>
            
            {viewMode === "list" && (
              <>
                <SearchBar
                  value={searchQuery}
                  onChange={setSearchQuery}
                  filterMood={filterMood}
                  onFilterMood={setFilterMood}
                  filterTag={filterTag}
                  onFilterTag={setFilterTag}
                />
                <div className="max-h-64 overflow-auto mt-4">
                  <JournalList entries={filteredEntries} />
                </div>
              </>
            )}
            {viewMode === "timeline" && (
              <div className="max-h-64 overflow-auto">
                <TimelineView entries={entries as any} />
              </div>
            )}
            {viewMode === "weekly" && (
              <div className="max-h-64 overflow-auto">
                <WeeklySnapshot entries={entries as any} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
