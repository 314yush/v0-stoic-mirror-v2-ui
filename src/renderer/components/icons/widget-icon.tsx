import React from 'react'

interface WidgetIconProps {
  className?: string
  size?: number
}

/**
 * Optimized Widget Icon
 * Uses the optimized PNG icon generated from icon.ico
 * Automatically selects the best size for the display
 */
export function WidgetIcon({ className = "", size = 20 }: WidgetIconProps) {
  // Select the best icon size based on requested size and device pixel ratio
  const getIconSrc = () => {
    const pixelRatio = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
    const effectiveSize = size * pixelRatio
    
    // Select the closest matching icon size for optimal quality
    if (effectiveSize <= 20) {
      return pixelRatio > 1 ? './assets/widget-icon-40.png' : './assets/widget-icon-20.png'
    } else if (effectiveSize <= 24) {
      return pixelRatio > 1 ? './assets/widget-icon-40.png' : './assets/widget-icon-24.png'
    } else if (effectiveSize <= 32) {
      return './assets/widget-icon-32.png'
    } else {
      return './assets/widget-icon-40.png'
    }
  }

  return (
    <img
      src={getIconSrc()}
      alt="Stoic Mirror"
      width={size}
      height={size}
      className={className}
      style={{
        objectFit: 'contain',
        display: 'inline-block',
        verticalAlign: 'middle',
      }}
    />
  )
}
