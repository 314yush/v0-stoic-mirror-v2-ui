"use client"

import { useState } from "react"

interface DayData {
  date: string
  score: number
  completed: number
  committed: number
  topBlocker?: string
}

const MOCK_DATA: DayData[] = Array.from({ length: 84 }, (_, i) => {
  const date = new Date()
  date.setDate(date.getDate() - (83 - i))
  return {
    date: date.toISOString().split("T")[0],
    score: Math.random() > 0.3 ? Math.floor(Math.random() * 100) : 0,
    completed: Math.floor(Math.random() * 5),
    committed: 4,
    topBlocker: Math.random() > 0.5 ? "Procrastination" : "Unexpected meeting",
  }
})

export function HeatmapGrid() {
  const [hoveredDay, setHoveredDay] = useState<DayData | null>(null)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })

  const getColorClass = (score: number) => {
    if (score === 0) return "bg-secondary/50"
    if (score < 20) return "bg-emerald-500/20"
    if (score < 40) return "bg-emerald-500/40"
    if (score < 60) return "bg-emerald-500/60"
    if (score < 80) return "bg-emerald-500/80"
    return "bg-emerald-500"
  }

  const getRingClass = (score: number) => {
    if (score === 0) return "ring-secondary"
    if (score < 40) return "ring-emerald-500/40"
    if (score < 80) return "ring-emerald-500/70"
    return "ring-emerald-500"
  }

  const weeks = []
  for (let i = 0; i < MOCK_DATA.length; i += 7) {
    weeks.push(MOCK_DATA.slice(i, i + 7))
  }

  const getMonthLabels = () => {
    const labels: { month: string; weekIndex: number }[] = []
    let lastMonth = ""

    weeks.forEach((week, index) => {
      const firstDay = week[0]
      if (firstDay) {
        const date = new Date(firstDay.date)
        const month = date.toLocaleDateString("en-US", { month: "short" })
        if (month !== lastMonth) {
          labels.push({ month, weekIndex: index })
          lastMonth = month
        }
      }
    })

    return labels
  }

  const monthLabels = getMonthLabels()

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  const getAdherenceText = (score: number) => {
    if (score === 0) return "No data"
    if (score < 40) return "Low adherence"
    if (score < 70) return "Moderate adherence"
    if (score < 90) return "Good adherence"
    return "Excellent adherence"
  }

  return (
    <div className="relative">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground">12-Week Adherence Heatmap</h3>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span>{MOCK_DATA.filter((d) => d.score > 0).length} active days</span>
          <span>•</span>
          <span>{Math.round(MOCK_DATA.reduce((sum, d) => sum + d.score, 0) / MOCK_DATA.length)}% avg adherence</span>
        </div>
      </div>

      <div className="relative mb-2">
        <div className="flex gap-1 relative h-4">
          {monthLabels.map(({ month, weekIndex }) => (
            <div
              key={`${month}-${weekIndex}`}
              className="absolute text-xs text-muted-foreground font-medium"
              style={{ left: `${weekIndex * 16}px` }}
            >
              {month}
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <div className="flex flex-col gap-1 justify-between py-0.5">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, i) => (
            <div key={day} className="h-3 flex items-center text-[10px] text-muted-foreground font-medium">
              {i % 2 === 0 ? day : ""}
            </div>
          ))}
        </div>

        <div className="flex gap-1">
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="flex flex-col gap-1">
              {week.map((day, dayIndex) => (
                <div
                  key={dayIndex}
                  onMouseEnter={(e) => {
                    setHoveredDay(day)
                    setTooltipPos({ x: e.clientX, y: e.clientY })
                  }}
                  onMouseLeave={() => setHoveredDay(null)}
                  className={`
                    w-3 h-3 rounded-sm cursor-pointer transition-all duration-200
                    ${getColorClass(day.score)}
                    hover:ring-2 hover:ring-offset-1 hover:ring-offset-background
                    ${hoveredDay === day ? `ring-2 ring-offset-1 ring-offset-background ${getRingClass(day.score)} scale-125` : ""}
                  `}
                  title={formatDate(day.date)}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {hoveredDay && (
        <div
          className="fixed z-50 px-3 py-2.5 bg-popover border border-border rounded-lg shadow-xl text-xs pointer-events-none min-w-[200px]"
          style={{ left: tooltipPos.x + 10, top: tooltipPos.y + 10 }}
        >
          <div className="space-y-1.5">
            <p className="font-semibold text-foreground">{formatDate(hoveredDay.date)}</p>

            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Adherence:</span>
              <span className="font-medium text-foreground">{hoveredDay.score}%</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Status:</span>
              <span
                className={`font-medium ${
                  hoveredDay.score >= 70
                    ? "text-emerald-500"
                    : hoveredDay.score >= 40
                      ? "text-yellow-500"
                      : hoveredDay.score > 0
                        ? "text-orange-500"
                        : "text-muted-foreground"
                }`}
              >
                {getAdherenceText(hoveredDay.score)}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Completed:</span>
              <span className="font-medium text-foreground">
                {hoveredDay.completed}/{hoveredDay.committed} blocks
              </span>
            </div>

            {hoveredDay.topBlocker && hoveredDay.score < 100 && (
              <div className="pt-1.5 mt-1.5 border-t border-border">
                <p className="text-muted-foreground">Top blocker:</p>
                <p className="font-medium text-foreground">{hoveredDay.topBlocker}</p>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Less</span>
          <div className="flex gap-1">
            {[0, 20, 40, 60, 80, 100].map((score) => (
              <div key={score} className={`w-3 h-3 rounded-sm ${getColorClass(score)}`} title={`${score}%`} />
            ))}
          </div>
          <span className="text-xs text-muted-foreground">More</span>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-sm bg-emerald-500" />
            <span className="text-muted-foreground">80-100%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-sm bg-emerald-500/60" />
            <span className="text-muted-foreground">60-79%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-sm bg-emerald-500/40" />
            <span className="text-muted-foreground">40-59%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-sm bg-emerald-500/20" />
            <span className="text-muted-foreground">1-39%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-sm bg-secondary/50" />
            <span className="text-muted-foreground">No data</span>
          </div>
        </div>
      </div>
    </div>
  )
}
