import { useRoutineAnalysis } from "../../lib/routine-analysis"

export function IdentityProgressRings() {
  const { identityProgress, northStarIdentities } = useRoutineAnalysis()

  if (northStarIdentities.length === 0) {
    return (
      <div className="p-6 bg-card border border-border rounded-lg text-center">
        <p className="text-sm text-muted-foreground mb-2">
          No north star identity set yet
        </p>
        <p className="text-xs text-muted-foreground">
          Set your north star in Settings to see progress tracking
        </p>
      </div>
    )
  }

  return (
    <div className="p-6 bg-card border border-border rounded-lg">
      <h3 className="text-sm font-semibold text-foreground mb-4">
        Becoming Your North Star
      </h3>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {identityProgress.map((progress) => (
          <div key={progress.identity} className="flex flex-col items-center">
            {/* Circular Progress Ring */}
            <div className="relative w-24 h-24 mb-3">
              <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
                {/* Background circle */}
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="8"
                  className="text-secondary"
                />
                {/* Progress circle */}
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 45}`}
                  strokeDashoffset={`${2 * Math.PI * 45 * (1 - progress.score / 100)}`}
                  className="text-primary transition-all duration-500"
                />
              </svg>
              {/* Score text */}
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-semibold text-foreground">
                  {progress.score}%
                </span>
              </div>
            </div>
            
            {/* Identity name */}
            <h4 className="text-xs font-medium text-foreground text-center mb-1 line-clamp-2">
              {progress.identity}
            </h4>
            
            {/* Stats */}
            <div className="text-[10px] text-muted-foreground text-center space-y-0.5">
              <div>{progress.recentActivity} actions this week</div>
              <div>{progress.totalActions} total</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

