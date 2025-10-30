"use client"

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  filterMood: string | null
  onFilterMood: (mood: string | null) => void
  filterTag: string | null
  onFilterTag: (tag: string | null) => void
}

const MOODS = ["😌", "🙂", "😐", "😣", "😡"]
const TAGS = ["Energy", "Anxiety", "Work", "Relationships", "Health", "Idea", "Gratitude"]

export function SearchBar({ value, onChange, filterMood, onFilterMood, filterTag, onFilterTag }: SearchBarProps) {
  return (
    <div className="space-y-3">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search entries..."
        className="w-full px-4 py-2 bg-input border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      />
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Mood:</span>
          <button
            onClick={() => onFilterMood(null)}
            className={`px-2 py-1 text-xs rounded ${
              !filterMood ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
            }`}
          >
            All
          </button>
          {MOODS.map((mood) => (
            <button
              key={mood}
              onClick={() => onFilterMood(mood)}
              className={`px-2 py-1 text-sm rounded ${
                filterMood === mood ? "bg-primary/20 ring-2 ring-primary" : "bg-secondary"
              }`}
            >
              {mood}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground">Tag:</span>
          <button
            onClick={() => onFilterTag(null)}
            className={`px-2 py-1 text-xs rounded ${
              !filterTag ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
            }`}
          >
            All
          </button>
          {TAGS.map((tag) => (
            <button
              key={tag}
              onClick={() => onFilterTag(tag)}
              className={`px-2 py-1 text-xs rounded ${
                filterTag === tag ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
