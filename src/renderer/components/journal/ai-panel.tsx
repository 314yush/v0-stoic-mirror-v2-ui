
import { useState } from "react"

interface AIPanelProps {
  content: string
  onClose: () => void
  onApplySummary?: (summary: string, suggestedTags: string[]) => void
}

type AIMode = "reflect" | "unstick" | "reframe" | "gratitude"

const MICRO_PROMPTS: Record<AIMode, string[]> = {
  reflect: [
    "What felt heavy today? What felt light?",
    "What did your body tell you?",
    "Name the feeling. Where do you feel it?",
  ],
  unstick: [
    "What's the smallest next step that would feel kind?",
    "If a friend felt this, what would you say?",
    "What's 1 thing you can leave for Future-You to handle?",
  ],
  reframe: [
    "What belief is here? Try a more helpful version.",
    "What story are you telling yourself?",
    "If this were a wave, you don't need to stop it—just surf it.",
  ],
  gratitude: ["Name 3 tiny gratitudes. Be specific.", "What surprised you today?", "Who made you smile?"],
}

export function AIPanel({ content, onClose, onApplySummary }: AIPanelProps) {
  const [mode, setMode] = useState<AIMode>("reflect")
  const [response, setResponse] = useState("")
  const [currentPromptIndex, setCurrentPromptIndex] = useState(0)
  const [summary, setSummary] = useState<string[]>([])
  const [suggestedTags, setSuggestedTags] = useState<string[]>([])

  const handleGenerate = () => {
    const responses = {
      reflect: [
        "It sounds like you're carrying a lot right now.",
        "Your body is trying to tell you something—maybe it's time to listen.",
        "These feelings are valid, and they don't define you.",
      ],
      unstick: [
        "The smallest step forward is still progress.",
        "You don't have to solve everything today.",
        "Future-You will thank you for being gentle right now.",
      ],
      reframe: [
        "What if this challenge is teaching you something valuable?",
        "You're not stuck—you're in transition.",
        "This feeling is temporary, even if it doesn't feel that way.",
      ],
      gratitude: [
        "You showed up today, and that matters.",
        "There's beauty in the small moments you might have missed.",
        "Your awareness of gratitude is itself something to appreciate.",
      ],
    }

    const mockSummary = responses[mode]
    const mockTags = {
      reflect: ["Reflection", "Awareness"],
      unstick: ["Growth", "Self-compassion"],
      reframe: ["Perspective", "Resilience"],
      gratitude: ["Gratitude", "Mindfulness"],
    }

    setSummary(mockSummary)
    setSuggestedTags(mockTags[mode])
    setResponse(mockSummary.join("\n\n"))
  }

  const handleApply = () => {
    if (onApplySummary && summary.length > 0) {
      onApplySummary(summary.join(" • "), suggestedTags)
    }
  }

  return (
    <div className="w-96 border-l border-border bg-card flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground">AI Assistant</h3>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
          ✕
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4">
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">Choose a mode</label>
          <div className="grid grid-cols-2 gap-2">
            {(["reflect", "unstick", "reframe", "gratitude"] as AIMode[]).map((m) => (
              <button
                key={m}
                onClick={() => {
                  setMode(m)
                  setCurrentPromptIndex(0)
                  setResponse("")
                  setSummary([])
                  setSuggestedTags([])
                }}
                className={`px-3 py-2 text-xs rounded-md transition-colors capitalize ${
                  mode === m
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-foreground hover:bg-secondary/80"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        <div className="p-3 bg-secondary/50 rounded-md border border-border">
          <p className="text-xs text-muted-foreground mb-2">Prompt</p>
          <p className="text-sm text-foreground leading-relaxed">{MICRO_PROMPTS[mode][currentPromptIndex]}</p>
          <div className="flex items-center justify-between mt-3">
            <button
              onClick={() => setCurrentPromptIndex((prev) => Math.max(0, prev - 1))}
              disabled={currentPromptIndex === 0}
              className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
            >
              ← Previous
            </button>
            <span className="text-xs text-muted-foreground">
              {currentPromptIndex + 1} / {MICRO_PROMPTS[mode].length}
            </span>
            <button
              onClick={() => setCurrentPromptIndex((prev) => Math.min(MICRO_PROMPTS[mode].length - 1, prev + 1))}
              disabled={currentPromptIndex === MICRO_PROMPTS[mode].length - 1}
              className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Next →
            </button>
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={!content}
          className="w-full px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Generate Response
        </button>

        {response && (
          <div className="space-y-3">
            <div className="p-3 bg-secondary rounded-md space-y-2">
              {summary.map((bullet, i) => (
                <p key={i} className="text-sm text-foreground leading-relaxed">
                  • {bullet}
                </p>
              ))}
            </div>

            {suggestedTags.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Suggested tags</p>
                <div className="flex flex-wrap gap-1">
                  {suggestedTags.map((tag) => (
                    <span key={tag} className="px-2 py-1 text-xs bg-primary/20 text-primary rounded">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={handleApply}
              className="w-full px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              Apply to Entry
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
