import { useState } from "react"
import { useJournalStore } from "../../lib/journal-store"
import { useToastStore } from "../toasts"

interface FreeFormJournalProps {
  onSave?: () => void
}

export function FreeFormJournal({ onSave }: FreeFormJournalProps) {
  const [text, setText] = useState("")
  const { addEntry } = useJournalStore()
  const { addToast } = useToastStore()

  const handleSave = async () => {
    if (!text.trim()) {
      addToast("Write something before saving", "info")
      return
    }
    
    try {
      const entry = addEntry({
        content: text,
        tags: [],
        is_sensitive: false,
        visibility: "private",
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
      
      setText("")
      onSave?.()
    } catch (error) {
      console.error("Failed to save entry:", error)
      addToast("Failed to save entry", "error")
    }
  }

  return (
    <div className="h-full flex flex-col p-6">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Write messy. You can organize later..."
        className="flex-1 w-full p-4 bg-secondary border border-border rounded-lg text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary"
      />
      <div className="flex items-center justify-end gap-2 mt-4">
        <button
          onClick={handleSave}
          disabled={!text.trim()}
          className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Save
        </button>
      </div>
    </div>
  )
}

