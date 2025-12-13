import React from "react"

interface AppIconProps {
  className?: string
  size?: number
}

/**
 * Stoic Mirror App Icon
 * Inspired by classical philosopher bust with mirror/reflection theme
 * Minimalist representation of Marcus Aurelius or classical philosopher
 */
export function AppIcon({ className = "", size = 24 }: AppIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
    >
      {/* Classical bust silhouette */}
      <path
        d="M12 3c-2 0-3.5 1.5-3.5 3.5 0 1 .5 1.8 1.2 2.3-.5 1-1.2 2.2-1.2 3.7 0 2.5 2 4.5 4.5 4.5s4.5-2 4.5-4.5c0-1.5-.7-2.7-1.2-3.7.7-.5 1.2-1.3 1.2-2.3C15.5 4.5 14 3 12 3z"
        fill="currentColor"
        opacity="0.9"
      />
      {/* Mirror/reflection effect (subtle) */}
      <ellipse
        cx="12"
        cy="16"
        rx="4"
        ry="2"
        fill="currentColor"
        opacity="0.3"
      />
    </svg>
  )
}
