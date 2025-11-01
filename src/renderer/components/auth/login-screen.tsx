import { useState } from "react"
import { useAuthStore } from "../../lib/auth-store"
import { useToastStore } from "../toasts"

export function LoginScreen() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const { signIn, signUp } = useAuthStore()
  const { addToast } = useToastStore()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      addToast("Please enter email and password", "error")
      return
    }

    setLoading(true)
    try {
      const { error } = isSignUp ? await signUp(email, password) : await signIn(email, password)
      if (error) {
        // Check if it's an email confirmation error
        if (error.message.includes("check your email")) {
          addToast(error.message, "info")
        } 
        // Check if user already exists - suggest signing in
        else if (error.message.includes("already registered")) {
          addToast(error.message, "info")
          // Auto-switch to sign in mode after a short delay
          setTimeout(() => {
            setIsSignUp(false)
          }, 2000)
        } 
        else {
          addToast(error.message, "error")
        }
      } else {
        // Success - user should be redirected automatically by App.tsx
        // No need to show toast as app will navigate
      }
    } catch (error) {
      addToast(error instanceof Error ? error.message : "An error occurred", "error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md bg-card border border-border rounded-lg p-6 space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">Stoic Mirror</h1>
          <p className="text-sm text-muted-foreground">
            {isSignUp ? "Create your account" : "Sign in to continue"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              placeholder="you@example.com"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-foreground mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              placeholder="••••••••"
              required
              disabled={loading}
              minLength={6}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-primary"
          >
            {loading ? "Loading..." : isSignUp ? "Sign Up" : "Sign In"}
          </button>
        </form>

        <div className="text-center">
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {isSignUp ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
          </button>
        </div>

        <div className="text-xs text-center text-muted-foreground pt-4 border-t border-border">
          <p>
            Your data is stored locally first and synced to the cloud.
            <br />
            You can use the app offline.
          </p>
        </div>
      </div>
    </div>
  )
}

