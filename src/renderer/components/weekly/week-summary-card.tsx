/**
 * Week Summary Card
 * 
 * Quick stats about the past 7 days.
 * Minimal design, works in light + dark mode.
 */

import { useMemo } from "react"
import { useScheduleStore } from "../../lib/schedule-store"
import { getDateStrLocal } from "../../lib/date-utils"

export function WeekSummaryCard() {
  const commits = useScheduleStore(state => state.commits)
  
  const stats = useMemo(() => {
    const today = new Date()
    const weekAgo = new Date(today)
    weekAgo.setDate(weekAgo.getDate() - 7)
    const twoWeeksAgo = new Date(today)
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)
    
    // This week's commits
    const thisWeekCommits = commits.filter(c => {
      const date = new Date(c.date + "T00:00:00")
      return date >= weekAgo && date <= today && c.committed
    })
    
    // Last week's commits (for comparison)
    const lastWeekCommits = commits.filter(c => {
      const date = new Date(c.date + "T00:00:00")
      return date >= twoWeeksAgo && date < weekAgo && c.committed
    })
    
    // Count blocks
    const thisWeekBlocks = thisWeekCommits.flatMap(c => c.blocks)
    const lastWeekBlocks = lastWeekCommits.flatMap(c => c.blocks)
    
    // Completion rate
    const answeredBlocks = thisWeekBlocks.filter(b => b.completed !== null && b.completed !== undefined)
    const completedBlocks = thisWeekBlocks.filter(b => b.completed === true)
    const completionRate = answeredBlocks.length > 0 
      ? Math.round((completedBlocks.length / answeredBlocks.length) * 100)
      : 0
    
    // Last week completion rate
    const lastAnswered = lastWeekBlocks.filter(b => b.completed !== null && b.completed !== undefined)
    const lastCompleted = lastWeekBlocks.filter(b => b.completed === true)
    const lastCompletionRate = lastAnswered.length > 0
      ? Math.round((lastCompleted.length / lastAnswered.length) * 100)
      : 0
    
    // Calculate total hours
    const calculateHours = (blocks: typeof thisWeekBlocks) => {
      return blocks.reduce((total, block) => {
        const [startH, startM] = block.start.split(":").map(Number)
        const [endH, endM] = block.end.split(":").map(Number)
        const startMins = startH * 60 + startM
        const endMins = endH * 60 + endM
        return total + (endMins - startMins)
      }, 0) / 60
    }
    
    const thisWeekHours = calculateHours(thisWeekBlocks)
    const lastWeekHours = calculateHours(lastWeekBlocks)
    
    // Week over week change
    const hoursChange = lastWeekHours > 0 
      ? Math.round(((thisWeekHours - lastWeekHours) / lastWeekHours) * 100)
      : 0
    
    const completionChange = lastCompletionRate > 0
      ? completionRate - lastCompletionRate
      : 0
    
    return {
      blocksCommitted: thisWeekBlocks.length,
      completionRate,
      completionChange,
      hoursScheduled: thisWeekHours,
      hoursChange,
      daysCommitted: thisWeekCommits.length
    }
  }, [commits])
  
  return (
    <div className="bg-card border border-border rounded-lg p-5">
      <div className="text-sm font-medium text-foreground mb-4">This Week</div>
      
      <div className="grid grid-cols-2 gap-4">
        {/* Blocks committed */}
        <div>
          <div className="text-2xl font-semibold text-foreground">
            {stats.blocksCommitted}
          </div>
          <div className="text-xs text-muted-foreground">blocks committed</div>
        </div>
        
        {/* Completion rate */}
        <div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-semibold text-foreground">
              {stats.completionRate}%
            </span>
            {stats.completionChange !== 0 && (
              <span className={`text-xs ${stats.completionChange > 0 ? "text-green-500" : "text-red-400"}`}>
                {stats.completionChange > 0 ? "+" : ""}{stats.completionChange}%
              </span>
            )}
          </div>
          <div className="text-xs text-muted-foreground">completion</div>
        </div>
        
        {/* Hours scheduled */}
        <div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-semibold text-foreground">
              {stats.hoursScheduled.toFixed(1)}
            </span>
            <span className="text-sm text-muted-foreground">hrs</span>
            {stats.hoursChange !== 0 && (
              <span className={`text-xs ${stats.hoursChange > 0 ? "text-green-500" : "text-red-400"}`}>
                {stats.hoursChange > 0 ? "+" : ""}{stats.hoursChange}%
              </span>
            )}
          </div>
          <div className="text-xs text-muted-foreground">scheduled</div>
        </div>
        
        {/* Days committed */}
        <div>
          <div className="text-2xl font-semibold text-foreground">
            {stats.daysCommitted}<span className="text-muted-foreground">/7</span>
          </div>
          <div className="text-xs text-muted-foreground">days committed</div>
        </div>
      </div>
    </div>
  )
}

