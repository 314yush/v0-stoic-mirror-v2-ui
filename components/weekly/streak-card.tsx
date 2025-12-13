const MOCK_STREAKS = [
  { identity: "Morning Routine", current: 12, best: 20 },
  { identity: "Deep Work", current: 8, best: 15 },
  { identity: "Exercise", current: 15, best: 15 },
  { identity: "Evening Wind Down", current: 20, best: 25 },
]

export function StreakCard() {
  return (
    <div className="p-4 bg-card border border-border rounded-lg">
      <h3 className="text-sm font-semibold text-foreground mb-4">Routine Streaks</h3>
      <div className="space-y-3">
        {MOCK_STREAKS.map((streak) => (
          <div key={streak.identity}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-foreground">{streak.identity}</span>
              <span className="text-xs text-muted-foreground">
                {streak.current} / {streak.best} days
              </span>
            </div>
            <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${(streak.current / streak.best) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
