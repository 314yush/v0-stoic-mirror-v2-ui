"use client"

const MOODS = ["😌", "🙂", "😐", "😣", "😡"]

interface MoodSelectorProps {
  value: string
  onChange: (mood: string) => void
}

export function MoodSelector({ value, onChange }: MoodSelectorProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">Mood:</span>
      <div className="flex gap-1">
        {MOODS.map((mood) => (
          <button
            key={mood}
            onClick={() => onChange(mood)}
            className={`w-10 h-10 text-xl rounded-md transition-colors ${
              value === mood ? "bg-primary/20 ring-2 ring-primary" : "bg-secondary hover:bg-secondary/80"
            }`}
          >
            {mood}
          </button>
        ))}
      </div>
    </div>
  )
}
