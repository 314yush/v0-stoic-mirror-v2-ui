
import { create } from "zustand"

interface Toast {
  id: string
  message: string
  type?: "success" | "error" | "info"
  onSnooze?: () => void
  showSnooze?: boolean
}

interface ToastStore {
  toasts: Toast[]
  addToast: (message: string, type?: Toast["type"], options?: { onSnooze?: () => void; showSnooze?: boolean }) => void
  removeToast: (id: string) => void
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  addToast: (message, type = "success", options = {}) => {
    const id = Math.random().toString(36).substring(7)
    set((state) => ({ 
      toasts: [...state.toasts, { 
        id, 
        message, 
        type,
        onSnooze: options.onSnooze,
        showSnooze: options.showSnooze,
      }] 
    }))
    // Don't auto-remove if it has a snooze button (user action needed)
    if (!options.showSnooze) {
      setTimeout(() => {
        set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }))
      }, 3000)
    }
  },
  removeToast: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}))

export function Toasts() {
  const { toasts, removeToast } = useToastStore()

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 w-80">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`px-4 py-3 rounded-lg shadow-lg border animate-in slide-in-from-right ${
            toast.type === "error"
              ? "bg-destructive/10 border-destructive text-destructive"
              : toast.type === "info"
                ? "bg-primary/10 border-primary text-primary"
                : "bg-primary/10 border-primary text-foreground"
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium">{toast.message}</p>
            <div className="flex items-center gap-2">
              {toast.showSnooze && toast.onSnooze && (
                <button
                  onClick={() => {
                    toast.onSnooze?.()
                    removeToast(toast.id)
                  }}
                  className="px-2 py-1 text-xs bg-secondary text-foreground rounded hover:bg-secondary/80 transition-colors"
                >
                  Snooze 20m
                </button>
              )}
              <button onClick={() => removeToast(toast.id)} className="text-muted-foreground hover:text-foreground">
                ✕
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
