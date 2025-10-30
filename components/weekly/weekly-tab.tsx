import { HeatmapGrid } from "./heatmap-grid"
import { StreakCard } from "./streak-card"
import { IdentityBars } from "./identity-bars"
import { InsightsPanel } from "./insights-panel"

export function WeeklyTab() {
  return (
    <div className="h-full overflow-auto">
      <div className="border-b border-border px-6 py-4">
        <h2 className="text-xl font-semibold text-foreground">Weekly Overview</h2>
      </div>

      <div className="px-6 py-6 space-y-6">
        <HeatmapGrid />

        <div className="grid grid-cols-2 gap-6">
          <StreakCard />
          <IdentityBars />
        </div>

        <InsightsPanel />

        <div className="flex items-center gap-3">
          <button className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors">
            Set Focus for Next Week
          </button>
          <button className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            Edit Routine
          </button>
        </div>
      </div>
    </div>
  )
}
