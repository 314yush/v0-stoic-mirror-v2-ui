/**
 * Hook to sync Google Calendar accounts on login
 */

import { useEffect } from 'react'
import { useAuthStore } from './auth-store'
import { syncGoogleAccounts } from './google-accounts-sync'

/**
 * Sync Google Calendar accounts when user logs in
 * - Pulls accounts from Supabase (in case user connected on another device)
 * - Pushes local accounts to Supabase (in case they were added offline)
 */
export function useGoogleAccountsSync() {
  const user = useAuthStore(state => state.user)
  
  useEffect(() => {
    if (!user) return
    
    console.log('[Google Accounts Sync] User logged in, syncing accounts...')
    
    // Sync Google accounts (pull then push)
    syncGoogleAccounts().then(() => {
      console.log('[Google Accounts Sync] Sync complete')
    }).catch(error => {
      console.error('[Google Accounts Sync] Error syncing:', error)
    })
  }, [user?.id])
}

