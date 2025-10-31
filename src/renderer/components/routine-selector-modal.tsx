import { useState } from "react"
import { useRoutineStore } from "../lib/routine-store"
import { useToastStore } from "./toasts"
import type { TimeBlock } from "../lib/schedule-store"

interface RoutineSelectorModalProps {
  onSelect: (blocks: TimeBlock[]) => void
  onClose: () => void
}

export function RoutineSelectorModal({ onSelect, onClose }: RoutineSelectorModalProps) {
  const { templates, deleteTemplate } = useRoutineStore()
  const { addToast } = useToastStore()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)

  const handleSelect = (templateId: string) => {
    const template = templates.find((t) => t.id === templateId)
    if (template) {
      // Convert template blocks to TimeBlocks with IDs
      const blocks: TimeBlock[] = template.blocks.map((b) => ({
        ...b,
        id: Math.random().toString(36).substring(7),
      }))
      onSelect(blocks)
      onClose()
    }
  }

  const handleDelete = (id: string) => {
    deleteTemplate(id)
    addToast("Routine deleted")
    setShowDeleteConfirm(null)
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-foreground">Select Routine</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="p-6">
          {templates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No saved routines yet. Create one from "Edit Routine" in Weekly tab.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="p-4 bg-secondary/50 border border-border rounded-lg hover:border-primary/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-foreground mb-1">{template.name}</h3>
                      <p className="text-xs text-muted-foreground">
                        {template.blocks.length} block{template.blocks.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleSelect(template.id)}
                        className="px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                      >
                        Use
                      </button>
                      {showDeleteConfirm === template.id ? (
                        <button
                          onClick={() => handleDelete(template.id)}
                          className="px-3 py-1.5 text-xs font-medium bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 transition-colors"
                        >
                          Confirm
                        </button>
                      ) : (
                        <button
                          onClick={() => setShowDeleteConfirm(template.id)}
                          className="px-3 py-1.5 text-xs text-muted-foreground hover:text-destructive transition-colors"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

