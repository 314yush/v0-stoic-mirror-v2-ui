import { useMemo } from "react"
import { useRoutineAnalysis } from "../../lib/routine-analysis"
import { useScheduleStore } from "../../lib/schedule-store"
import { useSettingsStore } from "../../lib/settings-store"

export function WeeklyInsights() {
  const { routines, identityProgress, northStarIdentities } = useRoutineAnalysis()
  const { commits } = useScheduleStore()
  const { settings } = useSettingsStore()

  const insights = useMemo(() => {
    const result: string[] = []

    if (northStarIdentities.length === 0) {
      return [
        "Set your north star identity in Settings to see how your routines align with your goals"
      ]
    }

    // Identity coverage
    const coveredIdentities = identityProgress.filter(ip => ip.totalActions > 0).length
    const totalIdentities = northStarIdentities.length
    
    if (coveredIdentities < totalIdentities) {
      const uncovered = northStarIdentities.filter(
        identity => !identityProgress.find(ip => ip.identity === identity && ip.totalActions > 0)
      )
      result.push(
        `You have ${uncovered.length} north star ${uncovered.length === 1 ? 'identity' : 'identities'} with no recent activity: ${uncovered.slice(0, 2).join(', ')}${uncovered.length > 2 ? '...' : ''}`
      )
    }

    // Best performing identity
    const bestIdentity = identityProgress.reduce((best, current) => 
      current.score > best.score ? current : best,
      identityProgress[0]
    )
    
    if (bestIdentity && bestIdentity.score > 0) {
      result.push(
        `Your "${bestIdentity.identity}" identity is strongest with ${bestIdentity.totalActions} total actions and ${bestIdentity.recentActivity} this week`
      )
    }

    // Routine insights
    const establishedCount = routines.filter(r => r.status === 'established').length
    const emergingCount = routines.filter(r => r.status === 'emerging').length
    const almostCount = routines.filter(r => r.status === 'almost').length
    const fadingCount = routines.filter(r => r.status === 'fading').length
    
    if (establishedCount > 0) {
      result.push(
        `You have ${establishedCount} ${establishedCount === 1 ? 'routine' : 'routines'} that ${establishedCount === 1 ? 'has' : 'have'} become consistent habits`
      )
    }

    if (emergingCount > 0) {
      result.push(
        `${emergingCount} new ${emergingCount === 1 ? 'pattern' : 'patterns'} detected this week - keep it up!`
      )
    }

    // Almost routines - actionable insights
    if (almostCount > 0) {
      const almostRoutines = routines.filter(r => r.status === 'almost')
      const firstAlmost = almostRoutines[0]
      if (firstAlmost?.promotionProgress) {
        result.push(
          `"${firstAlmost.identity}" is almost a routine! ${firstAlmost.promotionProgress.message}.`
        )
      }
    }

    // Fading routines - gentle nudge
    if (fadingCount > 0) {
      result.push(
        `${fadingCount} ${fadingCount === 1 ? 'routine is' : 'routines are'} fading - let's get ${fadingCount === 1 ? 'it' : 'them'} back on track`
      )
    }

    // Completion insights
    const lowCompletionRoutines = routines.filter(r => r.completionRate < 50 && r.totalOccurrences > 0)
    if (lowCompletionRoutines.length > 0) {
      result.push(
        `${lowCompletionRoutines.length} ${lowCompletionRoutines.length === 1 ? 'routine' : 'routines'} ${lowCompletionRoutines.length === 1 ? 'has' : 'have'} low completion rates - consider adjusting your schedule`
      )
    }

    // Alignment insights
    const alignedRoutines = routines.filter(r => r.northStarAlignment && r.northStarAlignment.length > 0)
    if (alignedRoutines.length > 0) {
      result.push(
        `${alignedRoutines.length} of your routines align with your north star ${alignedRoutines.length === 1 ? 'identity' : 'identities'}`
      )
    } else if (routines.length > 0) {
      result.push(
        "Consider aligning your routines with your north star identities for better progress"
      )
    }

    return result.length > 0 ? result : [
      "Keep committing to your schedule to build meaningful routines"
    ]
  }, [routines, identityProgress, northStarIdentities])

  // Calculate gaps (identities with no activities)
  const gaps = useMemo(() => {
    return identityProgress.filter(ip => ip.totalActions === 0)
  }, [identityProgress])

  // Get recent week stats
  const recentWeekStats = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const sevenDaysAgo = new Date(today)
    sevenDaysAgo.setDate(today.getDate() - 7)

    const recentCommits = commits.filter(c => {
      if (!c.committed) return false
      const date = new Date(c.date)
      return date >= sevenDaysAgo
    })

    // Only count blocks that have actually passed their end time
    const now = new Date()
    // Note: 'today' is already declared above, reuse it
    
    const totalBlocks = recentCommits.reduce((sum, c) => {
      const commitDate = new Date(c.date)
      commitDate.setHours(0, 0, 0, 0)
      const isPastDate = commitDate.getTime() < today.getTime()
      
      // For past dates, count all blocks
      // For today, only count blocks that have passed their end time
      if (isPastDate) {
        return sum + c.blocks.length
      } else {
        // Today: only count blocks that have passed
        return sum + c.blocks.filter(b => {
          const [endHour, endMin] = b.end.split(":").map(Number)
          const blockEndTime = new Date()
          blockEndTime.setHours(endHour, endMin, 0, 0)
          blockEndTime.setSeconds(0, 0)
          return now.getTime() >= blockEndTime.getTime()
        }).length
      }
    }, 0)
    
    const completedBlocks = recentCommits.reduce((sum, c) => {
      const commitDate = new Date(c.date)
      commitDate.setHours(0, 0, 0, 0)
      const isPastDate = commitDate.getTime() < today.getTime()
      
      // Only count completions for blocks that have passed their end time
      return sum + c.blocks.filter(b => {
        if (b.completed !== true) return false
        
        // For past dates, count all completions
        if (isPastDate) return true
        
        // For today, only count if block end time has passed
        const [endHour, endMin] = b.end.split(":").map(Number)
        const blockEndTime = new Date()
        blockEndTime.setHours(endHour, endMin, 0, 0)
        blockEndTime.setSeconds(0, 0)
        return now.getTime() >= blockEndTime.getTime()
      }).length
    }, 0)

    return {
      daysCommitted: recentCommits.length,
      totalBlocks,
      completedBlocks,
      adherence: totalBlocks > 0 ? Math.round((completedBlocks / totalBlocks) * 100) : 0
    }
  }, [commits])

  return (
    <div className="space-y-4">
      {/* Insights */}
      <div className="p-4 bg-card border border-border rounded-lg">
        <h3 className="text-sm font-semibold text-foreground mb-3">
          This Week's Insights
        </h3>
        <div className="space-y-2">
          {insights.map((insight, i) => (
            <p key={i} className="text-xs text-muted-foreground">
              • {insight}
            </p>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 bg-card border border-border rounded-lg text-center">
          <div className="text-lg font-semibold text-foreground">
            {recentWeekStats.daysCommitted}
          </div>
          <div className="text-[10px] text-muted-foreground">Days committed</div>
        </div>
        <div className="p-3 bg-card border border-border rounded-lg text-center">
          <div className="text-lg font-semibold text-foreground">
            {recentWeekStats.totalBlocks}
          </div>
          <div className="text-[10px] text-muted-foreground">Total blocks</div>
        </div>
        <div className="p-3 bg-card border border-border rounded-lg text-center">
          <div className="text-lg font-semibold text-primary">
            {recentWeekStats.adherence}%
          </div>
          <div className="text-[10px] text-muted-foreground">Adherence</div>
        </div>
      </div>

      {/* Gaps */}
      {gaps.length > 0 && (
        <div className="p-4 bg-card border border-border rounded-lg">
          <h3 className="text-sm font-semibold text-foreground mb-2">
            North Star Gaps
          </h3>
          <p className="text-xs text-muted-foreground mb-2">
            These identities from your north star have no recent activities:
          </p>
          <div className="flex flex-wrap gap-2">
            {gaps.map((gap) => (
              <span
                key={gap.identity}
                className="px-2 py-1 text-xs bg-secondary text-muted-foreground rounded"
              >
                {gap.identity}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

