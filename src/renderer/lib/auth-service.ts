import { supabase, isSupabaseConfigured } from "./supabase"
import type { User, Session } from "@supabase/supabase-js"

export interface AuthState {
  user: User | null
  session: Session | null
  loading: boolean
}

/**
 * Auth Service
 * Handles authentication with Supabase
 */
export class AuthService {
  /**
   * Sign up with email and password
   */
  async signUp(email: string, password: string): Promise<{ user: User | null; session: Session | null; error: Error | null }> {
    if (!isSupabaseConfigured()) {
      return {
        user: null,
        session: null,
        error: new Error("Supabase not configured. Please set environment variables."),
      }
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      })

      if (error) {
        // Supabase errors have a message property
        console.error("Sign up error:", error)
        let errorMessage = error.message || "Failed to sign up. Please check your email and password."
        
        // Check if user already exists - provide helpful message
        if (
          error.message?.toLowerCase().includes("user already registered") ||
          error.message?.toLowerCase().includes("already registered") ||
          error.message?.toLowerCase().includes("user already exists") ||
          error.message?.toLowerCase().includes("email address is already registered")
        ) {
          errorMessage = "This email is already registered. Please sign in instead."
        }
        
        return { user: null, session: null, error: new Error(errorMessage) }
      }
      
      // If email confirmation is required, user will exist but session will be null
      // In that case, we still return the user so UI can show appropriate message
      return { 
        user: data.user, 
        session: data.session,
        error: null 
      }
    } catch (error) {
      // Fallback for unexpected errors
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred"
      return { user: null, session: null, error: new Error(errorMessage) }
    }
  }

  /**
   * Sign in with email and password
   */
  async signIn(email: string, password: string): Promise<{ user: User | null; session: Session | null; error: Error | null }> {
    if (!isSupabaseConfigured()) {
      return {
        user: null,
        session: null,
        error: new Error("Supabase not configured. Please set environment variables."),
      }
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        // Supabase errors have a message property
        // Common errors: "Invalid login credentials", "Email not confirmed", etc.
        console.error("Sign in error:", error)
        let errorMessage = error.message || "Failed to sign in. Please check your email and password."
        
        // Make error messages more user-friendly
        if (error.message?.includes("Invalid login credentials") || error.message?.includes("invalid_credentials")) {
          errorMessage = "Invalid email or password. Please try again."
        } else if (error.message?.includes("Email not confirmed") || error.message?.includes("email_not_confirmed")) {
          errorMessage = "Please check your email and confirm your account before signing in."
        }
        
        return { user: null, session: null, error: new Error(errorMessage) }
      }
      
      // After sign in, session should always exist
      if (!data.session) {
        return { 
          user: null, 
          session: null, 
          error: new Error("No session created. Please check your email confirmation status.") 
        }
      }
      
      return { 
        user: data.user, 
        session: data.session,
        error: null 
      }
    } catch (error) {
      // Fallback for unexpected errors
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred"
      return { user: null, session: null, error: new Error(errorMessage) }
    }
  }

  /**
   * Sign in with magic link (passwordless)
   */
  async signInWithMagicLink(email: string): Promise<{ error: Error | null }> {
    if (!isSupabaseConfigured()) {
      return { error: new Error("Supabase not configured.") }
    }

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
      })

      if (error) throw error
      return { error: null }
    } catch (error) {
      return { error: error as Error }
    }
  }

  /**
   * Sign out
   */
  async signOut(): Promise<{ error: Error | null }> {
    if (!isSupabaseConfigured()) {
      return { error: null } // If not configured, just clear local state
    }

    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      return { error: null }
    } catch (error) {
      return { error: error as Error }
    }
  }

  /**
   * Get current session
   */
  async getSession(): Promise<Session | null> {
    if (!isSupabaseConfigured()) {
      return null
    }

    const {
      data: { session },
    } = await supabase.auth.getSession()
    return session
  }

  /**
   * Get current user
   */
  async getUser(): Promise<User | null> {
    if (!isSupabaseConfigured()) {
      return null
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()
    return user
  }

  /**
   * Listen to auth state changes
   */
  onAuthStateChange(callback: (user: User | null, session: Session | null) => void) {
    if (!isSupabaseConfigured()) {
      return { data: { subscription: null }, unsubscribe: () => {} }
    }

    return supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth state changed:", event, session?.user?.email)
      callback(session?.user ?? null, session)
    })
  }

  /**
   * Reset password
   */
  async resetPassword(email: string): Promise<{ error: Error | null }> {
    if (!isSupabaseConfigured()) {
      return { error: new Error("Supabase not configured.") }
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email)
      if (error) throw error
      return { error: null }
    } catch (error) {
      return { error: error as Error }
    }
  }
}

export const authService = new AuthService()

