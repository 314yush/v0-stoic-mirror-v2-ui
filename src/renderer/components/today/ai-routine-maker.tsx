/**
 * AI Routine Maker Component
 * Helps users add new habits by suggesting optimal times based on their schedule
 */

import { useState, useEffect } from 'react'
import type { TimeBlock } from '../../lib/schedule-store'
import type { CalendarEvent } from './day-timeline'
import { 
  COMMON_HABITS, 
  analyzeSchedule, 
  findBestTimeForHabit, 
  buildRoutineFromSuggestions,
  type RoutineSuggestion,
  type ScheduleAnalysis 
} from '../../lib/ai-routine-maker'
import { useSettingsStore } from '../../lib/settings-store'

interface AIRoutineMakerProps {
  blocks: TimeBlock[]
  calendarEvents: CalendarEvent[]
  onAddBlocks: (blocks: Omit<TimeBlock, 'id'>[]) => void
  onClose: () => void
}

export function AIRoutineMaker({ blocks, calendarEvents, onAddBlocks, onClose }: AIRoutineMakerProps) {
  const [step, setStep] = useState<'select' | 'customize' | 'confirm'>('select')
  const [selectedHabits, setSelectedHabits] = useState<Set<string>>(new Set())
  const [customHabit, setCustomHabit] = useState('')
  const [suggestions, setSuggestions] = useState<RoutineSuggestion[]>([])
  const [analysis, setAnalysis] = useState<ScheduleAnalysis | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const { settings } = useSettingsStore()

  // Analyze schedule on mount
  useEffect(() => {
    const scheduleAnalysis = analyzeSchedule(blocks, calendarEvents)
    setAnalysis(scheduleAnalysis)
  }, [blocks, calendarEvents])

  const handleHabitToggle = (habit: string) => {
    setSelectedHabits(prev => {
      const next = new Set(prev)
      if (next.has(habit)) {
        next.delete(habit)
      } else {
        next.add(habit)
      }
      return next
    })
  }

  const handleAddCustomHabit = () => {
    if (customHabit.trim()) {
      setSelectedHabits(prev => new Set([...prev, customHabit.trim()]))
      setCustomHabit('')
    }
  }

  const handleGenerateSuggestions = async () => {
    if (selectedHabits.size === 0 || !analysis) return
    
    setIsGenerating(true)
    
    // Generate suggestions for each selected habit
    const newSuggestions: RoutineSuggestion[] = []
    
    for (const habit of selectedHabits) {
      const habitInfo = COMMON_HABITS.find(h => h.name === habit)
      const duration = habitInfo?.defaultDuration || 30
      const preferredTime = habitInfo?.idealTime as 'morning' | 'afternoon' | 'evening' | undefined
      
      const suggestion = findBestTimeForHabit(habit, duration, analysis, preferredTime)
      if (suggestion) {
        newSuggestions.push(suggestion)
      }
    }
    
    setSuggestions(newSuggestions)
    setIsGenerating(false)
    setStep('customize')
  }

  const handleUpdateSuggestionTime = (habit: string, newTime: string) => {
    setSuggestions(prev => prev.map(s => 
      s.habit === habit ? { ...s, suggestedTime: newTime } : s
    ))
  }

  const handleUpdateSuggestionDuration = (habit: string, newDuration: number) => {
    setSuggestions(prev => prev.map(s => 
      s.habit === habit ? { ...s, duration: newDuration } : s
    ))
  }

  const handleRemoveSuggestion = (habit: string) => {
    setSuggestions(prev => prev.filter(s => s.habit !== habit))
  }

  const handleConfirm = () => {
    const newBlocks = buildRoutineFromSuggestions(suggestions)
    onAddBlocks(newBlocks.map(b => ({
      identity: b.identity,
      start: b.start,
      end: b.end,
      optional: b.optional,
    })))
    onClose()
  }

  // Format time for display
  const formatTime = (time: string) => {
    const [hour, min] = time.split(':').map(Number)
    const suffix = hour >= 12 ? 'pm' : 'am'
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
    return min === 0 ? `${displayHour}${suffix}` : `${displayHour}:${min.toString().padStart(2, '0')}${suffix}`
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">AI Routine Maker</h2>
              <p className="text-sm text-muted-foreground">
                {step === 'select' && 'Select habits you want to add'}
                {step === 'customize' && 'Review and customize suggested times'}
                {step === 'confirm' && 'Confirm your new routine'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-muted-foreground hover:text-foreground rounded-md hover:bg-secondary transition-colors"
            >
              ✕
            </button>
          </div>
          
          {/* Step indicator */}
          <div className="flex gap-2 mt-4">
            {['select', 'customize', 'confirm'].map((s, i) => (
              <div
                key={s}
                className={`flex-1 h-1 rounded-full transition-colors ${
                  ['select', 'customize', 'confirm'].indexOf(step) >= i
                    ? 'bg-primary'
                    : 'bg-secondary'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {/* Step 1: Select Habits */}
          {step === 'select' && (
            <div className="space-y-6">
              {/* Schedule insights */}
              {analysis && (
                <div className="bg-secondary/50 rounded-lg p-4 space-y-2">
                  <h3 className="text-sm font-medium text-foreground">Your schedule today</h3>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-muted-foreground">Free slots:</span>
                      <span className="ml-2 font-medium text-foreground">{analysis.freeSlots.length}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Busy slots:</span>
                      <span className="ml-2 font-medium text-foreground">{analysis.busySlots.length}</span>
                    </div>
                    {analysis.peakProductivityTime && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Best focus time:</span>
                        <span className="ml-2 font-medium text-primary">{formatTime(analysis.peakProductivityTime)}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Common habits grid */}
              <div>
                <h3 className="text-sm font-medium text-foreground mb-3">Popular habits</h3>
                <div className="grid grid-cols-2 gap-2">
                  {COMMON_HABITS.map(habit => (
                    <button
                      key={habit.name}
                      onClick={() => handleHabitToggle(habit.name)}
                      className={`px-4 py-3 text-left rounded-lg border transition-all ${
                        selectedHabits.has(habit.name)
                          ? 'bg-primary/20 border-primary text-foreground'
                          : 'bg-secondary/50 border-border text-muted-foreground hover:bg-secondary hover:text-foreground'
                      }`}
                    >
                      <div className="font-medium text-sm">{habit.name}</div>
                      <div className="text-xs opacity-70">
                        ~{habit.defaultDuration}min • {habit.idealTime}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom habit input */}
              <div>
                <h3 className="text-sm font-medium text-foreground mb-2">Or add your own</h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customHabit}
                    onChange={(e) => setCustomHabit(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddCustomHabit()}
                    placeholder="Custom habit name..."
                    className="flex-1 px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  <button
                    onClick={handleAddCustomHabit}
                    disabled={!customHabit.trim()}
                    className="px-4 py-2 bg-secondary text-foreground rounded-lg text-sm hover:bg-secondary/80 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Selected habits preview */}
              {selectedHabits.size > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {[...selectedHabits].map(habit => (
                    <span
                      key={habit}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-primary/20 text-primary rounded-full text-sm"
                    >
                      {habit}
                      <button
                        onClick={() => handleHabitToggle(habit)}
                        className="hover:text-primary/70"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Customize Suggestions */}
          {step === 'customize' && (
            <div className="space-y-4">
              {suggestions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Could not find suitable time slots for selected habits.</p>
                  <button
                    onClick={() => setStep('select')}
                    className="mt-4 px-4 py-2 bg-secondary rounded-lg text-sm"
                  >
                    Go back and try different habits
                  </button>
                </div>
              ) : (
                suggestions.map((suggestion, index) => (
                  <div
                    key={suggestion.habit}
                    className="bg-secondary/50 rounded-lg p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium text-foreground">{suggestion.habit}</h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          {suggestion.reason}
                        </p>
                      </div>
                      <button
                        onClick={() => handleRemoveSuggestion(suggestion.habit)}
                        className="p-1 text-muted-foreground hover:text-destructive rounded"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-muted-foreground">Time:</label>
                        <input
                          type="time"
                          value={suggestion.suggestedTime}
                          onChange={(e) => handleUpdateSuggestionTime(suggestion.habit, e.target.value)}
                          className="px-2 py-1 bg-background border border-border rounded text-sm"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-muted-foreground">Duration:</label>
                        <select
                          value={suggestion.duration}
                          onChange={(e) => handleUpdateSuggestionDuration(suggestion.habit, Number(e.target.value))}
                          className="px-2 py-1 bg-background border border-border rounded text-sm"
                        >
                          <option value={15}>15 min</option>
                          <option value={30}>30 min</option>
                          <option value={45}>45 min</option>
                          <option value={60}>1 hour</option>
                          <option value={90}>1.5 hours</option>
                          <option value={120}>2 hours</option>
                        </select>
                      </div>
                    </div>

                    {/* Confidence indicator */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Confidence:</span>
                      <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            suggestion.confidence > 0.8 ? 'bg-primary' :
                            suggestion.confidence > 0.5 ? 'bg-yellow-500' : 'bg-destructive'
                          }`}
                          style={{ width: `${suggestion.confidence * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {Math.round(suggestion.confidence * 100)}%
                      </span>
                    </div>

                    {/* Alternatives */}
                    {suggestion.alternatives && suggestion.alternatives.length > 0 && (
                      <div className="pt-2 border-t border-border">
                        <span className="text-xs text-muted-foreground">Alternatives: </span>
                        {suggestion.alternatives.map((alt, i) => (
                          <button
                            key={i}
                            onClick={() => handleUpdateSuggestionTime(suggestion.habit, alt.time)}
                            className="ml-2 text-xs text-primary hover:underline"
                          >
                            {formatTime(alt.time)}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* Step 3: Confirm */}
          {step === 'confirm' && (
            <div className="space-y-4">
              <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
                <h3 className="text-sm font-medium text-foreground mb-2">New routine summary</h3>
                <p className="text-xs text-muted-foreground mb-4">
                  These blocks will be added to your schedule:
                </p>
                <div className="space-y-2">
                  {suggestions.map(s => (
                    <div
                      key={s.habit}
                      className="flex items-center justify-between py-2 border-b border-border last:border-0"
                    >
                      <span className="font-medium text-foreground">{s.habit}</span>
                      <span className="text-sm text-muted-foreground">
                        {formatTime(s.suggestedTime)} ({s.duration}min)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex justify-between">
          <button
            onClick={() => {
              if (step === 'customize') setStep('select')
              else if (step === 'confirm') setStep('customize')
              else onClose()
            }}
            className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {step === 'select' ? 'Cancel' : 'Back'}
          </button>
          
          <button
            onClick={() => {
              if (step === 'select') handleGenerateSuggestions()
              else if (step === 'customize') setStep('confirm')
              else handleConfirm()
            }}
            disabled={step === 'select' && selectedHabits.size === 0}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isGenerating && (
              <span className="animate-spin">◐</span>
            )}
            {step === 'select' && 'Generate Suggestions'}
            {step === 'customize' && 'Review & Confirm'}
            {step === 'confirm' && 'Add to Schedule'}
          </button>
        </div>
      </div>
    </div>
  )
}




