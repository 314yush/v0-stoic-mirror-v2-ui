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

export function WeeklyTab() {
  const { entries } = useJournalStore()
  const { templates } = useRoutineStore()
  const [showRoutineEditor, setShowRoutineEditor] = useState(false)
  const [showRoutineSelector, setShowRoutineSelector] = useState(false)
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null)

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
