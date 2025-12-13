
import { useState, useRef, useEffect } from "react"
import type { AIMessage, AIProviderInterface } from "../../lib/ai-providers"
import { getAIProvider, getAIProviderWithFallback, type AIConfig, OllamaProvider } from "../../lib/ai-providers"
import { getAdaptiveSystemPrompt } from "../../lib/chat-personalities"
import { useToastStore } from "../toasts"
import { useSettingsStore } from "../../lib/settings-store"
import type { Mood } from "../../lib/journal-store"
import { useJournalStore } from "../../lib/journal-store"
import { useScheduleStore } from "../../lib/schedule-store"
import { storage } from "../../lib/storage"
import { aiCache } from "../../lib/ai-cache"
import { buildAIContext, formatContextForAI, type AIContext } from "../../lib/ai-context-builder"
import { saveConversation, loadConversation, clearConversation, markConversationSaved, cleanupExpiredConversations } from "../../lib/conversation-storage"

/**
 * Generate suggested follow-up actions based on AI response and context
 */
function generateSuggestedActions(aiResponse: string, context: AIContext): string[] {
  const suggestions: string[] = []
  const responseLower = aiResponse.toLowerCase()
  
  // Context-based suggestions
  if (context.today?.schedule) {
    const { completedBlocks, totalBlocks } = context.today
    if (totalBlocks > 0 && completedBlocks !== undefined && completedBlocks < totalBlocks) {
      const remaining = totalBlocks - completedBlocks
      if (remaining > 0) {
        suggestions.push(`Tell me about my remaining ${remaining} blocks today`)
      }
    }
  }
  
  // Response-based suggestions
  if (responseLower.includes("stress") || responseLower.includes("anxious")) {
    suggestions.push("How can I reduce stress right now?")
    suggestions.push("What's in my control today?")
  } else if (responseLower.includes("routine") || responseLower.includes("schedule") || responseLower.includes("habit")) {
    suggestions.push("How can I improve my habits?")
    if (context.schedulePattern?.topIdentities?.length) {
      suggestions.push(`Tell me about my ${context.schedulePattern.topIdentities[0]} habit`)
    }
  } else if (responseLower.includes("mood") || responseLower.includes("feeling")) {
    suggestions.push("What's affecting my mood today?")
    if (context.moodTrend?.mostCommon) {
      suggestions.push(`Why have I been feeling ${context.moodTrend.mostCommon} lately?`)
    }
  } else if (responseLower.includes("pattern") || responseLower.includes("trend")) {
    suggestions.push("What patterns do you notice in my schedule?")
    if (context.schedulePattern?.adherence !== undefined) {
      suggestions.push(`How can I improve my ${context.schedulePattern.adherence}% adherence?`)
    }
  }
  
  // General fallback suggestions
  if (suggestions.length === 0) {
    suggestions.push("What should I focus on right now?")
    if (context.today?.schedule && context.today.totalBlocks > 0) {
      suggestions.push("Tell me about my schedule today")
    }
    if (context.recentJournals && context.recentJournals.length > 0) {
      suggestions.push("What themes have I been journaling about?")
    }
  }
  
  return suggestions.slice(0, 3) // Max 3 suggestions
}

interface ChatInterfaceProps {
  onSaveEntry: (content: string, mood: Mood, tags: string[], summary?: string) => void
}

export function ChatInterface({ onSaveEntry }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<AIMessage[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [aiProvider, setAiProvider] = useState<AIProviderInterface | null>(null)
  const [aiStatus, setAiStatus] = useState<"checking" | "ollama" | "cloud" | "offline">("checking")
  const [suggestedActions, setSuggestedActions] = useState<string[]>([])
  const { settings } = useSettingsStore()
  const { entries: journalEntries } = useJournalStore()
  const { getTodayCommit, commits } = useScheduleStore()
  
  // Get AI config from settings store
  const getAIConfig = (): AIConfig => {
    if (settings.aiProvider === "ollama") {
      return {
        provider: "ollama",
        ollamaUrl: settings.ollamaUrl,
        ollamaModel: settings.ollamaModel,
      }
    } else {
      // Default to Gemini
      return {
        provider: "gemini",
        apiKey: settings.geminiApiKey || "",
        model: "gemini-2.5-flash", // From official quickstart docs
      }
    }
  }

  // Fallback config (cloud AI when Ollama unavailable) - Use Gemini
  const fallbackConfig: AIConfig = {
    provider: "gemini",
    apiKey: settings.geminiApiKey || "",
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

  // Function to initialize a new conversation
  const initializeNewConversation = () => {
    // Build initial context
    const todayCommit = getTodayCommit()
    const context = buildAIContext({
      todayCommit,
      commits,
      journalEntries,
      userGoals: settings.userGoals,
    })
    const contextString = formatContextForAI(context)
    
    // Initialize with empathetic greeting and context
    const systemPrompt = getAdaptiveSystemPrompt([], contextString)
    
    // Personalized greeting based on context and north star
    let greeting = "Hey. What's on your mind today?"
    
    // Include north star in greeting if available
    if (settings.userGoals?.northStar) {
      let northStarText = settings.userGoals.northStar.trim()
      
      // Clean up common phrases that might be in the text
      northStarText = northStarText
        .replace(/^i want to become (a person that's|someone who's|someone that's|a person who's)/i, "")
        .replace(/^i want to become /i, "")
        .replace(/^i'm becoming /i, "")
        .replace(/^i'm working toward becoming /i, "")
        .trim()
      
      // If still too long, truncate intelligently
      if (northStarText.length > 80) {
        // Try to truncate at a comma or period
        const truncated = northStarText.substring(0, 80)
        const lastComma = truncated.lastIndexOf(",")
        const lastPeriod = truncated.lastIndexOf(".")
        const cutPoint = Math.max(lastComma, lastPeriod)
        northStarText = cutPoint > 40 ? truncated.substring(0, cutPoint) : truncated + "..."
      }
      
      if (northStarText.length > 0) {
        greeting = `Hey. I see you're working toward becoming ${northStarText.toLowerCase()}. What's on your mind today?`
      }
    } else if (todayCommit && todayCommit.blocks.length > 0) {
      const completed = todayCommit.blocks.filter(b => b.completed === true).length
      const total = todayCommit.blocks.length
      if (completed > 0) {
        greeting = `Hey. I see you've completed ${completed} of ${total} blocks today. What's on your mind?`
      } else {
        greeting = `Hey. You have ${total} blocks planned today. What's on your mind?`
      }
    }
    
    setMessages([
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "assistant",
        content: greeting,
      },
    ])
    setSuggestedActions([])
    clearConversation() // Clear any saved conversation
  }

  // Initialize system prompt once on mount with context
  // Try to load saved conversation first, otherwise initialize new
  useEffect(() => {
    // Clean up expired conversations
    cleanupExpiredConversations()
    
    // Try to load saved conversation
    const savedMessages = loadConversation()
    
    if (savedMessages && savedMessages.length > 2) {
      // Restore saved conversation
      setMessages(savedMessages)
      return
    }
    
    // No saved conversation, initialize new one
    initializeNewConversation()
  }, []) // Only run once on mount

  const handleStartNewConversation = () => {
    initializeNewConversation()
    addToast("Started new conversation")
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Save conversation to local storage whenever messages change
  useEffect(() => {
    // Only save if there's actual conversation (more than system + greeting)
    if (messages.length > 2) {
      saveConversation(messages)
    }
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: AIMessage = { role: "user", content: input.trim() }
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInput("")
    setSuggestedActions([]) // Clear suggestions when user sends new message
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
      
      // Build context-aware system prompt
      const todayCommit = getTodayCommit()
      const context = buildAIContext({
        todayCommit,
        commits,
        journalEntries,
        userGoals: settings.userGoals,
      })
      const contextString = formatContextForAI(context)
      
      // Update system prompt adaptively based on full conversation history and context
      const adaptivePrompt = getAdaptiveSystemPrompt(userMessages, contextString)
      
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
      
      // Generate suggested follow-up actions
      const suggestions = generateSuggestedActions(response.content, context)
      setSuggestedActions(suggestions)
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
      
      // Mark conversation as saved and clear it from storage
      markConversationSaved()
      
      // Clear conversation for new session and reset context
      const todayCommit = getTodayCommit()
      const freshContext = buildAIContext({
        todayCommit,
        commits,
        journalEntries,
        userGoals: settings.userGoals,
      })
      const freshContextString = formatContextForAI(freshContext)
      
      setMessages([
        {
          role: "system",
          content: getAdaptiveSystemPrompt([], freshContextString),
        },
        {
          role: "assistant",
          content: "Saved. What's on your mind?",
        },
      ])
      setSuggestedActions([])
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
        {messages.length > 2 && (
          <button
            onClick={handleStartNewConversation}
            className="text-xs px-2 py-1 bg-secondary hover:bg-secondary/80 rounded-md transition-colors text-muted-foreground hover:text-foreground"
            title="Start a new conversation"
          >
            New Chat
          </button>
        )}
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
                {/* Show suggested actions after assistant messages */}
                {message.role === "assistant" && idx === messages.filter((m) => m.role !== "system").length - 1 && suggestedActions.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border/50">
                    <p className="text-xs text-muted-foreground mb-2">Quick actions:</p>
                    <div className="flex flex-wrap gap-2">
                      {suggestedActions.map((action, actionIdx) => (
                        <button
                          key={actionIdx}
                          onClick={() => {
                            setInput(action)
                            setSuggestedActions([])
                          }}
                          className="text-xs px-2 py-1 bg-secondary hover:bg-secondary/80 rounded-md transition-colors"
                        >
                          {action}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
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
            className="input flex-1 resize-none"
            rows={2}
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-primary"
          >
            Send
          </button>
        </div>
        {messages.length > 2 && (
          <button
            onClick={handleSaveConversation}
            disabled={isLoading}
            className="btn btn-secondary w-full disabled:opacity-50"
          >
            💾 Save Conversation to Journal
          </button>
        )}
      </div>
    </div>
  )
}
