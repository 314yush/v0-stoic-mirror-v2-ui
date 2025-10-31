"use client"

import { useState, useEffect } from "react"
import { JournalEditor } from "./journal-editor"
import { MoodSelector } from "./mood-selector"
import { TagChips } from "./tag-chips"
import { AIPanel } from "./ai-panel"
import { JournalList } from "./journal-list"
import { SearchBar } from "./search-bar"
import { TimelineView } from "./timeline-view"
import { WeeklySnapshot } from "./weekly-snapshot"
import { useToastStore } from "@/components/toasts"

export interface JournalEntry {
  id: string
  content: string
  mood: string
  tags: string[]
  sensitive: boolean
  visibility: "private" | "shared"
  aiSummary?: string
  createdAt: Date
}

const MOCK_ENTRIES: JournalEntry[] = [
  {
    id: "1",
    content: "Had a really productive day today. Finished the project ahead of schedule.",
    mood: "😌",
    tags: ["Work", "Gratitude"],
    sensitive: false,
    visibility: "private",
    aiSummary: "Feeling accomplished and grateful for productivity",
    createdAt: new Date("2025-01-28"),
  },
  {
    id: "2",
    content: "Feeling a bit overwhelmed with everything going on. Need to take a step back.",
    mood: "😣",
    tags: ["Anxiety", "Work"],
    sensitive: true,
    visibility: "private",
    createdAt: new Date("2025-01-27"),
  },
  {
    id: "3",
    content: "Great workout session! Feeling energized and ready for the week.",
    mood: "🙂",
    tags: ["Energy", "Health"],
    sensitive: false,
    visibility: "private",
    aiSummary: "Energized and motivated from physical activity",
    createdAt: new Date("2025-01-26"),
  },
]

export function JournalTab() {
  const [content, setContent] = useState("")
  const [mood, setMood] = useState("😌")
  const [tags, setTags] = useState<string[]>([])
  const [sensitive, setSensitive] = useState(false)
  const [visibility, setVisibility] = useState<"private" | "shared">("private")
  const [entries, setEntries] = useState<JournalEntry[]>(MOCK_ENTRIES)
  const [showAIPanel, setShowAIPanel] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterMood, setFilterMood] = useState<string | null>(null)
  const [filterTag, setFilterTag] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<"list" | "timeline" | "weekly">("list")
  const [isLocked, setIsLocked] = useState(false)
  const { addToast } = useToastStore()

  const handleSave = () => {
    if (!content.trim()) {
      addToast("Entry cannot be empty", "error")
      return
    }

    const newEntry: JournalEntry = {
      id: Math.random().toString(36).substring(7),
      content,
      mood,
      tags,
      sensitive,
      visibility,
      createdAt: new Date(),
    }

    setEntries([newEntry, ...entries])
    setContent("")
    setTags([])
    setSensitive(false)
    setVisibility("private")
    addToast("Saved. Future-You can return anytime.")
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey

      if (isMod && e.key === "s") {
        e.preventDefault()
        handleSave()
      } else if (e.key === "Escape") {
        setShowAIPanel(false)
      } else if (isMod && e.key === "l") {
        e.preventDefault()
        setIsLocked(!isLocked)
        addToast(isLocked ? "Content unlocked" : "Content locked")
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [content, mood, tags, sensitive, visibility, isLocked])

  const filteredEntries = entries.filter((entry) => {
    if (searchQuery && !entry.content.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false
    }
    if (filterMood && entry.mood !== filterMood) {
      return false
    }
    if (filterTag && !entry.tags.includes(filterTag)) {
      return false
    }
    return true
  })

  return (
    <div className="h-full flex">
      <div className="flex-1 flex flex-col">
        <div className="border-b border-border px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-foreground">Journal</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode("list")}
              className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                viewMode === "list"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              List
            </button>
            <button
              onClick={() => setViewMode("timeline")}
              className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                viewMode === "timeline"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Timeline
            </button>
            <button
              onClick={() => setViewMode("weekly")}
              className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                viewMode === "weekly"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Weekly
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <div className={`max-w-3xl mx-auto px-6 py-6 space-y-6 ${isLocked ? "blur-md" : ""}`}>
            {isLocked ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center space-y-2">
                  <p className="text-muted-foreground">Content locked</p>
                  <p className="text-xs text-muted-foreground">Press Cmd+L to unlock</p>
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  <JournalEditor value={content} onChange={setContent} />

                  <div className="flex items-center gap-4">
                    <MoodSelector value={mood} onChange={setMood} />
                    <TagChips value={tags} onChange={setTags} />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                        <input
                          type="checkbox"
                          checked={sensitive}
                          onChange={(e) => setSensitive(e.target.checked)}
                          className="rounded border-border"
                        />
                        Sensitive entry
                      </label>
                      <select
                        value={visibility}
                        onChange={(e) => setVisibility(e.target.value as "private" | "shared")}
                        className="px-2 py-1 text-sm bg-card border border-border rounded-md text-foreground"
                      >
                        <option value="private">Private</option>
                        <option value="shared">Shared</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowAIPanel(!showAIPanel)}
                        className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Write with AI
                      </button>
                      <button
                        onClick={handleSave}
                        className="px-4 py-1.5 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                      >
                        Save Entry
                      </button>
                    </div>
                  </div>
                </div>

                <div className="border-t border-border pt-6 space-y-4">
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
                      <JournalList entries={filteredEntries} />
                    </>
                  )}
                  {viewMode === "timeline" && <TimelineView entries={entries} />}
                  {viewMode === "weekly" && <WeeklySnapshot entries={entries} />}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {showAIPanel && (
        <AIPanel
          content={content}
          onClose={() => setShowAIPanel(false)}
          onApplySummary={(summary, suggestedTags) => {
            // Apply AI-generated summary and tags
            setTags([...new Set([...tags, ...suggestedTags])])
            addToast("AI suggestions applied")
          }}
        />
      )}
    </div>
  )
}
