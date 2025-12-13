
interface RoutinePresetPickerProps {
  onSelect: (preset: "weekday" | "weekend") => void
}

export function RoutinePresetPicker({ onSelect }: RoutinePresetPickerProps) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-muted-foreground">Use Routine:</span>
      <button
        onClick={() => onSelect("weekday")}
        className="px-3 py-1.5 text-sm bg-secondary text-foreground rounded-md hover:bg-secondary/80 transition-colors"
      >
        Weekday
      </button>
      <button
        onClick={() => onSelect("weekend")}
        className="px-3 py-1.5 text-sm bg-secondary text-foreground rounded-md hover:bg-secondary/80 transition-colors"
      >
        Weekend
      </button>
    </div>
  )
}
