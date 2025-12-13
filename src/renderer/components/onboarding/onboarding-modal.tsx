import React, { useState, useEffect } from "react"
import { getSetupStatus, testOllamaConnection } from "../../lib/setup-detection"
import { isSupabaseConfigured } from "../../lib/supabase"
import type { SetupStatus } from "../../lib/setup-detection"
import { useSettingsStore, type UserGoals } from "../../lib/settings-store"

interface OnboardingModalProps {
  isOpen: boolean
  onComplete: () => void
}

export function OnboardingModal({ isOpen, onComplete }: OnboardingModalProps) {
  const [step, setStep] = useState(0)
  const [setupStatus, setSetupStatus] = useState<SetupStatus | null>(null)
  const [checkingOllama, setCheckingOllama] = useState(false)
  const { updateSettings } = useSettingsStore()
  
  // Goal setting state
  const [northStar, setNorthStar] = useState("")
  const [lifestyle, setLifestyle] = useState<string[]>([])
  const [preferences, setPreferences] = useState<string[]>([])
  const [otherLifestyle, setOtherLifestyle] = useState("")
  const [otherPreferences, setOtherPreferences] = useState("")
  const [routineNames, setRoutineNames] = useState<string[]>([])
  const [customRoutine, setCustomRoutine] = useState("")
  
  useEffect(() => {
    if (isOpen) {
      // Reset to first step when modal opens
      setStep(0)
      // Check setup status when modal opens
      getSetupStatus().then(setSetupStatus)
      // Load existing goals if available (for editing)
      const settings = useSettingsStore.getState().settings
      if (settings.userGoals) {
        setNorthStar(settings.userGoals.northStar || "")
        setLifestyle(settings.userGoals.lifestyle || [])
        setPreferences(settings.userGoals.preferences || [])
        setOtherLifestyle(settings.userGoals.otherLifestyle || "")
        setOtherPreferences(settings.userGoals.otherPreferences || "")
        setRoutineNames(settings.userGoals.routineNames || [])
      } else {
        // Reset if no goals set
        setNorthStar("")
        setLifestyle([])
        setPreferences([])
        setOtherLifestyle("")
        setOtherPreferences("")
        setRoutineNames([])
      }
    }
  }, [isOpen])

  const refreshSetupStatus = async () => {
    setSetupStatus(await getSetupStatus())
  }

  const handleTestOllama = async () => {
    setCheckingOllama(true)
    const result = await testOllamaConnection("http://localhost:11434")
    setCheckingOllama(false)
    if (result.success) {
      await refreshSetupStatus()
    }
    // Status will update automatically
    setTimeout(() => refreshSetupStatus(), 1000)
  }

  if (!isOpen) return null

  const supabaseConfigured = isSupabaseConfigured()

  // Helper functions for goal setting
  const toggleLifestyle = (value: string) => {
    setLifestyle(prev => 
      prev.includes(value) 
        ? prev.filter(v => v !== value)
        : [...prev, value]
    )
  }

  const togglePreferences = (value: string) => {
    setPreferences(prev => 
      prev.includes(value) 
        ? prev.filter(v => v !== value)
        : [...prev, value]
    )
  }

  const toggleRoutine = (value: string) => {
    setRoutineNames(prev => 
      prev.includes(value) 
        ? prev.filter(v => v !== value)
        : [...prev, value]
    )
  }

  const addCustomRoutine = () => {
    const trimmed = customRoutine.trim()
    if (trimmed && !routineNames.includes(trimmed)) {
      setRoutineNames(prev => [...prev, trimmed])
      setCustomRoutine("")
    }
  }

  const removeRoutine = (routine: string) => {
    setRoutineNames(prev => prev.filter(r => r !== routine))
  }

  const saveGoals = () => {
    const userGoals: UserGoals = {
      northStar: northStar.trim() || undefined,
      lifestyle: lifestyle.length > 0 ? lifestyle : [],
      preferences: preferences.length > 0 ? preferences : [],
      otherLifestyle: otherLifestyle.trim() || undefined,
      otherPreferences: otherPreferences.trim() || undefined,
      routineNames: routineNames.length > 0 ? routineNames : [],
    }
    updateSettings({ userGoals })
  }

  const saveRoutineNames = () => {
    const userGoals: UserGoals = {
      ...useSettingsStore.getState().settings.userGoals,
      routineNames: routineNames.length > 0 ? routineNames : [],
    }
    updateSettings({ userGoals })
  }

  const lifestyleOptions = [
    "Fixed work hours (9-5)",
    "Flexible/remote work",
    "Shift work / irregular hours",
    "Student schedule",
    "Parent/caregiver responsibilities",
    "Early bird (morning energy)",
    "Night owl (evening energy)",
    "Limited free time (< 2 hours/day)",
    "Lots of interruptions/unpredictable schedule",
    "Other",
  ]

  const preferencesOptions = [
    "Structured routines (same time daily)",
    "Flexible approach (adapt as needed)",
    "Visual progress tracking",
    "Accountability & checking in",
    "Minimal/low-friction systems",
    "Detailed planning",
    "Focus on habits over goals",
    "Goal-oriented (clear targets)",
    "Prefer gentle nudges",
    "Prefer direct accountability",
    "Other",
  ]

  const routineOptions = [
    "Morning Routine",
    "Exercise / Workout",
    "Reading",
    "Deep Work",
    "Evening Wind Down",
    "Meditation",
    "Learning / Study",
    "Writing / Journaling",
    "Meal Prep",
    "Social Time",
  ]

  const steps = [
    {
      title: "Welcome to Stoic Mirror",
      icon: "🏛️",
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            A mindful productivity app inspired by Stoic philosophy. Plan your day, reflect in your journal, and track your progress.
          </p>
          <div className="space-y-2">
            <h3 className="font-semibold text-foreground">Get Started:</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Plan your daily schedule in <strong>Today</strong></li>
              <li>Reflect with AI in <strong>Journal</strong></li>
              <li>Track tasks in <strong>Tasks</strong></li>
              <li>Review progress in <strong>Weekly</strong></li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      title: "Set Your North Star",
      icon: "🎯",
      content: (
        <div className="space-y-6">
          <p className="text-muted-foreground">
            Help us personalize your experience. Share your goals and preferences so we can tailor AI conversations and suggestions.
          </p>
          
          {/* Question 1: North Star */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-foreground">
              Who do you want to become? Describe your north star - the person you're striving to be.
            </label>
            <textarea
              value={northStar}
              onChange={(e) => setNorthStar(e.target.value)}
              placeholder="e.g., 'I want to become a person that's a world-class athlete, a startup employee, and passionate reader/researcher'

Think about the identities and roles you want to embody. What kind of person are you becoming?"
              className="input resize-none"
              rows={6}
            />
          </div>

          {/* Question 2: Lifestyle */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-foreground">
              Tell me about your typical day - what constraints or patterns shape your schedule?
            </label>
            <div className="space-y-2 max-h-48 overflow-y-auto border border-border rounded-md p-3">
              {lifestyleOptions.map((option) => (
                <label key={option} className="flex items-center gap-2 cursor-pointer hover:bg-secondary/50 p-2 rounded">
                  <input
                    type="checkbox"
                    checked={lifestyle.includes(option)}
                    onChange={() => toggleLifestyle(option)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-foreground">{option}</span>
                </label>
              ))}
            </div>
            {lifestyle.includes("Other") && (
              <input
                type="text"
                value={otherLifestyle}
                onChange={(e) => setOtherLifestyle(e.target.value)}
                placeholder="Describe your lifestyle..."
                className="input text-sm"
              />
            )}
            {!lifestyle.includes("Other") && (
              <label className="flex items-center gap-2 cursor-pointer hover:bg-secondary/50 p-2 rounded border border-border">
                <input
                  type="checkbox"
                  checked={false}
                  onChange={() => toggleLifestyle("Other")}
                  className="w-4 h-4"
                />
                <span className="text-sm text-foreground">Other</span>
              </label>
            )}
          </div>

          {/* Question 3: Preferences */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-foreground">
              What motivates you and how do you like to work?
            </label>
            <div className="space-y-2 max-h-48 overflow-y-auto border border-border rounded-md p-3">
              {preferencesOptions.map((option) => (
                <label key={option} className="flex items-center gap-2 cursor-pointer hover:bg-secondary/50 p-2 rounded">
                  <input
                    type="checkbox"
                    checked={preferences.includes(option)}
                    onChange={() => togglePreferences(option)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-foreground">{option}</span>
                </label>
              ))}
            </div>
            {preferences.includes("Other") && (
              <input
                type="text"
                value={otherPreferences}
                onChange={(e) => setOtherPreferences(e.target.value)}
                placeholder="Describe your preferences..."
                className="input text-sm"
              />
            )}
          </div>
        </div>
      ),
    },
    {
      title: "Your Current Routines",
      icon: "🔄",
      content: (
        <div className="space-y-6">
          <p className="text-muted-foreground">
            What routines do you currently have? This helps us suggest better names and track your patterns accurately.
          </p>
          
          {/* Routine selection */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-foreground">
              Select your routines (at least one required):
            </label>
            <div className="space-y-2 max-h-64 overflow-y-auto border border-border rounded-md p-3">
              {routineOptions.map((option) => (
                <label key={option} className="flex items-center gap-2 cursor-pointer hover:bg-secondary/50 p-2 rounded">
                  <input
                    type="checkbox"
                    checked={routineNames.includes(option)}
                    onChange={() => toggleRoutine(option)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-foreground">{option}</span>
                </label>
              ))}
            </div>
            
            {/* Custom routine input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={customRoutine}
                onChange={(e) => setCustomRoutine(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addCustomRoutine()}
                placeholder="Add custom routine..."
                className="input text-sm flex-1"
              />
              <button
                onClick={addCustomRoutine}
                disabled={!customRoutine.trim()}
                className="btn btn-sm btn-secondary"
              >
                Add
              </button>
            </div>
            
            {/* Selected routines display */}
            {routineNames.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {routineNames.map((routine) => (
                  <span
                    key={routine}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm"
                  >
                    {routine}
                    <button
                      onClick={() => removeRoutine(routine)}
                      className="ml-1 hover:text-primary/70"
                      aria-label={`Remove ${routine}`}
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            )}
            
            {routineNames.length === 0 && (
              <p className="text-xs text-orange-500">
                Please select at least one routine to continue
              </p>
            )}
          </div>
        </div>
      ),
    },
    {
      title: "Setup & Configuration",
      icon: "⚙️",
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Let's make sure everything is configured. These are optional but recommended for the best experience.
          </p>
          
          {/* Supabase Status */}
          <div className="border border-border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-foreground">Backend (Supabase)</h4>
                <p className="text-xs text-muted-foreground">
                  Required for data sync across devices
                </p>
              </div>
              <div className={`text-sm font-medium ${supabaseConfigured ? 'text-primary' : 'text-muted-foreground'}`}>
                {supabaseConfigured ? '✅ Configured' : '⚠️ Not Set'}
              </div>
            </div>
            {!supabaseConfigured && (
              <div className="text-xs text-muted-foreground space-y-1">
                <p>• Create account at <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">supabase.com</a></p>
                <p>• Run SQL from <code className="text-xs bg-secondary px-1 py-0.5 rounded">SUPABASE_SETUP.sql</code></p>
                <p>• Add credentials in Settings (⚙️ icon)</p>
              </div>
            )}
          </div>

          {/* Ollama Status */}
          {setupStatus && (
            <div className="border border-border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-foreground">AI Provider (Ollama)</h4>
                  <p className="text-xs text-muted-foreground">
                    Local, private AI for journaling (optional)
                  </p>
                </div>
                <div className={`text-sm font-medium ${setupStatus.ollama.running ? 'text-primary' : 'text-muted-foreground'}`}>
                  {setupStatus.ollama.running ? '✅ Running' : '⚠️ Not Running'}
                </div>
              </div>
              {!setupStatus.ollama.running && (
                <div className="space-y-2">
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>• Install: <a href="https://ollama.ai" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">ollama.ai</a></p>
                    <p>• Run: <code className="text-xs bg-secondary px-1 py-0.5 rounded">ollama serve</code></p>
                    <p>• Or use Gemini API key in Settings</p>
                  </div>
                  <button
                    onClick={handleTestOllama}
                    disabled={checkingOllama}
                    className="btn btn-sm btn-secondary w-full"
                  >
                    {checkingOllama ? 'Checking...' : 'Test Connection'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Gemini Status */}
          {setupStatus && (
            <div className="border border-border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-foreground">AI Provider (Gemini)</h4>
                  <p className="text-xs text-muted-foreground">
                    Cloud AI alternative (optional)
                  </p>
                </div>
                <div className={`text-sm font-medium ${setupStatus.gemini.configured ? 'text-primary' : 'text-muted-foreground'}`}>
                  {setupStatus.gemini.configured ? '✅ Configured' : '⚠️ Not Set'}
                </div>
              </div>
              {!setupStatus.gemini.configured && (
                <p className="text-xs text-muted-foreground mt-2">
                  Get API key from <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Google AI Studio</a>
                </p>
              )}
            </div>
          )}

          <div className="text-xs text-muted-foreground bg-secondary/50 p-3 rounded">
            <strong>Note:</strong> You can use the app without AI, but journal AI features won't work. You can configure these later in Settings.
          </div>
        </div>
      ),
    },
    {
      title: "Today Tab",
      icon: "⏳",
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Plan your day with time blocks. Commit to a routine and track completion.
          </p>
          <div className="space-y-2 text-sm">
            <p className="text-foreground"><strong>• Add blocks:</strong> Click "+ New Block" to schedule activities</p>
            <p className="text-foreground"><strong>• Commit:</strong> Lock in your schedule for the day</p>
            <p className="text-foreground"><strong>• Complete:</strong> Mark blocks as done when finished</p>
            <p className="text-muted-foreground text-xs mt-4">
              Tip: You can use saved routines or create your own
            </p>
          </div>
        </div>
      ),
    },
    {
      title: "Journal Tab",
      icon: "📜",
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Reflect on your thoughts with AI assistance or write freely.
          </p>
          <div className="space-y-2 text-sm">
            <p className="text-foreground"><strong>• AI Mode:</strong> Chat with a Stoic companion about your day</p>
            <p className="text-foreground"><strong>• Free Form:</strong> Write without AI assistance</p>
            <p className="text-foreground"><strong>• Save:</strong> Conversations are automatically saved as entries</p>
            <p className="text-muted-foreground text-xs mt-4">
              AI helps you find what's in your control and offers guidance
            </p>
          </div>
        </div>
      ),
    },
    {
      title: "Tasks Tab",
      icon: "✅",
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Simple to-do list organized by date. Track what matters.
          </p>
          <div className="space-y-2 text-sm">
            <p className="text-foreground"><strong>• Add tasks:</strong> Type and press Enter</p>
            <p className="text-foreground"><strong>• Complete:</strong> Click to mark done</p>
            <p className="text-foreground"><strong>• Edit:</strong> Click any task to edit</p>
            <p className="text-muted-foreground text-xs mt-4">
              Completed tasks appear in your Weekly stats
            </p>
          </div>
        </div>
      ),
    },
    {
      title: "Weekly Tab",
      icon: "📊",
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Review your week: routines, journal insights, and completed tasks.
          </p>
          <div className="space-y-2 text-sm">
            <p className="text-foreground"><strong>• Routines:</strong> Create and save routine templates</p>
            <p className="text-foreground"><strong>• Stats:</strong> See completion rates and streaks</p>
            <p className="text-foreground"><strong>• Insights:</strong> Reflect on your patterns</p>
            <p className="text-muted-foreground text-xs mt-4">
              Use "Edit Routine" to create templates for future use
            </p>
          </div>
        </div>
      ),
    },
  ]

  const handleNext = () => {
    // Validate routine names step (step 2)
    if (step === 2 && routineNames.length === 0) {
      return // Don't proceed if no routines selected
    }
    
    if (step < steps.length - 1) {
      // Save goals when leaving goal-setting step (step 1)
      if (step === 1) {
        saveGoals()
      }
      // Save routine names when leaving routine step (step 2)
      if (step === 2) {
        saveRoutineNames()
      }
      setStep(step + 1)
      // Refresh setup status when moving to setup step
      if (step === 2) {
        refreshSetupStatus()
      }
    } else {
      onComplete()
    }
  }

  const handleSkip = () => {
    onComplete()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-lg max-w-2xl w-full shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <span className="text-4xl">{steps[step].icon}</span>
              <div>
                <h2 className="text-2xl font-semibold text-foreground">{steps[step].title}</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Step {step + 1} of {steps.length}
                </p>
              </div>
            </div>
            <button
              onClick={handleSkip}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Skip"
            >
              ✕
            </button>
          </div>

          <div className="mb-6 min-h-[200px]">
            {steps[step].content}
          </div>

          {/* Progress dots */}
          <div className="flex justify-center gap-2 mb-6">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`h-2 rounded-full transition-all ${
                  index === step
                    ? "bg-primary w-8"
                    : "bg-border w-2"
                }`}
              />
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <button
              onClick={handleSkip}
              className="btn-ghost btn-sm"
            >
              Skip
            </button>
            <button
              onClick={handleNext}
              className="btn btn-primary btn-sm"
              disabled={step === 2 && routineNames.length === 0}
            >
              {step === steps.length - 1 ? "Get Started" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
