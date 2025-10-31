/**
 * AI Provider Abstraction Layer
 * 
 * Supports multiple AI providers:
 * - Ollama (local, free, private)
 * - Gemini (Google)
 */

export type AIProvider = "ollama" | "gemini"

export interface AIConfig {
  provider: AIProvider
  // Ollama config
  ollamaUrl?: string // Default: http://localhost:11434
  ollamaModel?: string // Default: llama3.2:1b
  // API keys for cloud providers
  apiKey?: string
  // Model names for cloud providers
  model?: string
}

export interface AIMessage {
  role: "user" | "assistant" | "system"
  content: string
}

export interface AIResponse {
  content: string
  error?: string
}

/**
 * AI Provider Interface
 */
interface AIProviderInterface {
  chat(messages: AIMessage[]): Promise<AIResponse>
  generateSummary(conversation: string): Promise<string>
  extractTags(conversation: string): Promise<string[]>
  suggestMood(conversation: string): Promise<string>
}

/**
 * Ollama Provider (Local)
 */
export class OllamaProvider implements AIProviderInterface {
  constructor(private config: AIConfig) {}

  private getBaseUrl(): string {
    return this.config.ollamaUrl || "http://localhost:11434"
  }

  private getModel(): string {
    return this.config.ollamaModel || "llama3.2:1b"
  }

  async chat(messages: AIMessage[]): Promise<AIResponse> {
    try {
      // Use Ollama's chat API for better conversation handling
      const response = await fetch(`${this.getBaseUrl()}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: this.getModel(),
          messages: messages.map((m) => ({
            role: m.role === "system" ? "system" : m.role,
            content: m.content,
          })),
          stream: false,
        }),
      })

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.statusText}`)
      }

      const data = await response.json()
      return { content: data.message?.content || "" }
    } catch (error) {
      return {
        content: "",
        error: error instanceof Error ? error.message : "Failed to connect to Ollama. Make sure it's running locally.",
      }
    }
  }

  async generateSummary(conversation: string): Promise<string> {
    const prompt = `Summarize this journal conversation into 2-3 compassionate bullet points:

${conversation}

Summary:`

    const response = await this.chat([{ role: "user", content: prompt }])
    return response.content || "No summary available"
  }

  async extractTags(conversation: string): Promise<string[]> {
    const prompt = `Extract relevant tags from this journal conversation. Return only tag names, comma-separated:

${conversation}

Tags:`

    const response = await this.chat([{ role: "user", content: prompt }])
    const tags = response.content
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0)
      .slice(0, 5) // Max 5 tags
    return tags
  }

  async suggestMood(conversation: string): Promise<string> {
    const prompt = `Based on this journal conversation, suggest a mood emoji: 😌 🙂 😐 😣 😡

${conversation}

Mood:`

    const response = await this.chat([{ role: "user", content: prompt }])
    const mood = response.content.trim().match(/[😌🙂😐😣😡]/)?.[0] || "😐"
    return mood
  }
}


/**
 * Gemini Provider (Google)
 */
class GeminiProvider implements AIProviderInterface {
  constructor(private config: AIConfig) {}

  async chat(messages: AIMessage[]): Promise<AIResponse> {
    try {
      if (!this.config.apiKey) {
        throw new Error("Gemini API key is required")
      }

      // Use v1beta endpoint as per official docs: https://ai.google.dev/gemini-api/docs/quickstart
      // Use gemini-2.5-flash (from official quickstart - free tier compatible)
      const model = this.config.model || "gemini-2.5-flash"
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`
      
      // Format messages for Gemini API according to official format
      // Separate system instruction from conversation messages
      const systemMessage = messages.find((m) => m.role === "system")
      const conversationMessages = messages.filter((m) => m.role !== "system")
      
      // Convert messages to Gemini format
      // Gemini expects alternating user/model roles in contents array
      const contents: any[] = []
      let currentRole: "user" | "model" | null = null
      
      for (const msg of conversationMessages) {
        const geminiRole = msg.role === "assistant" ? "model" : "user"
        
        // Only add new content object if role changed or first message
        if (currentRole !== geminiRole || contents.length === 0) {
          contents.push({
            role: geminiRole,
            parts: [{ text: msg.content }],
          })
          currentRole = geminiRole
        } else {
          // Append to last content if same role
          contents[contents.length - 1].parts[0].text += "\n\n" + msg.content
        }
      }

      const requestBody: any = { contents }
      
      // Add system instruction if present (Gemini supports this)
      if (systemMessage) {
        requestBody.systemInstruction = {
          parts: [{ text: systemMessage.content }],
        }
      }

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": this.config.apiKey, // API key as header per official docs
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = `Gemini API error: ${response.statusText} (${response.status})`
        try {
          const errorData = JSON.parse(errorText)
          errorMessage = errorData.error?.message || errorMessage
        } catch {
          errorMessage = errorText || errorMessage
        }
        throw new Error(errorMessage)
      }

      const data = await response.json()
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text || ""
      
      if (!content && data.candidates?.[0]?.finishReason === "SAFETY") {
        return {
          content: "",
          error: "Response blocked by safety filters",
        }
      }
      
      return { content }
    } catch (error) {
      return {
        content: "",
        error: error instanceof Error ? error.message : "Gemini API error",
      }
    }
  }

  async generateSummary(conversation: string): Promise<string> {
    const response = await this.chat([
      {
        role: "user",
        content: `Summarize this journal conversation into 2-3 compassionate bullet points:\n\n${conversation}`,
      },
    ])
    return response.content || "No summary available"
  }

  async extractTags(conversation: string): Promise<string[]> {
    const response = await this.chat([
      {
        role: "user",
        content: `Extract relevant tags from this journal conversation. Return only tag names, comma-separated:\n\n${conversation}`,
      },
    ])
    const tags = response.content
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0)
      .slice(0, 5)
    return tags
  }

  async suggestMood(conversation: string): Promise<string> {
    const response = await this.chat([
      {
        role: "user",
        content: `Based on this journal conversation, suggest a mood emoji: 😌 🙂 😐 😣 😡\n\n${conversation}`,
      },
    ])
    const mood = response.content.trim().match(/[😌🙂😐😣😡]/)?.[0] || "😐"
    return mood
  }
}


/**
 * Detect if Ollama is available locally
 */
export async function detectOllama(url: string = "http://localhost:11434"): Promise<boolean> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 1000) // 1s timeout
    
    const response = await fetch(`${url}/api/tags`, {
      method: "GET",
      signal: controller.signal,
    })
    clearTimeout(timeout)
    return response.ok
  } catch {
    return false
  }
}

/**
 * Get AI Provider with smart fallback
 * Tries Ollama first, falls back to Gemini if unavailable
 */
export async function getAIProviderWithFallback(
  config: AIConfig,
  fallbackProvider: AIConfig = { provider: "gemini" }
): Promise<AIProviderInterface> {
  // If explicitly set to non-Ollama, use that
  if (config.provider !== "ollama") {
    return getAIProvider(config)
  }

  // Try Ollama first
  const ollamaAvailable = await detectOllama(config.ollamaUrl || "http://localhost:11434")
  
  if (ollamaAvailable) {
    return new OllamaProvider(config)
  }

  // Fallback to Gemini
  console.log("Ollama not available, falling back to Gemini")
  return getAIProvider(fallbackProvider)
}

/**
 * Get AI Provider instance
 */
export function getAIProvider(config: AIConfig): AIProviderInterface {
  switch (config.provider) {
    case "ollama":
      return new OllamaProvider(config)
    case "gemini":
      return new GeminiProvider(config)
    default:
      return new OllamaProvider(config) // Default to Ollama
  }
}

/**
 * Default AI config (can be stored in settings)
 */
export function getDefaultAIConfig(): AIConfig {
  return {
    provider: "ollama",
    ollamaUrl: "http://localhost:11434",
    ollamaModel: "llama3.2:1b",
  }
}
