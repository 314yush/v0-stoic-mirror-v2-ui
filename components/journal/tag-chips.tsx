"use client"

import { useState } from "react"

const PRESET_TAGS = ["Energy", "Anxiety", "Work", "Relationships", "Health", "Idea", "Gratitude"]

interface TagChipsProps {
  value: string[]
  onChange: (tags: string[]) => void
}

export function TagChips({ value, onChange }: TagChipsProps) {
  const [customTag, setCustomTag] = useState("")

  const toggleTag = (tag: string) => {
    if (value.includes(tag)) {
      onChange(value.filter((t) => t !== tag))
    } else {
      onChange([...value, tag])
    }
  }

  const addCustomTag = () => {
    if (customTag.trim() && !value.includes(customTag.trim())) {
      onChange([...value, customTag.trim()])
      setCustomTag("")
    }
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-sm text-muted-foreground">Tags:</span>
      {PRESET_TAGS.map((tag) => (
        <button
          key={tag}
          onClick={() => toggleTag(tag)}
          className={`px-2 py-1 text-xs rounded-md transition-colors ${
            value.includes(tag)
              ? "bg-primary/20 text-primary"
              : "bg-secondary text-muted-foreground hover:text-foreground"
          }`}
        >
          {tag}
        </button>
      ))}
      <input
        type="text"
        value={customTag}
        onChange={(e) => setCustomTag(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && addCustomTag()}
        placeholder="Custom tag..."
        className="w-24 px-2 py-1 text-xs bg-input border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
      />
    </div>
  )
}
