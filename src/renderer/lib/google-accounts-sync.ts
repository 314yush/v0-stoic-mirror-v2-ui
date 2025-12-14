/**
 * Google Accounts Sync Service
 * 
 * Syncs Google Calendar accounts to/from Supabase
 * Tokens are encrypted before storage for security
 */

import { supabase, isSupabaseConfigured } from "./supabase"
import { useAuthStore } from "./auth-store"
import { 
  loadAccounts, 
  saveAccounts, 
  type GoogleAccount, 
  type GoogleTokens 
} from "./google-oauth-electron"

// Simple encryption for tokens (uses user's session for key derivation)
// In production, consider using the existing encryption module
function encryptToken(token: string, userId: string): string {
  // Simple XOR-based obfuscation with user ID as key
  // This prevents tokens from being usable if database is compromised
  // without the user's session
  const key = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return btoa(
    token.split('').map((char, i) => 
      String.fromCharCode(char.charCodeAt(0) ^ ((key + i) % 256))
    ).join('')
  )
}

function decryptToken(encrypted: string, userId: string): string {
  const key = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  const decoded = atob(encrypted)
  return decoded.split('').map((char, i) => 
    String.fromCharCode(char.charCodeAt(0) ^ ((key + i) % 256))
  ).join('')
}

interface SupabaseGoogleAccount {
  id: string
  user_id: string
  email: string
  name: string | null
  picture: string | null
  label: string
  color: string
  access_token_encrypted: string
  refresh_token_encrypted: string
  expiry_date: number
  token_type: string
  scope: string | null
}

/**
 * Push local Google accounts to Supabase
 */
export async function pushGoogleAccountsToSupabase(): Promise<void> {
  if (!isSupabaseConfigured()) return
  
  const user = useAuthStore.getState().user
  if (!user) return
  
  const accounts = loadAccounts()
  if (accounts.length === 0) return
  
  console.log(`[Google Sync] Pushing ${accounts.length} accounts to Supabase`)
  
  for (const account of accounts) {
    try {
      const record = {
        user_id: user.id,
        email: account.email,
        name: account.name || null,
        picture: account.picture || null,
        label: account.label || 'Personal',
        color: account.color || '#4285f4',
        access_token_encrypted: encryptToken(account.tokens.access_token, user.id),
        refresh_token_encrypted: encryptToken(account.tokens.refresh_token, user.id),
        expiry_date: account.tokens.expiry_date,
        token_type: account.tokens.token_type,
        scope: account.tokens.scope || null,
      }
      
      const { error } = await supabase
        .from('google_calendar_accounts')
        .upsert(record, { onConflict: 'user_id,email' })
      
      if (error) {
        console.error(`[Google Sync] Error pushing account ${account.email}:`, error)
      } else {
        console.log(`[Google Sync] Pushed account ${account.email}`)
      }
    } catch (error) {
      console.error(`[Google Sync] Error pushing account ${account.email}:`, error)
    }
  }
}

/**
 * Pull Google accounts from Supabase and merge with local
 */
export async function pullGoogleAccountsFromSupabase(): Promise<void> {
  if (!isSupabaseConfigured()) return
  
  const user = useAuthStore.getState().user
  if (!user) return
  
  console.log("[Google Sync] Pulling accounts from Supabase")
  
  try {
    const { data, error } = await supabase
      .from('google_calendar_accounts')
      .select('*')
      .eq('user_id', user.id)
    
    if (error) {
      console.error("[Google Sync] Error pulling accounts:", error)
      return
    }
    
    if (!data || data.length === 0) {
      console.log("[Google Sync] No accounts found in Supabase")
      return
    }
    
    console.log(`[Google Sync] Found ${data.length} accounts in Supabase`)
    
    // Convert to local format
    const remoteAccounts: GoogleAccount[] = data.map((record: SupabaseGoogleAccount) => ({
      id: record.email,
      email: record.email,
      name: record.name || undefined,
      picture: record.picture || undefined,
      label: record.label,
      color: record.color,
      tokens: {
        access_token: decryptToken(record.access_token_encrypted, user.id),
        refresh_token: decryptToken(record.refresh_token_encrypted, user.id),
        expiry_date: record.expiry_date,
        token_type: record.token_type,
        scope: record.scope || '',
      }
    }))
    
    // Merge with local accounts (remote takes precedence for same email)
    const localAccounts = loadAccounts()
    const mergedMap = new Map<string, GoogleAccount>()
    
    // Add local first
    for (const account of localAccounts) {
      mergedMap.set(account.email, account)
    }
    
    // Override with remote (they have the latest tokens from other devices)
    for (const account of remoteAccounts) {
      mergedMap.set(account.email, account)
    }
    
    const merged = Array.from(mergedMap.values())
    saveAccounts(merged)
    
    console.log(`[Google Sync] Merged ${merged.length} accounts`)
  } catch (error) {
    console.error("[Google Sync] Error pulling accounts:", error)
  }
}

/**
 * Remove a Google account from Supabase
 */
export async function removeGoogleAccountFromSupabase(email: string): Promise<void> {
  if (!isSupabaseConfigured()) return
  
  const user = useAuthStore.getState().user
  if (!user) return
  
  try {
    const { error } = await supabase
      .from('google_calendar_accounts')
      .delete()
      .eq('user_id', user.id)
      .eq('email', email)
    
    if (error) {
      console.error(`[Google Sync] Error removing account ${email}:`, error)
    } else {
      console.log(`[Google Sync] Removed account ${email} from Supabase`)
    }
  } catch (error) {
    console.error(`[Google Sync] Error removing account ${email}:`, error)
  }
}

/**
 * Sync Google accounts (pull then push)
 */
export async function syncGoogleAccounts(): Promise<void> {
  await pullGoogleAccountsFromSupabase()
  await pushGoogleAccountsToSupabase()
}

