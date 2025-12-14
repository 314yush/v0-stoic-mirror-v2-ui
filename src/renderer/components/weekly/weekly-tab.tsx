import { IdentityProgressRings } from "./identity-progress-rings"
import { AutoHabitsGrid } from "./auto-habits-grid"
import { WeekSummaryCard } from "./week-summary-card"
import { TimeByIdentity } from "./time-by-identity"

export function WeeklyTab() {
  return (
    <div className="h-full overflow-auto">
      <div className="border-b border-border px-6 py-4 pt-8">
        <h2 className="text-xl font-semibold text-foreground">Weekly Overview</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Your last 7 days at a glance
        </p>
      </div>

      <div className="px-6 py-6 space-y-6">
        {/* Identity Progress Rings */}
        <IdentityProgressRings />
        
        {/* Auto-Detected Habits */}
        <AutoHabitsGrid />
        
        {/* Time by Identity */}
        <TimeByIdentity />
        
        {/* Week Summary */}
        <WeekSummaryCard />
      </div>
    </div>
  )
}
