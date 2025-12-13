import React from "react"

interface HourglassIconProps {
  className?: string
  size?: number
}

export function HourglassIcon({ className = "", size = 20 }: HourglassIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M6 2v6l4 4-4 4v6" />
      <path d="M18 2v6l-4 4 4 4v6" />
      <line x1="6" y1="12" x2="18" y2="12" />
    </svg>
  )
}
