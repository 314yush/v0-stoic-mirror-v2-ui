/**
 * Habit Setup Modal
 * Allows users to create and manage their daily habits
 */

import { useState, useMemo } from "react"
import { useHabitsStore, type Habit } from "../../lib/habits-store"
import { useSettingsStore } from "../../lib/settings-store"
import { syncHabitToSupabase } from "../../lib/habits-sync-service"

// ============================================
// Types
// ============================================

interface HabitSetupModalProps {
  isOpen: boolean
  onClose: () => void
  editingHabit?: Habit // If provided, we're editing instead of creating
}

// Common habit suggestions based on identity
const HABIT_SUGGESTIONS: Record<string, { name: string; emoji: string }[]> = {
  athlete: [
    { name: "Morning Workout", emoji: "🏃" },
    { name: "Stretching", emoji: "🧘" },
    { name: "Evening Run", emoji: "🏃‍♂️" },
  ],
  founder: [
    { name: "Deep Work", emoji: "💻" },
    { name: "Review Metrics", emoji: "📊" },
    { name: "Team Standup", emoji: "👥" },
  ],
  researcher: [
    { name: "Reading", emoji: "📚" },
    { name: "Note Taking", emoji: "📝" },
    { name: "Research Review", emoji: "🔬" },
  ],
  writer: [
    { name: "Morning Writing", emoji: "✍️" },
    { name: "Journaling", emoji: "📓" },
    { name: "Content Creation", emoji: "✏️" },
  ],
  learner: [
    { name: "Online Course", emoji: "🎓" },
    { name: "Practice Session", emoji: "🎯" },
    { name: "Skill Building", emoji: "🔧" },
  ],
  mindful: [
    { name: "Meditation", emoji: "🧘" },
    { name: "Breathing Exercise", emoji: "🌬️" },
    { name: "Gratitude Practice", emoji: "🙏" },
  ],
}

// Default emojis for habits
const EMOJI_OPTIONS = ["🏃", "💻", "📚", "✍️", "🧘", "🎯", "💪", "🌅", "🌙", "☕", "🎨", "🎵", "🧠", "❤️", "⭐"]

// Frequency options
const FREQUENCY_OPTIONS = [
  { value: 7, label: "Daily (7x/week)" },
  { value: 5, label: "Weekdays (5x/week)" },
  { value: 3, label: "3x per week" },
  { value: 2, label: "2x per week" },
  { value: 1, label: "Weekly (1x/week)" },
]

// ============================================
// Helper: Extract identities from north star
// ============================================

function extractIdentities(northStar?: string): string[] {
  if (!northStar) return []
  
  const text = northStar.toLowerCase()
  const keywords = [
    'athlete', 'founder', 'researcher', 'writer', 'learner',
    'parent', 'partner', 'creator', 'developer', 'designer',
    'entrepreneur', 'student', 'teacher', 'mindful', 'healthy',
    'reader', 'employee'
  ]
  
  const found = keywords.filter(k => text.includes(k))
  
  // If no keywords found, try to extract from comma-separated
  if (found.length === 0) {
    const parts = text.split(',').map(p => p.trim())
    parts.forEach(part => {
      const cleaned = part
        .replace(/^(i want to become|becoming|i'm becoming|a person that's|a|an)\s*/i, '')
        .replace(/\s+(person|individual|someone)$/i, '')
        .trim()
      
      if (cleaned.length > 2 && cleaned.length < 30) {
        found.push(cleaned)
      }
    })
  }
  
  return [...new Set(found)]
}

// ============================================
// Component
// ============================================

export function HabitSetupModal({ isOpen, onClose, editingHabit }: HabitSetupModalProps) {
  const { settings } = useSettingsStore()
  const { addHabit, updateHabit, deleteHabit, habits } = useHabitsStore()
  
  // Extract identities from north star
  const identities = useMemo(() => {
    return extractIdentities(settings.userGoals?.northStar)
  }, [settings.userGoals?.northStar])
  
  // Form state
  const [name, setName] = useState(editingHabit?.name || "")
  const [identity, setIdentity] = useState(editingHabit?.identity || identities[0] || "")
  const [customIdentity, setCustomIdentity] = useState("")
  const [targetFrequency, setTargetFrequency] = useState(editingHabit?.targetFrequency || 7)
  const [emoji, setEmoji] = useState(editingHabit?.emoji || "🎯")
  const [preferredTime, setPreferredTime] = useState(editingHabit?.preferredTime || "")
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [error, setError] = useState("")
  
  // Get suggestions based on selected identity
  const suggestions = useMemo(() => {
    const key = identity.toLowerCase()
    return HABIT_SUGGESTIONS[key] || []
  }, [identity])
  
  // Reset form when modal opens/closes or editing habit changes
  const resetForm = () => {
    setName(editingHabit?.name || "")
    setIdentity(editingHabit?.identity || identities[0] || "")
    setCustomIdentity("")
    setTargetFrequency(editingHabit?.targetFrequency || 7)
    setEmoji(editingHabit?.emoji || "🎯")
    setPreferredTime(editingHabit?.preferredTime || "")
    setError("")
    setShowEmojiPicker(false)
  }
  
  const handleClose = () => {
    resetForm()
    onClose()
  }
  
  const handleSave = async () => {
    // Validation
    const trimmedName = name.trim()
    if (!trimmedName) {
      setError("Please enter a habit name")
      return
    }
    
    const finalIdentity = identity === "__custom__" ? customIdentity.trim() : identity
    if (!finalIdentity) {
      setError("Please select or enter an identity")
      return
    }
    
    // Check for duplicate names (excluding current habit if editing)
    const isDuplicate = habits.some(h => 
      h.name.toLowerCase() === trimmedName.toLowerCase() && 
      h.id !== editingHabit?.id
    )
    if (isDuplicate) {
      setError("A habit with this name already exists")
      return
    }
    
    try {
      if (editingHabit) {
        // Update existing habit
        updateHabit(editingHabit.id, {
          name: trimmedName,
          identity: finalIdentity,
          targetFrequency,
          emoji,
          preferredTime: preferredTime || undefined,
        })
        
        // Sync to Supabase
        const updatedHabit = { 
          ...editingHabit, 
          name: trimmedName, 
          identity: finalIdentity, 
          targetFrequency, 
          emoji,
          preferredTime: preferredTime || undefined,
          updatedAt: new Date().toISOString()
        }
        syncHabitToSupabase(updatedHabit, "update").catch(console.error)
      } else {
        // Create new habit
        const newHabit = addHabit({
          name: trimmedName,
          identity: finalIdentity,
          targetFrequency,
          emoji,
          preferredTime: preferredTime || undefined,
          isActive: true,
        })
        
        // Sync to Supabase
        syncHabitToSupabase(newHabit, "insert").catch(console.error)
      }
      
      handleClose()
    } catch (err) {
      setError("Failed to save habit")
      console.error(err)
    }
  }
  
  const handleDelete = async () => {
    if (!editingHabit) return
    
    if (confirm(`Delete "${editingHabit.name}"? This will also delete all completion history.`)) {
      deleteHabit(editingHabit.id)
      syncHabitToSupabase(editingHabit, "delete").catch(console.error)
      handleClose()
    }
  }
  
  const handleSuggestionClick = (suggestion: { name: string; emoji: string }) => {
    setName(suggestion.name)
    setEmoji(suggestion.emoji)
  }
  
  if (!isOpen) return null
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="relative bg-background border border-border rounded-xl shadow-2xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-background border-b border-border px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {editingHabit ? "Edit Habit" : "New Habit"}
          </h2>
          <button
            onClick={handleClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Error message */}
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
              {error}
            </div>
          )}
          
          {/* Identity selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              Which identity does this serve?
            </label>
            <div className="flex flex-wrap gap-2">
              {identities.map(id => (
                <button
                  key={id}
                  onClick={() => setIdentity(id)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize ${
                    identity === id
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  }`}
                >
                  {id}
                </button>
              ))}
              <button
                onClick={() => setIdentity("__custom__")}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  identity === "__custom__"
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
              >
                + Custom
              </button>
            </div>
            
            {identity === "__custom__" && (
              <input
                type="text"
                value={customIdentity}
                onChange={(e) => setCustomIdentity(e.target.value)}
                placeholder="Enter identity (e.g., reader, creator)"
                className="w-full px-3 py-2 mt-2 bg-secondary border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            )}
          </div>
          
          {/* Suggestions */}
          {suggestions.length > 0 && !editingHabit && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Suggestions for {identity}
              </label>
              <div className="flex flex-wrap gap-2">
                {suggestions.map(s => (
                  <button
                    key={s.name}
                    onClick={() => handleSuggestionClick(s)}
                    className="px-3 py-1.5 bg-secondary/50 hover:bg-secondary text-sm rounded-lg transition-colors flex items-center gap-1.5"
                  >
                    <span>{s.emoji}</span>
                    <span>{s.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {/* Habit name with emoji */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              Habit name
            </label>
            <div className="flex gap-2">
              {/* Emoji picker button */}
              <div className="relative">
                <button
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="w-12 h-10 bg-secondary border border-border rounded-lg text-lg hover:bg-secondary/80 transition-colors"
                >
                  {emoji}
                </button>
                
                {showEmojiPicker && (
                  <div className="absolute top-12 left-0 z-10 p-2 bg-background border border-border rounded-lg shadow-lg grid grid-cols-5 gap-1">
                    {EMOJI_OPTIONS.map(e => (
                      <button
                        key={e}
                        onClick={() => {
                          setEmoji(e)
                          setShowEmojiPicker(false)
                        }}
                        className="w-8 h-8 hover:bg-secondary rounded transition-colors"
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Morning Workout"
                className="flex-1 px-3 py-2 bg-secondary border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>
          
          {/* Frequency */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              How often?
            </label>
            <div className="grid grid-cols-2 gap-2">
              {FREQUENCY_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setTargetFrequency(opt.value)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    targetFrequency === opt.value
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          
          {/* Preferred time (optional) */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              Preferred time <span className="text-muted-foreground/60">(optional)</span>
            </label>
            <input
              type="time"
              value={preferredTime}
              onChange={(e) => setPreferredTime(e.target.value)}
              className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>
        
        {/* Footer */}
        <div className="sticky bottom-0 bg-background border-t border-border px-6 py-4 flex items-center justify-between">
          {editingHabit ? (
            <button
              onClick={handleDelete}
              className="px-4 py-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors text-sm font-medium"
            >
              Delete
            </button>
          ) : (
            <div />
          )}
          
          <div className="flex gap-2">
            <button
              onClick={handleClose}
              className="px-4 py-2 bg-secondary hover:bg-secondary/80 rounded-lg transition-colors text-sm font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg transition-colors text-sm font-medium"
            >
              {editingHabit ? "Save Changes" : "Add Habit"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================
// Habit List Component (for Settings)
// ============================================

interface HabitListProps {
  onAddNew: () => void
  onEdit: (habit: Habit) => void
}

export function HabitList({ onAddNew, onEdit }: HabitListProps) {
  const { habits, toggleCompletion, getHabitWithStats } = useHabitsStore()
  const activeHabits = habits.filter(h => h.isActive).sort((a, b) => a.sortOrder - b.sortOrder)
  
  if (activeHabits.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-4xl mb-3">🎯</div>
        <p className="text-muted-foreground mb-4">No habits set up yet</p>
        <button
          onClick={onAddNew}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          Add Your First Habit
        </button>
      </div>
    )
  }
  
  return (
    <div className="space-y-2">
      {activeHabits.map(habit => {
        const stats = getHabitWithStats(habit.id)
        
        return (
          <div
            key={habit.id}
            onClick={() => onEdit(habit)}
            className="flex items-center justify-between p-3 bg-secondary/50 hover:bg-secondary rounded-lg cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">{habit.emoji || "🎯"}</span>
              <div>
                <div className="font-medium">{habit.name}</div>
                <div className="text-xs text-muted-foreground capitalize">
                  {habit.identity} • {habit.targetFrequency}x/week
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {stats && stats.currentStreak > 0 && (
                <span className="text-sm text-orange-500">
                  {stats.currentStreak}🔥
                </span>
              )}
              <span className="text-sm text-muted-foreground">
                {stats?.weeklyCompletions || 0}/{habit.targetFrequency}
              </span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-foreground">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </div>
          </div>
        )
      })}
      
      <button
        onClick={onAddNew}
        className="w-full p-3 border border-dashed border-border hover:border-primary/50 rounded-lg text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-2"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 5v14M5 12h14" />
        </svg>
        Add Habit
      </button>
    </div>
  )
}






