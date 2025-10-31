
import { useState, useRef, useEffect } from "react"
import type { AIMessage, AIProviderInterface } from "../../lib/ai-providers"
import { getAIProvider, getAIProviderWithFallback, type AIConfig, OllamaProvider } from "../../lib/ai-providers"
import { getAdaptiveSystemPrompt } from "../../lib/chat-personalities"
import { useToastStore } from "../toasts"
import { useSettingsStore } from "../../lib/settings-store"
import type { Mood } from "../../lib/journal-store"
import { storage } from "../../lib/storage"
import { aiCache } from "../../lib/ai-cache"

interface ChatInterfaceProps {
  onSaveEntry: (content: string, mood: Mood, tags: string[], summary?: string) => void
}

export function ChatInterface({ onSaveEntry }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<AIMessage[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [aiProvider, setAiProvider] = useState<AIProviderInterface | null>(null)
  const [aiStatus, setAiStatus] = useState<"checking" | "ollama" | "cloud" | "offline">("checking")
  const { settings } = useSettingsStore()
  
  // Get AI config from settings store
  const getAIConfig = (): AIConfig => {
    if (settings.aiProvider === "ollama") {
      return {
        provider: "ollama",
        ollamaUrl: settings.ollamaUrl,
        ollamaModel: settings.ollamaModel,
      }
    } else if (settings.aiProvider === "gemini") {
      return {
        provider: "gemini",
        apiKey: settings.geminiApiKey || import.meta.env.VITE_GEMINI_API_KEY || "",
        model: "gemini-2.5-flash", // From official quickstart docs
      }
    } else if (settings.aiProvider === "claude") {
      return {
        provider: "claude",
        apiKey: import.meta.env.VITE_CLAUDE_API_KEY || "",
        model: "claude-3-haiku-20240307",
      }
    } else {
      return {
        provider: "chatgpt",
        apiKey: import.meta.env.VITE_OPENAI_API_KEY || "",
        model: "gpt-3.5-turbo",
      }
    }
  }

  // Fallback config (cloud AI when Ollama unavailable) - Use Gemini
  const fallbackConfig: AIConfig = {
    provider: "gemini",
    apiKey: settings.geminiApiKey || import.meta.env.VITE_GEMINI_API_KEY || "",
    model: "gemini-2.5-flash", // From official quickstart docs
  }
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { addToast } = useToastStore()

  // Detect AI provider on mount and when settings change
  useEffect(() => {
    const detectAndSetProvider = async () => {
      setAiStatus("checking")
      const config = getAIConfig()
      
      // If preferred provider is Ollama, try it first with fallback
      // Otherwise, use the preferred provider directly
      let provider: AIProviderInterface
      if (config.provider === "ollama") {
        provider = await getAIProviderWithFallback(config, fallbackConfig)
      } else {
        provider = getAIProvider(config)
      }
      
      setAiProvider(provider)
      
      // Determine status
      if (provider instanceof OllamaProvider) {
        setAiStatus("ollama")
      } else if (navigator.onLine) {
        setAiStatus("cloud")
      } else {
        setAiStatus("offline")
      }
    }

    detectAndSetProvider()
  }, [settings.aiProvider, settings.ollamaUrl, settings.ollamaModel, settings.geminiApiKey])

  // Initialize system prompt once on mount
  useEffect(() => {
    // Initialize with empathetic greeting
    const systemPrompt = getAdaptiveSystemPrompt([])
    
    setMessages([
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "assistant",
        content: "Hey. What's on your mind today?",
      },
    ])
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: AIMessage = { role: "user", content: input.trim() }
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInput("")
    setIsLoading(true)

    try {
      // Ensure provider is available
      if (!aiProvider) {
        const config = getAIConfig()
        let provider: AIProviderInterface
        if (config.provider === "ollama") {
          provider = await getAIProviderWithFallback(config, fallbackConfig)
        } else {
          provider = getAIProvider(config)
        }
        setAiProvider(provider)
      }

      const config = getAIConfig()
      const provider = aiProvider || (config.provider === "ollama"
        ? await getAIProviderWithFallback(config, fallbackConfig)
        : getAIProvider(config))

      // Get all user messages from conversation history for adaptive prompt
      const userMessages = newMessages
        .filter((m) => m.role === "user")
        .map((m) => m.content)
      
      // Update system prompt adaptively based on full conversation history
      // No schedule context - just pure empathetic conversation
      const adaptivePrompt = getAdaptiveSystemPrompt(userMessages)
      
      // Build messages array for AI - include full conversation history
      // This ensures the AI remembers the entire conversation
      const messagesToSend: AIMessage[] = []
      
      // Add/update system prompt with current context
      messagesToSend.push({ role: "system", content: adaptivePrompt })
      
      // Add all conversation messages (excluding old system message if exists)
      // This maintains the full conversation flow
      const conversationMessages = newMessages.filter((m) => m.role !== "system")
      messagesToSend.push(...conversationMessages)

      // Try cache first (for offline/fallback)
      const cachedResponse = aiCache.get(userMessage.content)
      if (cachedResponse && !navigator.onLine && aiStatus === "offline") {
        setMessages([...newMessages, { role: "assistant", content: cachedResponse }])
        setIsLoading(false)
        return
      }

      // Debug: Log what we're sending to AI
      if (import.meta.env.DEV) {
        console.log("Sending to AI:", {
          messageCount: messagesToSend.length,
          hasSystemPrompt: messagesToSend[0]?.role === "system",
          userMessageCount: messagesToSend.filter((m) => m.role === "user").length,
          assistantMessageCount: messagesToSend.filter((m) => m.role === "assistant").length,
        })
      }

      const response = await provider.chat(messagesToSend)

      if (response.error) {
        // If error and offline, try cache
        if (!navigator.onLine) {
          const fallbackCache = aiCache.get(userMessage.content)
          if (fallbackCache) {
            setMessages([...newMessages, { role: "assistant", content: fallbackCache }])
            addToast("Using cached response (offline)", "info")
            setIsLoading(false)
            return
          }
        }
        addToast(response.error, "error")
        setIsLoading(false)
        return
      }

      // Cache the response for offline use
      if (response.content) {
        aiCache.set(userMessage.content, response.content)
      }

      // Add assistant response and update system prompt in state
      const updatedMessages = [...newMessages, { role: "assistant", content: response.content }]
      
      // Ensure system prompt is updated in state too
      if (updatedMessages[0]?.role === "system") {
        updatedMessages[0] = { role: "system", content: adaptivePrompt }
      }
      
      setMessages(updatedMessages)
    } catch (error) {
      addToast(error instanceof Error ? error.message : "Failed to get AI response", "error")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveConversation = async () => {
    if (messages.length <= 2) {
      // Only system + initial greeting
      addToast("Start a conversation first", "error")
      return
    }

    setIsLoading(true)
    try {
      const config = getAIConfig()
      const provider = getAIProvider(config)
      const conversation = messages
        .filter((m) => m.role !== "system")
        .map((m) => `${m.role === "user" ? "You" : "AI"}: ${m.content}`)
        .join("\n\n")

      const [summary, tags, mood] = await Promise.all([
        provider.generateSummary(conversation),
        provider.extractTags(conversation),
        provider.suggestMood(conversation),
      ])

      // Combine conversation into entry content
      const content = `${conversation}\n\n---\nSummary: ${summary}`

      onSaveEntry(content, mood as Mood, tags, summary)
      addToast("Conversation saved to journal")
      
      // Clear conversation for new session
      setMessages([
        {
          role: "system",
          content: getAdaptiveSystemPrompt([]),
        },
        {
          role: "assistant",
          content: "Saved. What's on your mind?",
        },
      ])
    } catch (error) {
      addToast(error instanceof Error ? error.message : "Failed to save conversation", "error")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* AI Status indicator */}
      <div className="border-b border-border px-4 py-2 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">AI:</span>
          {aiStatus === "checking" && <span className="text-muted-foreground">Checking...</span>}
          {aiStatus === "ollama" && <span className="text-primary">🟢 Ollama (Local)</span>}
          {aiStatus === "cloud" && <span className="text-blue-500">🔵 Cloud AI</span>}
          {aiStatus === "offline" && <span className="text-muted-foreground">⚠️ Offline Mode</span>}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto px-4 py-4 space-y-4">
        {messages
          .filter((m) => m.role !== "system")
          .map((message, idx) => (
            <div
              key={idx}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  message.role === "user"
                    ? "bg-primary/20 text-foreground"
                    : "bg-secondary text-foreground"
                }`}
              >
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
              </div>
            </div>
          ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-secondary rounded-lg px-4 py-2">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border px-4 py-3 space-y-2">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            placeholder="Share what's on your mind..."
            className="flex-1 px-3 py-2 text-sm bg-card border border-border rounded-md text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary"
            rows={2}
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
        {messages.length > 2 && (
          <button
            onClick={handleSaveConversation}
            disabled={isLoading}
            className="w-full px-4 py-2 text-sm font-medium bg-secondary text-foreground rounded-md hover:bg-secondary/80 transition-colors disabled:opacity-50"
          >
            💾 Save Conversation to Journal
          </button>
        )}
      </div>
    </div>
  )
}
