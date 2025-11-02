import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"

interface OnboardingState {
  hasCompletedOnboarding: boolean
  setOnboardingComplete: () => void
}

const zustandStorage = {
  getItem: (name: string): string | null => {
    return localStorage.getItem(name)
  },
  setItem: (name: string, value: string): void => {
    localStorage.setItem(name, value)
  },
  removeItem: (name: string): void => {
    localStorage.removeItem(name)
  },
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      hasCompletedOnboarding: false,
      setOnboardingComplete: () => set({ hasCompletedOnboarding: true }),
    }),
    {
      name: "onboarding_state_v1",
      storage: createJSONStorage(() => zustandStorage),
    }
  )
)
