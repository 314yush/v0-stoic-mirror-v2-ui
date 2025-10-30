"use client"

import { useState } from "react"

interface AIPanelProps {
  content: string
  onClose: () => void
}

type AIMode = "reflect" | "unstick" | "reframe" | "gratitude"

export function AIPanel({ content, onClose }: AIPanelProps) {
  const [mode, setMode] = useState<AIMode>("reflect")
  const [response, setResponse] = useState("")

  const handleGenerate = () => {
    // Mock AI response
    const responses = {
      reflect: "Based on your entry, it seems you're processing some complex emotions. What stands out is...",
      unstick: "Here's a different perspective to consider: What if you approached this from...",
      reframe: "Let's reframe this situation: Instead of seeing it as a setback, consider it as...",
      gratitude: "Three things to appreciate from this experience: 1) You showed up, 2) You're reflecting, 3)...",
    }
    setResponse(responses[mode])
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
          <label className="text-xs font-medium text-muted-foreground">Mode</label>
          <div className="grid grid-cols-2 gap-2">
            {(["reflect", "unstick", "reframe", "gratitude"] as AIMode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
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

        <button
          onClick={handleGenerate}
          disabled={!content}
          className="w-full px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Generate
        </button>

        {response && (
          <div className="p-3 bg-secondary rounded-md">
            <p className="text-sm text-foreground leading-relaxed">{response}</p>
          </div>
        )}

        <div className="pt-4 border-t border-border">
          <button
            disabled
            className="w-full px-4 py-2 text-sm text-muted-foreground bg-secondary/50 rounded-md cursor-not-allowed"
          >
            Summarize (Coming Soon)
          </button>
        </div>
      </div>
    </div>
  )
}
