/**
 * URL Validation Utilities
 * Prevents SSRF attacks by validating URLs
 */

/**
 * Validate HTTPS URL (for Supabase, Gemini, etc.)
 */
export function validateHttpsUrl(url: string): { valid: boolean; error?: string } {
  if (!url || url.trim() === '') {
    return { valid: false, error: 'URL cannot be empty' }
  }

  try {
    const urlObj = new URL(url)
    
    // Must be HTTPS
    if (urlObj.protocol !== 'https:') {
      return { valid: false, error: 'Only HTTPS URLs are allowed' }
    }

    return { valid: true }
  } catch (error) {
    return { valid: false, error: 'Invalid URL format' }
  }
}

/**
 * Validate Ollama URL to prevent SSRF attacks
 * Only allows http://localhost:* or http://127.0.0.1:*
 */
export function validateOllamaUrl(url: string): { valid: boolean; error?: string } {
  if (!url || url.trim() === '') {
    return { valid: false, error: 'URL cannot be empty' }
  }

  try {
    const urlObj = new URL(url)
    
    // Only allow http:// (not https://, not file://, etc.)
    if (urlObj.protocol !== 'http:') {
      return { valid: false, error: 'Only http:// URLs are allowed for Ollama' }
    }

    // Only allow localhost or 127.0.0.1
    const hostname = urlObj.hostname.toLowerCase()
    const allowedHosts = ['localhost', '127.0.0.1', '::1']
    
    if (!allowedHosts.includes(hostname)) {
      return { 
        valid: false, 
        error: 'Ollama URL must be localhost or 127.0.0.1 (local only)' 
      }
    }

    // Port must be valid (1-65535)
    const port = urlObj.port ? parseInt(urlObj.port, 10) : 80
    if (isNaN(port) || port < 1 || port > 65535) {
      return { valid: false, error: 'Invalid port number' }
    }

    // No path allowed (security: prevent path traversal)
    if (urlObj.pathname !== '/' && urlObj.pathname !== '') {
      return { valid: false, error: 'URL should not include a path' }
    }

    // No query or hash
    if (urlObj.search || urlObj.hash) {
      return { valid: false, error: 'URL should not include query parameters or hash' }
    }

    return { valid: true }
  } catch (error) {
    return { valid: false, error: 'Invalid URL format' }
  }
}

/**
 * Sanitize and normalize Ollama URL
 * Returns validated URL or default
 */
export function sanitizeOllamaUrl(url: string | undefined): string {
  if (!url || url.trim() === '') {
    return 'http://localhost:11434'
  }

  const validation = validateOllamaUrl(url.trim())
  if (!validation.valid) {
    console.warn(`Invalid Ollama URL: ${validation.error}, using default`)
    return 'http://localhost:11434'
  }

  return url.trim()
}

