const MOCK_IDENTITIES = [
  { name: "Health", adherence: 85 },
  { name: "Work", adherence: 72 },
  { name: "Relationships", adherence: 60 },
  { name: "Learning", adherence: 45 },
]

export function IdentityBars() {
  return (
    <div className="p-4 bg-card border border-border rounded-lg">
      <h3 className="text-sm font-semibold text-foreground mb-4">Adherence by Identity</h3>
      <div className="space-y-3">
        {MOCK_IDENTITIES.map((identity) => (
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
    </div>
  )
}
