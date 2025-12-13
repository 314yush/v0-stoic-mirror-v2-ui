import type { JournalEntry } from "./journal-tab"

interface WeeklySnapshotProps {
  entries: JournalEntry[]
}

export function WeeklySnapshot({ entries }: WeeklySnapshotProps) {
  // Calculate stats from last 7 days
  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const recentEntries = entries.filter((e) => e.createdAt >= sevenDaysAgo)

  // Most frequent moods
  const moodCounts = recentEntries.reduce(
    (acc, entry) => {
      acc[entry.mood] = (acc[entry.mood] || 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )
  const topMoods = Object.entries(moodCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)

  // Top themes (tags)
  const tagCounts = recentEntries.reduce(
    (acc, entry) => {
      entry.tags.forEach((tag) => {
        acc[tag] = (acc[tag] || 0) + 1
      })
      return acc
    },
    {} as Record<string, number>,
  )
  const topThemes = Object.entries(tagCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)

  // Representative entries (most recent with different moods)
  const representativeEntries = recentEntries.slice(0, 3)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Weekly Snapshot</h3>
        <p className="text-xs text-muted-foreground">Last 7 days</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* Most frequent feelings */}
        <div className="p-4 bg-card border border-border rounded-lg">
          <h4 className="text-sm font-medium text-muted-foreground mb-3">Most Frequent Feelings</h4>
          {topMoods.length > 0 ? (
            <div className="space-y-2">
              {topMoods.map(([mood, count]) => (
                <div key={mood} className="flex items-center justify-between">
                  <span className="text-2xl">{mood}</span>
                  <span className="text-sm text-muted-foreground">{count}x</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No entries this week</p>
          )}
        </div>

        {/* Top themes */}
        <div className="p-4 bg-card border border-border rounded-lg">
          <h4 className="text-sm font-medium text-muted-foreground mb-3">Top Themes</h4>
          {topThemes.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {topThemes.map(([tag, count]) => (
                <span key={tag} className="px-2 py-1 text-xs bg-primary/20 text-primary rounded">
                  {tag} ({count})
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No themes yet</p>
          )}
        </div>
      </div>

      {/* Kind suggestion */}
      <div className="p-4 bg-secondary/50 border border-border rounded-lg">
        <h4 className="text-sm font-medium text-foreground mb-2">One Kind Suggestion for Next Week</h4>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {recentEntries.length > 0
            ? "You've been showing up for yourself. Keep making space for these reflections—they matter."
            : "Consider starting small: just one thought, one feeling, one moment. That's enough."}
        </p>
      </div>

      {/* Representative entries */}
      {representativeEntries.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">Recent Reflections</h4>
          {representativeEntries.map((entry) => (
            <div key={entry.id} className="p-3 bg-card border border-border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{entry.mood}</span>
                <span className="text-xs text-muted-foreground">{entry.createdAt.toLocaleDateString()}</span>
              </div>
              <p className="text-sm text-foreground line-clamp-2">{entry.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
