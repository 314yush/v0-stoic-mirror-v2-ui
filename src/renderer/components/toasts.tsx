
import { create } from "zustand"

interface Toast {
  id: string
  message: string
  type?: "success" | "error" | "info"
  onSnooze?: () => void
  showSnooze?: boolean
  showAction?: boolean
  actionLabel?: string
  onAction?: () => void
}

interface ToastStore {
  toasts: Toast[]
  addToast: (message: string, type?: Toast["type"], options?: { onSnooze?: () => void; showSnooze?: boolean; showAction?: boolean; actionLabel?: string; onAction?: () => void }) => void
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
        showAction: options.showAction,
        actionLabel: options.actionLabel,
        onAction: options.onAction,
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

export function Toasts({ isWidget = false }: { isWidget?: boolean }) {
  const { toasts, removeToast } = useToastStore()

  // Auto-detect widget mode from URL
  const isWidgetMode = typeof window !== 'undefined' && 
    (window.location.hash === '#/widget' || window.location.hash === '#widget' || window.location.pathname.includes('/widget'))
  
  const widgetMode = isWidget || isWidgetMode

  return (
    <div className={`${widgetMode ? 'fixed bottom-2 left-2 right-2 z-50' : 'fixed bottom-4 right-4 z-50'} flex flex-col gap-2 ${widgetMode ? 'w-auto' : 'w-80'}`}>
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`${widgetMode ? 'px-2 py-1.5 text-xs' : 'px-4 py-3'} rounded-lg shadow-lg border animate-in slide-in-from-bottom ${
            toast.type === "error"
              ? "bg-destructive/10 border-destructive text-destructive"
              : toast.type === "info"
                ? "bg-primary/10 border-primary text-primary"
                : "bg-primary/10 border-primary text-foreground"
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <p className={`${widgetMode ? 'text-xs' : 'text-sm'} font-medium truncate ${widgetMode ? 'max-w-[200px]' : ''}`}>{toast.message}</p>
            <div className="flex items-center gap-1 shrink-0">
              {toast.showSnooze && toast.onSnooze && (
                <button
                  onClick={() => {
                    toast.onSnooze?.()
                    removeToast(toast.id)
                  }}
                  className={`${widgetMode ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-1 text-xs'} bg-secondary text-foreground rounded hover:bg-secondary/80 transition-colors`}
                >
                  {widgetMode ? '20m' : 'Snooze 20m'}
                </button>
              )}
              {toast.showAction && toast.onAction && (
                <button
                  onClick={() => {
                    toast.onAction?.()
                    removeToast(toast.id)
                  }}
                  className={`${widgetMode ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-1 text-xs'} bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors`}
                >
                  {toast.actionLabel || 'Action'}
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
