/**
 * Time by Identity
 * 
 * Shows how time was distributed across identities this week.
 * Minimal bar chart design.
 */

import { useMemo } from "react"
import { useScheduleStore } from "../../lib/schedule-store"
import { getDateStrLocal } from "../../lib/date-utils"

interface IdentityTime {
  identity: string
  hours: number
  percentage: number
}

export function TimeByIdentity() {
  const commits = useScheduleStore(state => state.commits)
  
  const identityTimes = useMemo(() => {
    const today = new Date()
    const weekAgo = new Date(today)
    weekAgo.setDate(weekAgo.getDate() - 7)
    
    // Get this week's committed blocks
    const thisWeekCommits = commits.filter(c => {
      const date = new Date(c.date + "T00:00:00")
      return date >= weekAgo && date <= today && c.committed
    })
    
    const blocks = thisWeekCommits.flatMap(c => c.blocks)
    
    // Group by identity and sum hours
    const timeByIdentity = new Map<string, number>()
    let totalMinutes = 0
    
    for (const block of blocks) {
      const identity = block.identity || "Other"
      
      // Calculate duration
      const [startH, startM] = block.start.split(":").map(Number)
      const [endH, endM] = block.end.split(":").map(Number)
      const startMins = startH * 60 + startM
      const endMins = endH * 60 + endM
      const duration = endMins - startMins
      
      timeByIdentity.set(identity, (timeByIdentity.get(identity) || 0) + duration)
      totalMinutes += duration
    }
    
    // Convert to array and sort by hours descending
    const result: IdentityTime[] = Array.from(timeByIdentity.entries())
      .map(([identity, minutes]) => ({
        identity,
        hours: minutes / 60,
        percentage: totalMinutes > 0 ? Math.round((minutes / totalMinutes) * 100) : 0
      }))
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 5) // Top 5 identities
    
    return result
  }, [commits])
  
  const maxHours = Math.max(...identityTimes.map(t => t.hours), 1)
  
  if (identityTimes.length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg p-5">
        <div className="text-sm font-medium text-foreground mb-4">Time Invested</div>
        <p className="text-sm text-muted-foreground">
          No committed schedules this week.
        </p>
      </div>
    )
  }
  
  return (
    <div className="bg-card border border-border rounded-lg p-5">
      <div className="text-sm font-medium text-foreground mb-4">Time Invested</div>
      
      <div className="space-y-3">
        {identityTimes.map((item) => (
          <div key={item.identity} className="space-y-1">
            {/* Label row */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-foreground truncate max-w-[60%]">
                {item.identity}
              </span>
              <span className="text-muted-foreground">
                {item.hours.toFixed(1)} hrs
              </span>
            </div>
            
            {/* Bar */}
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary/60 rounded-full transition-all duration-500"
                style={{ width: `${(item.hours / maxHours) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}




