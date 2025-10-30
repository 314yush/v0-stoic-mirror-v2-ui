"use client"

import { useState, useEffect } from "react"
import { JournalEditor } from "./journal-editor"
import { MoodSelector } from "./mood-selector"
import { TagChips } from "./tag-chips"
import { AIPanel } from "./ai-panel"
import { JournalList } from "./journal-list"
import { SearchBar } from "./search-bar"
import { useToastStore } from "@/components/toasts"

export interface JournalEntry {
  id: string
  content: string
  mood: string
  tags: string[]
  sensitive: boolean
  createdAt: Date
}

const MOCK_ENTRIES: JournalEntry[] = [
  {
    id: "1",
    content: "Had a really productive day today. Finished the project ahead of schedule.",
    mood: "😌",
    tags: ["Work", "Gratitude"],
    sensitive: false,
    createdAt: new Date("2025-01-28"),
  },
  {
    id: "2",
    content: "Feeling a bit overwhelmed with everything going on. Need to take a step back.",
    mood: "😣",
    tags: ["Anxiety", "Work"],
    sensitive: true,
    createdAt: new Date("2025-01-27"),
  },
  {
    id: "3",
    content: "Great workout session! Feeling energized and ready for the week.",
    mood: "🙂",
    tags: ["Energy", "Health"],
    sensitive: false,
    createdAt: new Date("2025-01-26"),
  },
]

export function JournalTab() {
  const [content, setContent] = useState("")
  const [mood, setMood] = useState("😌")
  const [tags, setTags] = useState<string[]>([])
  const [sensitive, setSensitive] = useState(false)
  const [entries, setEntries] = useState<JournalEntry[]>(MOCK_ENTRIES)
  const [showAIPanel, setShowAIPanel] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterMood, setFilterMood] = useState<string | null>(null)
  const [filterTag, setFilterTag] = useState<string | null>(null)
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
      createdAt: new Date(),
    }

    setEntries([newEntry, ...entries])
    setContent("")
    setTags([])
    setSensitive(false)
    addToast("Entry saved")
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey

      if (isMod && e.key === "s") {
        e.preventDefault()
        handleSave()
      } else if (e.key === "Escape") {
        setShowAIPanel(false)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [content, mood, tags, sensitive])

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
        <div className="border-b border-border px-6 py-4">
          <h2 className="text-xl font-semibold text-foreground">Journal</h2>
        </div>

        <div className="flex-1 overflow-auto">
          <div className="max-w-3xl mx-auto px-6 py-6 space-y-6">
            <div className="space-y-4">
              <JournalEditor value={content} onChange={setContent} />

              <div className="flex items-center gap-4">
                <MoodSelector value={mood} onChange={setMood} />
                <TagChips value={tags} onChange={setTags} />
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sensitive}
                    onChange={(e) => setSensitive(e.target.checked)}
                    className="rounded border-border"
                  />
                  Mark as sensitive
                </label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowAIPanel(!showAIPanel)}
                    className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    AI Assistant
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
              <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                filterMood={filterMood}
                onFilterMood={setFilterMood}
                filterTag={filterTag}
                onFilterTag={setFilterTag}
              />
              <JournalList entries={filteredEntries} />
            </div>
          </div>
        </div>
      </div>

      {showAIPanel && <AIPanel content={content} onClose={() => setShowAIPanel(false)} />}
    </div>
  )
}
