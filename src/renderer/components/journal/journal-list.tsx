import type { JournalEntry } from "../../lib/journal-store"

interface JournalListProps {
  entries: JournalEntry[]
}

export function JournalList({ entries }: JournalListProps) {
  if (entries.length === 0) {
    return (
      <div className="text-center py-12 px-4">
        <p className="text-lg font-medium text-foreground mb-2">No entries found</p>
        <p className="text-sm text-muted-foreground mb-2">
          Start journaling to capture your thoughts, reflections, and insights
        </p>
        <p className="text-xs text-muted-foreground">
          Use AI mode for guided conversations or free form for unstructured writing
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {entries.map((entry) => (
        <div
          key={entry.id}
          className="card card-hover cursor-pointer"
        >
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {entry.mood && <span className="text-xl shrink-0">{entry.mood}</span>}
              {entry.title ? (
                <h3 className="text-sm font-semibold text-foreground truncate">{entry.title}</h3>
              ) : (
                <div className="flex gap-1 flex-wrap">
                  {entry.tags.map((tag) => (
                    <span key={tag} className="px-2 py-0.5 text-xs bg-primary/20 text-primary rounded">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              {entry.is_sensitive && (
                <span className="px-2 py-0.5 text-xs bg-destructive/20 text-destructive rounded shrink-0">Sensitive</span>
              )}
            </div>
            <span className="text-xs text-muted-foreground shrink-0 ml-2">{new Date(entry.created_at).toLocaleDateString()}</span>
          </div>
          <p className="text-sm text-foreground line-clamp-2">{entry.content}</p>
        </div>
      ))}
    </div>
  )
}
