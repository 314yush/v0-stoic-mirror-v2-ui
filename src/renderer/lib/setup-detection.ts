/**
 * Setup Detection Utilities
 * Helps detect if required services are configured and running
 */

import { isSupabaseConfigured } from "./supabase"
import { getAIProvider } from "./ai-providers"

export interface SetupStatus {
  supabase: {
    configured: boolean
    message: string
  }
  ollama: {
    installed: boolean
    running: boolean
    message: string
    url?: string
  }
  gemini: {
    configured: boolean
    message: string
  }
  overall: {
    ready: boolean
    message: string
  }
}

/**
 * Check if Ollama is installed (by trying to detect it)
 * For Electron apps, we can't directly check if it's installed,
 * but we can check if it's running
 */
export async function detectOllamaRunning(url: string = "http://localhost:11434"): Promise<boolean> {
  try {
    const response = await fetch(`${url}/api/tags`, {
      method: "GET",
      signal: AbortSignal.timeout(2000), // 2 second timeout
    })
    return response.ok
  } catch (error) {
    return false
  }
}

/**
 * Test if Ollama is accessible at a given URL
 */
export async function testOllamaConnection(url: string): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${url}/api/tags`, {
      method: "GET",
      signal: AbortSignal.timeout(3000), // 3 second timeout
    })
    
    if (!response.ok) {
      return { success: false, error: `Ollama returned ${response.status}` }
    }
    
    return { success: true }
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === "TimeoutError" || error.message.includes("timeout")) {
        return { success: false, error: "Connection timeout - Ollama may not be running" }
      }
      if (error.message.includes("Failed to fetch") || error.message.includes("network")) {
        return { success: false, error: "Cannot reach Ollama - make sure it's running" }
      }
      return { success: false, error: error.message }
    }
    return { success: false, error: "Unknown error connecting to Ollama" }
  }
}

/**
 * Get comprehensive setup status
 */
export async function getSetupStatus(): Promise<SetupStatus> {
  const supabaseConfigured = isSupabaseConfigured()
  
  // Check Ollama
  const ollamaUrl = "http://localhost:11434"
  const ollamaRunning = await detectOllamaRunning(ollamaUrl)
  
  // Check Gemini API key from settings
  // We need to import settings store dynamically to avoid circular dependencies
  let geminiConfigured = false
  try {
    // Check if geminiApiKey exists in localStorage via settings
    const settingsStr = localStorage.getItem("user_settings_v1")
    if (settingsStr) {
      const parsed = JSON.parse(settingsStr)
      const state = parsed.state ? JSON.parse(parsed.state) : parsed
      geminiConfigured = !!(state?.settings?.geminiApiKey || state?.geminiApiKey)
    }
  } catch (error) {
    // Not configured or error parsing
  }
  
  // Determine overall status
  const hasBackend = supabaseConfigured
  const hasAI = ollamaRunning || geminiConfigured
  const ready = hasBackend && hasAI
  
  return {
    supabase: {
      configured: supabaseConfigured,
      message: supabaseConfigured
        ? "✅ Supabase is configured"
        : "⚠️ Supabase needs to be set up (required for sync)",
    },
    ollama: {
      installed: true, // We assume it might be installed if we can check
      running: ollamaRunning,
      message: ollamaRunning
        ? "✅ Ollama is running"
        : "⚠️ Ollama is not running (optional - Gemini can be used instead)",
      url: ollamaUrl,
    },
    gemini: {
      configured: geminiConfigured,
      message: geminiConfigured
        ? "✅ Gemini API key is configured"
        : "⚠️ Gemini API key not set (optional - Ollama can be used instead)",
    },
    overall: {
      ready,
      message: ready
        ? "✅ All services are ready!"
        : "⚠️ Some services need configuration - check the setup guide",
    },
  }
}
