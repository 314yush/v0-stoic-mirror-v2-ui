import type { JournalEntry } from "./journal-tab"

interface TimelineViewProps {
  entries: JournalEntry[]
}

export function TimelineView({ entries }: TimelineViewProps) {
  // Group entries by month
  const groupedByMonth = entries.reduce(
    (acc, entry) => {
      const monthKey = entry.createdAt.toLocaleDateString("en-US", { year: "numeric", month: "long" })
      if (!acc[monthKey]) {
        acc[monthKey] = []
      }
      acc[monthKey].push(entry)
      return acc
    },
    {} as Record<string, JournalEntry[]>,
  )

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Timeline</h3>
        <p className="text-xs text-muted-foreground">{entries.length} entries</p>
      </div>

      {Object.entries(groupedByMonth).map(([month, monthEntries]) => (
        <div key={month} className="space-y-4">
          <h4 className="text-sm font-medium text-muted-foreground">{month}</h4>

          {/* Mood dots timeline */}
          <div className="flex items-center gap-2 flex-wrap">
            {monthEntries.map((entry) => (
              <div
                key={entry.id}
                className="group relative"
                title={`${entry.createdAt.toLocaleDateString()} - ${entry.mood}`}
              >
                <div className="w-8 h-8 rounded-full bg-secondary border-2 border-border flex items-center justify-center hover:border-primary transition-colors cursor-pointer">
                  <span className="text-sm">{entry.mood}</span>
                </div>

                {/* Tooltip on hover */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                  <div className="bg-popover border border-border rounded-md shadow-lg p-2 min-w-[200px]">
                    <p className="text-xs text-muted-foreground mb-1">{entry.createdAt.toLocaleDateString()}</p>
                    <p className="text-sm text-foreground line-clamp-2">{entry.content}</p>
                    {entry.tags.length > 0 && (
                      <div className="flex gap-1 mt-2">
                        {entry.tags.map((tag) => (
                          <span key={tag} className="px-1.5 py-0.5 text-xs bg-primary/20 text-primary rounded">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {entries.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p>No entries yet. Start journaling to see your timeline.</p>
        </div>
      )}
    </div>
  )
}
