import { createClient } from "@supabase/supabase-js"

// Supabase configuration
// These should be set via environment variables
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || ""
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ""

// Debug logging (only in dev)
if (import.meta.env.DEV) {
  console.log("Supabase Config Check:", {
    hasUrl: !!SUPABASE_URL,
    hasKey: !!SUPABASE_ANON_KEY,
    urlLength: SUPABASE_URL.length,
    keyLength: SUPABASE_ANON_KEY.length,
  })
}

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error(
    "❌ Supabase not configured!\n" +
      "Please:\n" +
      "1. Create a .env file in the project root\n" +
      "2. Add:\n" +
      "   VITE_SUPABASE_URL=https://xxxxx.supabase.co\n" +
      "   VITE_SUPABASE_ANON_KEY=eyJhbGc...\n" +
      "3. Restart the dev server (stop and run 'npm run dev' again)"
  )
}

// Create client even if not configured (for graceful degradation)
export const supabase = createClient(
  SUPABASE_URL || "https://placeholder.supabase.co",
  SUPABASE_ANON_KEY || "placeholder-key",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
)

/**
 * Check if Supabase is configured
 */
export function isSupabaseConfigured(): boolean {
  return !!(SUPABASE_URL && SUPABASE_ANON_KEY)
}
