import React, { useState, useEffect } from "react"
import { getSetupStatus, testOllamaConnection } from "../../lib/setup-detection"
import { isSupabaseConfigured } from "../../lib/supabase"
import type { SetupStatus } from "../../lib/setup-detection"

interface OnboardingModalProps {
  isOpen: boolean
  onComplete: () => void
}

export function OnboardingModal({ isOpen, onComplete }: OnboardingModalProps) {
  const [step, setStep] = useState(0)
  const [setupStatus, setSetupStatus] = useState<SetupStatus | null>(null)
  const [checkingOllama, setCheckingOllama] = useState(false)
  
  useEffect(() => {
    if (isOpen) {
      // Check setup status when modal opens
      getSetupStatus().then(setSetupStatus)
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
    if (step < steps.length - 1) {
      setStep(step + 1)
      // Refresh setup status when moving to setup step
      if (step === 0) {
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
            >
              {step === steps.length - 1 ? "Get Started" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
