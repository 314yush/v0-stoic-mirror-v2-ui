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

  const handleSave = () => {
    if (!text.trim()) {
      addToast("Write something before saving", "info")
      return
    }
    
    addEntry({
      content: text,
      tags: [],
      is_sensitive: false,
      visibility: "private",
    })
    
    setText("")
    addToast("Saved. Future-You can return anytime.")
    onSave?.()
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

