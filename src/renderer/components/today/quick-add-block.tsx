
import type React from "react"

import { useState } from "react"
import type { TimeBlock } from "./today-tab"

interface QuickAddBlockProps {
  onAdd: (block: Omit<TimeBlock, "id">) => void
  onCancel: () => void
}

export function QuickAddBlock({ onAdd, onCancel }: QuickAddBlockProps) {
  const [identity, setIdentity] = useState("")
  const [start, setStart] = useState("09:00")
  const [end, setEnd] = useState("10:00")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (identity.trim()) {
      onAdd({ identity, start, end })
      setIdentity("")
      setStart("09:00")
      setEnd("10:00")
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-card border border-border rounded-lg p-4 space-y-3">
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">Identity</label>
        <input
          type="text"
          value={identity}
          onChange={(e) => setIdentity(e.target.value)}
          placeholder="e.g., Deep Work, Exercise"
          className="w-full px-3 py-2 bg-input border border-border rounded-md placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          style={{ color: 'var(--color-foreground)' }}
          autoFocus
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Start</label>
          <input
            type="time"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="w-full px-3 py-2 bg-input border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            style={{ color: 'var(--color-foreground)' }}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">End</label>
          <input
            type="time"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="w-full px-3 py-2 bg-input border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            style={{ color: 'var(--color-foreground)' }}
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="submit"
          className="flex-1 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
        >
          Add Block
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
