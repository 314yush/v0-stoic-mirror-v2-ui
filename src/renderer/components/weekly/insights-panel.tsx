import { useMemo } from "react"
import { useScheduleStore, type DayCommit } from "../../lib/schedule-store"

function generateInsights(commits: DayCommit[]): string[] {
  if (commits.length === 0) return []
  
  const committed = commits.filter((c) => c.committed)
  if (committed.length === 0) return []
  
  // Get last 7 days of commits
  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const recentCommits = committed.filter((c) => {
    const commitDate = new Date(c.date)
    return commitDate >= sevenDaysAgo
  })
  
  const insights: string[] = []
  
  if (recentCommits.length > 0) {
    // Calculate overall adherence
    let totalBlocks = 0
    let completedBlocks = 0
    
    for (const commit of recentCommits) {
      for (const block of commit.blocks) {
        const [endHour, endMin] = block.end.split(":").map(Number)
        const blockEndTime = new Date(commit.date)
        blockEndTime.setHours(endHour, endMin, 0, 0)
        
        if (blockEndTime <= now) {
          totalBlocks++
          if (block.completed === true) {
            completedBlocks++
          }
        }
      }
    }
    
    const adherence = totalBlocks > 0 ? Math.round((completedBlocks / totalBlocks) * 100) : 0
    
    if (adherence >= 80) {
      insights.push(`Great job! You're maintaining ${adherence}% adherence over the last week.`)
    } else if (adherence >= 60) {
      insights.push(`You're showing up ${recentCommits.length} days, but adherence is ${adherence}%. What's blocking you?`)
    } else if (adherence > 0) {
      insights.push(`Your adherence is ${adherence}%. Focus on completing the routines you commit to.`)
    }
    
    // Find most common identity
    const identityCounts = new Map<string, number>()
    recentCommits.forEach((commit) => {
      commit.blocks.forEach((block) => {
        identityCounts.set(block.identity, (identityCounts.get(block.identity) || 0) + 1)
      })
    })
    
    if (identityCounts.size > 0) {
      const topIdentity = Array.from(identityCounts.entries()).sort((a, b) => b[1] - a[1])[0]
      insights.push(`"${topIdentity[0]}" appears most frequently in your routines.`)
    }
  } else {
    insights.push("Start committing schedules to see insights about your patterns")
  }
  
  return insights
}

export function InsightsPanel() {
  const { commits } = useScheduleStore()
  const insights = useMemo(() => generateInsights(commits), [commits])

  return (
    <div className="p-4 bg-card border border-border rounded-lg">
      <h3 className="text-sm font-semibold text-foreground mb-4">AI Insights</h3>
      {insights.length > 0 ? (
        <ul className="space-y-2">
          {insights.map((insight, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
              <span className="text-primary mt-0.5">•</span>
              <span>{insight}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">Start committing schedules to see insights about your patterns</p>
      )}
    </div>
  )
}
