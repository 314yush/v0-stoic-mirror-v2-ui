import { useState } from "react"
import { HeatmapGrid } from "./heatmap-grid"
import { StreakCard } from "./streak-card"
import { IdentityBars } from "./identity-bars"
import { InsightsPanel } from "./insights-panel"
import { WeeklySnapshot } from "../journal/weekly-snapshot"
import { RoutineEditorModal } from "../routine-editor-modal"
import { RoutineSelectorModal } from "../routine-selector-modal"
import { useJournalStore } from "../../lib/journal-store"
import { useRoutineStore } from "../../lib/routine-store"
import { useTasksStore } from "../../lib/tasks-store"

export function WeeklyTab() {
  const { entries } = useJournalStore()
  const { templates } = useRoutineStore()
  const { tasks } = useTasksStore()
  const [showRoutineEditor, setShowRoutineEditor] = useState(false)
  const [showRoutineSelector, setShowRoutineSelector] = useState(false)
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null)

  // Calculate task stats
  const totalTasks = tasks.length
  const completedTasks = tasks.filter((t) => t.completed).length

  const handleEditRoutine = () => {
    setEditingTemplateId(null)
    setShowRoutineEditor(true)
  }

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

        {/* Task Stats */}
        <div className="p-4 bg-card border border-border rounded-lg">
          <h3 className="text-sm font-semibold text-foreground mb-4">Task Completion</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground">Total Tasks</span>
              <span className="text-sm font-medium text-foreground">{totalTasks}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground">Completed</span>
              <span className="text-sm font-medium text-primary">{completedTasks}</span>
            </div>
            {totalTasks > 0 && (
              <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
                <div
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{ width: `${(completedTasks / totalTasks) * 100}%` }}
                />
              </div>
            )}
          </div>
        </div>

        <InsightsPanel />

        <div className="pt-2">
          <h3 className="text-sm font-semibold text-foreground mb-2">Journal Snapshot</h3>
          <WeeklySnapshot entries={entries as any} />
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowRoutineSelector(true)}
            className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Use Saved Routine
          </button>
          <button
            onClick={handleEditRoutine}
            className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Edit Routine
          </button>
          {templates.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {templates.length} saved routine{templates.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      {showRoutineEditor && (
        <RoutineEditorModal
          templateId={editingTemplateId}
          onClose={() => {
            setShowRoutineEditor(false)
            setEditingTemplateId(null)
          }}
          onSave={(id) => {
            setEditingTemplateId(null)
          }}
        />
      )}

      {showRoutineSelector && (
        <RoutineSelectorModal
          onSelect={(blocks) => {
            // Blocks selected, modal will close
            setShowRoutineSelector(false)
          }}
          onClose={() => setShowRoutineSelector(false)}
        />
      )}
    </div>
  )
}
