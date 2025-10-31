import { useState, useMemo } from "react"
import { useTasksStore } from "../../lib/tasks-store"
import { useToastStore } from "../toasts"

export function TasksTab() {
  const { tasks, addTask, updateTask, removeTask, toggleTask } = useTasksStore()
  const { addToast } = useToastStore()
  const [newTaskText, setNewTaskText] = useState("")
  const [showWarning, setShowWarning] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingText, setEditingText] = useState("")

  // Group tasks by date (newest first) - simple chronological list
  const tasksByDate = useMemo(() => {
    const grouped = new Map<string, typeof tasks>()
    
    tasks.forEach((task) => {
      const date = new Date(task.created_at).toISOString().split("T")[0] // YYYY-MM-DD
      if (!grouped.has(date)) {
        grouped.set(date, [])
      }
      grouped.get(date)!.push(task)
    })

    // Sort dates descending (newest first)
    const sortedDates = Array.from(grouped.keys()).sort((a, b) => b.localeCompare(a))
    
    // Convert to array of { date, tasks }
    return sortedDates.map((date) => ({
      date,
      tasks: grouped.get(date)!.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime() // Newest first within date
      ),
    }))
  }, [tasks])

  // Show all tasks, but incomplete ones first within each date group
  const sortedTasksByDate = useMemo(() => {
    return tasksByDate.map(({ date, tasks }) => ({
      date,
      tasks: [...tasks].sort((a, b) => {
        // Incomplete tasks first, then by creation time
        if (a.completed !== b.completed) {
          return a.completed ? 1 : -1
        }
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }),
    }))
  }, [tasksByDate])

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    
    if (dateStr === today.toISOString().split("T")[0]) {
      return "Today"
    } else if (dateStr === yesterday.toISOString().split("T")[0]) {
      return "Yesterday"
    } else {
      return date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })
    }
  }

  const handleAddTask = () => {
    if (!newTaskText.trim()) {
      setShowWarning(true)
      setTimeout(() => setShowWarning(false), 3000) // Hide warning after 3 seconds
      return
    }
    
    addTask({
      text: newTaskText.trim(),
      completed: false,
    })
    setNewTaskText("")
    setShowWarning(false)
  }

  const handleStartEdit = (task: { id: string; text: string }) => {
    setEditingId(task.id)
    setEditingText(task.text)
  }

  const handleSaveEdit = (id: string) => {
    if (!editingText.trim()) {
      // Don't update if empty - just cancel
      handleCancelEdit()
      return
    }
    
    updateTask(id, { text: editingText.trim() })
    setEditingId(null)
    setEditingText("")
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditingText("")
  }

  const handleDelete = (id: string) => {
    removeTask(id)
  }

  const remainingTasks = tasks.filter((t) => !t.completed).length

  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-border px-6 py-4">
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-foreground mb-2">Tasks</h2>
          <p className="text-sm text-muted-foreground">
            Your remaining todos: <span className="font-semibold text-foreground">{remainingTasks}</span>
          </p>
        </div>

        {/* Add new task */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newTaskText}
              onChange={(e) => {
                setNewTaskText(e.target.value)
                if (showWarning && e.target.value.trim()) {
                  setShowWarning(false)
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleAddTask()
                }
              }}
              placeholder="Add a new task..."
              className={`flex-1 px-3 py-2 bg-secondary border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 transition-colors ${
                showWarning
                  ? "border-destructive focus:ring-destructive"
                  : "border-border focus:ring-primary"
              }`}
            />
            <button
              onClick={handleAddTask}
              className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              Add
            </button>
          </div>
          
          {/* Warning message */}
          {showWarning && (
            <div className="flex items-center gap-2 text-destructive text-sm">
              <span>✖</span>
              <span>Please enter a task before adding.</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto px-6 py-6">
        {sortedTasksByDate.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-lg font-medium text-foreground mb-2">No tasks yet</p>
            <p className="text-sm text-muted-foreground">
              Start by adding your first task above
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {sortedTasksByDate.map(({ date, tasks: dateTasks }) => (
              <div key={date}>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3 sticky top-0 bg-background py-2 z-10">
                  {formatDate(date)}
                </h3>
                <div className="space-y-2">
                  {dateTasks.map((task) => (
                    <div
                      key={task.id}
                      className={`group flex items-center gap-3 p-3 bg-card border border-border rounded-lg hover:border-primary/50 transition-colors ${
                        task.completed ? "opacity-60" : ""
                      }`}
                    >
                      <button
                        onClick={() => toggleTask(task.id)}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                          task.completed
                            ? "bg-primary border-primary text-primary-foreground"
                            : "border-border hover:border-primary"
                        }`}
                        aria-label={task.completed ? "Mark incomplete" : "Mark complete"}
                      >
                        {task.completed && "✓"}
                      </button>
                      
                      {editingId === task.id ? (
                        <input
                          type="text"
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              handleSaveEdit(task.id)
                            } else if (e.key === "Escape") {
                              handleCancelEdit()
                            }
                          }}
                          onBlur={() => {
                            // Auto-save on blur if text changed
                            if (editingText.trim() && editingText.trim() !== task.text) {
                              handleSaveEdit(task.id)
                            } else {
                              handleCancelEdit()
                            }
                          }}
                          autoFocus
                          className="flex-1 px-2 py-1 bg-secondary border border-primary rounded text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      ) : (
                        <>
                          <span
                            className={`flex-1 text-sm text-foreground cursor-text ${
                              task.completed ? "line-through text-muted-foreground" : ""
                            }`}
                            onClick={() => handleStartEdit(task)}
                          >
                            {task.text}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDelete(task.id)
                            }}
                            className="px-2 py-1 text-xs text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                            title="Delete task"
                          >
                            ✕
                          </button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

