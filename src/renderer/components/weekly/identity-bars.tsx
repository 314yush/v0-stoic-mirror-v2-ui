import { useMemo } from "react"
import { useScheduleStore, type DayCommit } from "../../lib/schedule-store"

interface IdentityAdherence {
  name: string
  adherence: number
}

function calculateIdentityAdherence(commits: DayCommit[]): IdentityAdherence[] {
  const identityStats = new Map<string, { completed: 0; total: 0 }>()
  
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  
  for (const commit of commits) {
    if (!commit.committed) continue
    
    const commitDate = new Date(commit.date)
    commitDate.setHours(0, 0, 0, 0)
    const isToday = commitDate.getTime() === today.getTime()
    
    for (const block of commit.blocks) {
      if (!identityStats.has(block.identity)) {
        identityStats.set(block.identity, { completed: 0, total: 0 })
      }
      
      const stats = identityStats.get(block.identity)!
      
      // Only count blocks that have passed their end time (for today) or all blocks (for past days)
      const [endHour, endMin] = block.end.split(":").map(Number)
      const blockEndTime = new Date(commitDate)
      blockEndTime.setHours(endHour, endMin, 0, 0)
      
      const isPastDue = !isToday || blockEndTime <= now
      
      if (isPastDue) {
        stats.total++
        if (block.completed === true) {
          stats.completed++
        }
      }
    }
  }
  
  return Array.from(identityStats.entries())
    .map(([identity, stats]) => ({
      name: identity,
      adherence: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0,
    }))
    .filter((i) => i.adherence > 0)
    .sort((a, b) => b.adherence - a.adherence)
}

export function IdentityBars() {
  const { commits } = useScheduleStore()
  const identities = useMemo(() => calculateIdentityAdherence(commits), [commits])

  return (
    <div className="p-4 bg-card border border-border rounded-lg">
      <h3 className="text-sm font-semibold text-foreground mb-4">Adherence by Identity</h3>
      {identities.length > 0 ? (
        <div className="space-y-3">
          {identities.map((identity) => (
            <div key={identity.name}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-foreground">{identity.name}</span>
                <span className="text-xs text-muted-foreground">{identity.adherence}%</span>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    identity.adherence >= 70 ? "bg-primary" : "bg-primary/50"
                  }`}
                  style={{ width: `${identity.adherence}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No adherence data yet. Start tracking your schedule commitments</p>
      )}
    </div>
  )
}
