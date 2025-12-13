import { IdentityProgressRings } from "./identity-progress-rings"
import { RoutineDetection } from "./routine-detection"
import { WeeklyInsights } from "./weekly-insights"
import { StreakCard } from "./streak-card"
import { DailyHabitsGrid } from "../habits/daily-habits-grid"

export function WeeklyTab() {
  return (
    <div className="h-full overflow-auto">
      <div className="border-b border-border px-6 py-4 pt-8">
        <h2 className="text-xl font-semibold text-foreground">Weekly Overview</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Track your habits and progress toward your north star
        </p>
      </div>

      <div className="px-6 py-6 space-y-6">
        {/* Identity Progress Rings */}
        <IdentityProgressRings />
        
        {/* Daily Habits Grid */}
        <DailyHabitsGrid />

        {/* Routine Detection */}
        <RoutineDetection />

        {/* Weekly Insights */}
        <WeeklyInsights />

        {/* Streak Card */}
        <StreakCard />
      </div>
    </div>
  )
}
