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
  addToast: (message: string, type?: Toast["type"], options?: { 
    onSnooze?: () => void
    showSnooze?: boolean
    showAction?: boolean
    actionLabel?: string
    onAction?: () => void
    duration?: number
  }) => void
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
    // Auto-remove (unless it has actions)
    if (!options.showSnooze && !options.showAction) {
      const duration = options.duration ?? (type === "error" ? 5000 : 3000)
      setTimeout(() => {
        set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }))
      }, duration)
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

  if (toasts.length === 0) return null

  return (
    <div className={`
      fixed z-50 flex flex-col gap-2
      ${widgetMode 
        ? 'bottom-2 left-2 right-2' 
        : 'bottom-6 right-6 max-w-sm'
      }
    `}>
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`
            flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg backdrop-blur-sm
            animate-in slide-in-from-bottom-2 fade-in duration-200
            ${toast.type === "error"
              ? "bg-red-500/10 border border-red-500/30 text-red-500"
              : toast.type === "info"
                ? "bg-blue-500/10 border border-blue-500/30 text-blue-500"
                : "bg-green-500/10 border border-green-500/30 text-green-500"
            }
          `}
        >
          {/* Icon */}
          <span className="text-base shrink-0">
            {toast.type === "error" ? "✗" : toast.type === "info" ? "i" : "✓"}
          </span>
          
          {/* Message */}
          <p className={`text-sm font-medium flex-1 ${
            toast.type === "error" ? "text-red-400" : 
            toast.type === "info" ? "text-blue-400" : 
            "text-green-400"
          } ${widgetMode ? "text-xs truncate max-w-[180px]" : ""}`}>
            {toast.message}
          </p>
          
          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {toast.showSnooze && toast.onSnooze && (
              <button
                onClick={() => {
                  toast.onSnooze?.()
                  removeToast(toast.id)
                }}
                className="px-2 py-1 text-xs bg-secondary/80 hover:bg-secondary text-foreground rounded-md transition-colors"
              >
                {widgetMode ? '20m' : 'Snooze'}
              </button>
            )}
            {toast.showAction && toast.onAction && (
              <button
                onClick={() => {
                  toast.onAction?.()
                  removeToast(toast.id)
                }}
                className="px-2 py-1 text-xs bg-primary/80 hover:bg-primary text-primary-foreground rounded-md transition-colors"
              >
                {toast.actionLabel || 'Action'}
              </button>
            )}
            <button 
              onClick={() => removeToast(toast.id)} 
              className="text-muted-foreground hover:text-foreground text-sm opacity-60 hover:opacity-100 transition-opacity"
            >
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
