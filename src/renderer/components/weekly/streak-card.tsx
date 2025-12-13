import { useMemo } from "react"
import { useScheduleStore, type DayCommit } from "../../lib/schedule-store"

interface StreakData {
  identity: string
  current: number
  best: number
}

// Calculate streaks for each identity
function calculateStreaks(commits: DayCommit[]): StreakData[] {
  const identityStreaks = new Map<string, { current: number; best: number; lastBreakDate: string | null }>()
  
  // Process commits in chronological order (oldest first)
  const sortedCommits = [...commits].sort((a, b) => a.date.localeCompare(b.date))
  
  for (const commit of sortedCommits) {
    if (!commit.committed) continue
    
    for (const block of commit.blocks) {
      const identity = block.identity
      if (!identityStreaks.has(identity)) {
        identityStreaks.set(identity, { current: 0, best: 0, lastBreakDate: null })
      }
      
      const streak = identityStreaks.get(identity)!
      const wasCompleted = block.completed === true
      
      if (wasCompleted) {
        streak.current++
        streak.best = Math.max(streak.best, streak.current)
      } else {
        // Streak broken
        streak.current = 0
        streak.lastBreakDate = commit.date
      }
    }
  }
  
  // Convert to array and sort by best streak
  return Array.from(identityStreaks.entries())
    .map(([identity, data]) => ({
      identity,
      current: data.current,
      best: data.best,
    }))
    .filter((s) => s.best > 0) // Only show identities with at least one completed block
    .sort((a, b) => b.best - a.best)
    .slice(0, 5) // Top 5
}

export function StreakCard() {
  const { commits } = useScheduleStore()
  const streaks = useMemo(() => calculateStreaks(commits), [commits])

  return (
    <div className="p-4 bg-card border border-border rounded-lg">
      <h3 className="text-sm font-semibold text-foreground mb-4">Routine Streaks</h3>
      {streaks.length > 0 ? (
        <div className="space-y-3">
          {streaks.map((streak) => (
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
                  style={{ width: streak.best > 0 ? `${(streak.current / streak.best) * 100}%` : 0 }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Start committing schedules to track your streaks</p>
      )}
    </div>
  )
}
