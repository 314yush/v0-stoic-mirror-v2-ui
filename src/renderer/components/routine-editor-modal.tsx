import { useState, useEffect } from "react"
import type { TimeBlock } from "../lib/schedule-store"
import { useRoutineStore } from "../lib/routine-store"
import { QuickAddBlock } from "./today/quick-add-block"
import { DayTimeline } from "./today/day-timeline"
import { ValidationHints } from "./today/validation-hints"
import { useToastStore } from "./toasts"

interface RoutineEditorModalProps {
  templateId?: string | null
  onClose: () => void
  onSave: (templateId: string) => void
}

export function RoutineEditorModal({ templateId, onClose, onSave }: RoutineEditorModalProps) {
  const { templates, addTemplate, updateTemplate, getTemplate } = useRoutineStore()
  const { addToast } = useToastStore()
  const [name, setName] = useState("")
  const [blocks, setBlocks] = useState<TimeBlock[]>([])
  const [showQuickAdd, setShowQuickAdd] = useState(false)

  useEffect(() => {
    if (templateId) {
      const template = getTemplate(templateId)
      if (template) {
        setName(template.name)
        // Convert template blocks to TimeBlocks with IDs
        setBlocks(
          template.blocks.map((b) => ({
            ...b,
            id: Math.random().toString(36).substring(7),
          }))
        )
      }
    }
  }, [templateId, getTemplate])

  const handleSave = () => {
    if (!name.trim()) {
      addToast("Please enter a routine name", "error")
      return
    }
    if (blocks.length === 0) {
      addToast("Please add at least one block", "error")
      return
    }

    // Remove IDs before saving (template stores blocks without IDs)
    const blocksWithoutIds = blocks.map(({ id, ...rest }) => rest)

    if (templateId) {
      updateTemplate(templateId, {
        name: name.trim(),
        blocks: blocksWithoutIds,
      })
      addToast("Routine updated")
    } else {
      const newTemplate = addTemplate(name.trim(), blocksWithoutIds)
      addToast("Routine saved")
      onSave(newTemplate.id)
    }
    onClose()
  }

  const handleAddBlock = (block: Omit<TimeBlock, "id">) => {
    const newBlock = { ...block, id: Math.random().toString(36).substring(7) }
    setBlocks([...blocks, newBlock])
    setShowQuickAdd(false)
  }

  const handleUpdateBlock = (id: string, updates: Partial<TimeBlock>) => {
    setBlocks(blocks.map((b) => (b.id === id ? { ...b, ...updates } : b)))
  }

  const handleDeleteBlock = (id: string) => {
    setBlocks(blocks.filter((b) => b.id !== id))
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border rounded-lg max-w-5xl w-full max-h-[90vh] overflow-y-auto shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between">
          <div className="flex-1">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Routine name (e.g., Weekday Morning)"
              className="text-xl font-semibold bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground w-full"
            />
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors ml-4"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="space-y-4">
            {blocks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No blocks yet. Add your first block to start building this routine.</p>
              </div>
            ) : (
              <>
                <ValidationHints blocks={blocks} />
                <DayTimeline
                  blocks={blocks}
                  onUpdateBlock={handleUpdateBlock}
                  onDeleteBlock={handleDeleteBlock}
                  onAddBlock={handleAddBlock}
                />
              </>
            )}

            <button
              onClick={() => setShowQuickAdd(!showQuickAdd)}
              className="w-full py-2 text-sm text-muted-foreground hover:text-foreground border border-dashed border-border rounded-md hover:border-primary transition-colors"
            >
              + Add Block
            </button>
            {showQuickAdd && (
              <QuickAddBlock onAdd={handleAddBlock} onCancel={() => setShowQuickAdd(false)} />
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              {templateId ? "Update Routine" : "Save Routine"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

