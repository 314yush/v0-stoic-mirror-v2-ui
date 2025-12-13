/**
 * Google OAuth Handler for Electron
 * 
 * Handles OAuth flow in Electron by:
 * 1. Opening system browser for authentication
 * 2. Starting local server to catch callback
 * 3. Exchanging code for tokens
 * 
 * Supports multiple Google accounts (personal + work)
 */

// OAuth configuration
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''
const GOOGLE_CLIENT_SECRET = import.meta.env.VITE_GOOGLE_CLIENT_SECRET || ''
const REDIRECT_URI = 'http://127.0.0.1:8085/oauth/callback'
const SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/userinfo.email', // To get user's email
]

export interface GoogleTokens {
  access_token: string
  refresh_token: string
  expiry_date: number
  token_type: string
  scope: string
}

export interface GoogleAccount {
  id: string // email address
  email: string
  name?: string
  picture?: string
  tokens: GoogleTokens
  label?: string // "Personal" or "Work" - user-defined
  color?: string // For visual distinction
}

/**
 * Check if Google Calendar credentials are configured
 */
export function isGoogleCalendarConfigured(): boolean {
  return !!(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET)
}

/**
 * Generate OAuth authorization URL
 */
export function generateAuthUrl(): string {
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: SCOPES.join(' '),
    access_type: 'offline',
    prompt: 'consent', // Force consent to get refresh token
  })

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(code: string): Promise<GoogleTokens> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
      redirect_uri: REDIRECT_URI,
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error_description || 'Failed to exchange code for tokens')
  }

  const tokens = await response.json()
  
  return {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expiry_date: Date.now() + (tokens.expires_in * 1000),
    token_type: tokens.token_type,
    scope: tokens.scope,
  }
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(refreshToken: string): Promise<GoogleTokens> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error_description || 'Failed to refresh token')
  }

  const tokens = await response.json()
  
  return {
    access_token: tokens.access_token,
    refresh_token: refreshToken, // Keep existing refresh token
    expiry_date: Date.now() + (tokens.expires_in * 1000),
    token_type: tokens.token_type,
    scope: tokens.scope,
  }
}

/**
 * Revoke access (disconnect)
 */
export async function revokeAccess(accessToken: string): Promise<void> {
  await fetch(`https://oauth2.googleapis.com/revoke?token=${accessToken}`, {
    method: 'POST',
  })
}

/**
 * Storage keys
 */
const ACCOUNTS_STORAGE_KEY = 'google_calendar_accounts'
const TOKENS_STORAGE_KEY = 'google_calendar_tokens' // Legacy - for migration

/**
 * Get user info from Google
 */
export async function getUserInfo(accessToken: string): Promise<{ email: string; name?: string; picture?: string }> {
  const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    throw new Error('Failed to get user info')
  }

  const data = await response.json()
  return {
    email: data.email,
    name: data.name,
    picture: data.picture,
  }
}

/**
 * Save all accounts to localStorage
 */
export function saveAccounts(accounts: GoogleAccount[]): void {
  localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts))
}

/**
 * Load all accounts from localStorage
 */
export function loadAccounts(): GoogleAccount[] {
  // Try new format first
  const stored = localStorage.getItem(ACCOUNTS_STORAGE_KEY)
  if (stored) {
    try {
      return JSON.parse(stored) as GoogleAccount[]
    } catch {
      return []
    }
  }
  
  // Migration: Check for legacy single-account tokens
  const legacyTokens = localStorage.getItem(TOKENS_STORAGE_KEY)
  if (legacyTokens) {
    try {
      const tokens = JSON.parse(legacyTokens) as GoogleTokens
      // We don't have email for legacy tokens, will be populated on next refresh
      const legacyAccount: GoogleAccount = {
        id: 'legacy',
        email: 'Unknown (reconnect to update)',
        tokens,
        label: 'Primary',
      }
      // Migrate to new format
      saveAccounts([legacyAccount])
      localStorage.removeItem(TOKENS_STORAGE_KEY) // Remove legacy
      return [legacyAccount]
    } catch {
      return []
    }
  }
  
  return []
}

/**
 * Add or update an account
 */
export function saveAccount(account: GoogleAccount): void {
  const accounts = loadAccounts()
  const existingIndex = accounts.findIndex(a => a.email === account.email)
  
  if (existingIndex >= 0) {
    accounts[existingIndex] = account
  } else {
    accounts.push(account)
  }
  
  saveAccounts(accounts)
}

/**
 * Remove an account
 */
export function removeAccount(email: string): void {
  const accounts = loadAccounts().filter(a => a.email !== email)
  saveAccounts(accounts)
}

/**
 * Get account by email
 */
export function getAccount(email: string): GoogleAccount | null {
  return loadAccounts().find(a => a.email === email) || null
}

/**
 * Clear all accounts
 */
export function clearAllAccounts(): void {
  localStorage.removeItem(ACCOUNTS_STORAGE_KEY)
  localStorage.removeItem(TOKENS_STORAGE_KEY) // Also clear legacy
}

// Legacy compatibility functions (work with first account)

/**
 * Save tokens to localStorage (legacy - saves to first account)
 */
export function saveTokens(tokens: GoogleTokens): void {
  const accounts = loadAccounts()
  if (accounts.length > 0) {
    accounts[0].tokens = tokens
    saveAccounts(accounts)
  } else {
    // No accounts yet, save as legacy
    localStorage.setItem(TOKENS_STORAGE_KEY, JSON.stringify(tokens))
  }
}

/**
 * Load tokens from localStorage (legacy - loads from first account)
 */
export function loadTokens(): GoogleTokens | null {
  const accounts = loadAccounts()
  if (accounts.length > 0) {
    return accounts[0].tokens
  }
  return null
}

/**
 * Clear stored tokens (legacy - clears first account only)
 */
export function clearTokens(): void {
  const accounts = loadAccounts()
  if (accounts.length > 0) {
    removeAccount(accounts[0].email)
  }
  localStorage.removeItem(TOKENS_STORAGE_KEY)
}

/**
 * Check if we have any valid accounts
 */
export function hasValidTokens(): boolean {
  const accounts = loadAccounts()
  return accounts.some(account => 
    account.tokens.expiry_date > Date.now() + (5 * 60 * 1000) ||
    account.tokens.refresh_token // Can refresh
  )
}

/**
 * Get valid access token for a specific account (refreshing if needed)
 */
export async function getValidAccessTokenForAccount(email: string): Promise<string | null> {
  const account = getAccount(email)
  if (!account) return null
  
  const tokens = account.tokens
  
  // If token is still valid, return it
  if (tokens.expiry_date > Date.now() + (5 * 60 * 1000)) {
    return tokens.access_token
  }
  
  // Try to refresh
  if (tokens.refresh_token) {
    try {
      const newTokens = await refreshAccessToken(tokens.refresh_token)
      account.tokens = newTokens
      saveAccount(account)
      return newTokens.access_token
    } catch (error) {
      console.error(`Failed to refresh token for ${email}:`, error)
      removeAccount(email)
      return null
    }
  }
  
  return null
}

/**
 * Get valid access token (legacy - returns first valid account's token)
 */
export async function getValidAccessToken(): Promise<string | null> {
  const accounts = loadAccounts()
  if (accounts.length === 0) return null
  
  // Try each account until one works
  for (const account of accounts) {
    const token = await getValidAccessTokenForAccount(account.email)
    if (token) return token
  }
  
  return null
}

/**
 * Get all valid access tokens (for multi-account calendar fetching)
 */
export async function getAllValidAccessTokens(): Promise<Array<{ email: string; token: string; label?: string; color?: string }>> {
  const accounts = loadAccounts()
  const validTokens: Array<{ email: string; token: string; label?: string; color?: string }> = []
  
  for (const account of accounts) {
    const token = await getValidAccessTokenForAccount(account.email)
    if (token) {
      validTokens.push({ 
        email: account.email, 
        token,
        label: account.label,
        color: account.color
      })
    }
  }
  
  return validTokens
}

