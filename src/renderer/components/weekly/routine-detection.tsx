import { useRoutineAnalysis } from "../../lib/routine-analysis"

export function RoutineDetection() {
  const { routines } = useRoutineAnalysis()

  const established = routines.filter(r => r.status === 'established')
  const emerging = routines.filter(r => r.status === 'emerging')
  const almost = routines.filter(r => r.status === 'almost')
  const fading = routines.filter(r => r.status === 'fading')

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'established':
        return <span className="px-2 py-0.5 text-[10px] bg-emerald-500/20 text-emerald-500 rounded">Established</span>
      case 'emerging':
        return <span className="px-2 py-0.5 text-[10px] bg-blue-500/20 text-blue-500 rounded">Emerging</span>
      case 'fading':
        return <span className="px-2 py-0.5 text-[10px] bg-orange-500/20 text-orange-500 rounded">Fading</span>
      default:
        return null
    }
  }

  const getCompletionColor = (rate: number) => {
    if (rate >= 80) return "text-emerald-500"
    if (rate >= 50) return "text-yellow-500"
    return "text-orange-500"
  }

  const RoutineCard = ({ routine }: { routine: typeof routines[0] }) => (
    <div className="p-3 bg-secondary/50 rounded-lg border border-border/50">
      <div className="flex items-start justify-between mb-2">
        <h4 className="text-sm font-medium text-foreground">{routine.identity}</h4>
        {getStatusBadge(routine.status)}
      </div>
      
      <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2">
        <span>{routine.frequency.toFixed(1)}x/week avg</span>
        <span className={getCompletionColor(routine.completionRate)}>
          {routine.completionRate}% complete
        </span>
        <span>{routine.consistency} weeks</span>
      </div>
      
      {routine.northStarAlignment && routine.northStarAlignment.length > 0 && (
        <div className="flex items-center gap-1 flex-wrap mt-2">
          <span className="text-[10px] text-muted-foreground">Serves:</span>
          {routine.northStarAlignment.map((identity, i) => (
            <span
              key={i}
              className="px-1.5 py-0.5 text-[10px] bg-primary/10 text-primary rounded"
            >
              {identity}
            </span>
          ))}
        </div>
      )}
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Established Routines */}
      {established.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3">
            Your Routines
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {established.map((routine) => (
              <RoutineCard key={routine.identity} routine={routine} />
            ))}
          </div>
        </div>
      )}

      {/* Emerging Routines */}
      {emerging.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3">
            Emerging Routines
          </h3>
          <p className="text-xs text-muted-foreground mb-3">
            New patterns detected this week (3+ times)
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {emerging.map((routine) => (
              <RoutineCard key={routine.identity} routine={routine} />
            ))}
          </div>
        </div>
      )}

      {/* Almost Routines */}
      {almost.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3">
            Almost Routines
          </h3>
          <p className="text-xs text-muted-foreground mb-3">
            One more step to make these routines
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {almost.map((routine) => (
              <div key={routine.identity} className="p-3 bg-secondary/30 rounded-lg border border-dashed border-border">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="text-sm font-medium text-foreground">{routine.identity}</h4>
                  <span className="px-2 py-0.5 text-[10px] bg-yellow-500/20 text-yellow-500 rounded">
                    Almost
                  </span>
                </div>
                
                {/* Progress bar */}
                {routine.promotionProgress && (
                  <div className="mb-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-muted-foreground">Progress</span>
                      <span className="text-xs font-medium text-foreground">
                        {routine.lastWeekFrequency}/3 this week
                      </span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-yellow-500 h-2 rounded-full transition-all"
                        style={{ width: `${(routine.lastWeekFrequency / 3) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
                
                {/* Completion info */}
                <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2">
                  <span>{routine.lastWeekFrequency}x this week</span>
                  {routine.lastWeekCompletions > 0 && (
                    <span className={getCompletionColor(
                      routine.lastWeekFrequency > 0 
                        ? Math.round((routine.lastWeekCompletions / routine.lastWeekFrequency) * 100)
                        : 0
                    )}>
                      {routine.lastWeekCompletions}/{routine.lastWeekFrequency} completed
                    </span>
                  )}
                </div>
                
                {/* Clear promotion message */}
                {routine.promotionProgress && (
                  <p className="text-xs text-foreground font-medium">
                    {routine.promotionProgress.message}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fading Routines */}
      {fading.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3">
            Fading Routines
          </h3>
          <p className="text-xs text-muted-foreground mb-3">
            These routines are becoming less consistent
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {fading.map((routine) => (
              <RoutineCard key={routine.identity} routine={routine} />
            ))}
          </div>
        </div>
      )}

      {established.length === 0 && emerging.length === 0 && almost.length === 0 && fading.length === 0 && (
        <div className="p-6 bg-card border border-border rounded-lg text-center">
          <p className="text-sm text-muted-foreground mb-2">
            No routines detected yet
          </p>
          <p className="text-xs text-muted-foreground">
            Routines appear when you commit to an activity 3+ times in a week with 70%+ completion
          </p>
        </div>
      )}
    </div>
  )
}

