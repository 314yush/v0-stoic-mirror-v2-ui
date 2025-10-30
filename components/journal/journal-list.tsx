import type { JournalEntry } from "./journal-tab"

interface JournalListProps {
  entries: JournalEntry[]
}

export function JournalList({ entries }: JournalListProps) {
  if (entries.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No entries found</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {entries.map((entry) => (
        <div
          key={entry.id}
          className="p-4 bg-card border border-border rounded-lg hover:border-primary/50 transition-colors cursor-pointer"
        >
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xl">{entry.mood}</span>
              <div className="flex gap-1">
                {entry.tags.map((tag) => (
                  <span key={tag} className="px-2 py-0.5 text-xs bg-primary/20 text-primary rounded">
                    {tag}
                  </span>
                ))}
              </div>
              {entry.sensitive && (
                <span className="px-2 py-0.5 text-xs bg-destructive/20 text-destructive rounded">Sensitive</span>
              )}
            </div>
            <span className="text-xs text-muted-foreground">{entry.createdAt.toLocaleDateString()}</span>
          </div>
          <p className="text-sm text-foreground line-clamp-2">{entry.content}</p>
        </div>
      ))}
    </div>
  )
}
