const MOCK_INSIGHTS = [
  "Your morning routine adherence improved by 15% this week",
  "Deep work sessions are most successful on Tuesday and Thursday",
  "Consider scheduling exercise earlier in the day for better consistency",
]

export function InsightsPanel() {
  return (
    <div className="p-4 bg-card border border-border rounded-lg">
      <h3 className="text-sm font-semibold text-foreground mb-4">AI Insights</h3>
      <ul className="space-y-2">
        {MOCK_INSIGHTS.map((insight, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
            <span className="text-primary mt-0.5">•</span>
            <span>{insight}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
