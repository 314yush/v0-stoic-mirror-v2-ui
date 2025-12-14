/**
 * Natural Language Input Component
 * Simple input box for adding schedule blocks using natural language
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { parseNaturalLanguage, validateParsedItem, type ParseResult } from '../../lib/natural-language-parser'

interface NaturalLanguageInputProps {
  onAdd: (item: { identity: string; start: string; end: string }) => void
  onCancel?: () => void
  placeholder?: string
  autoFocus?: boolean
}

export function NaturalLanguageInput({
  onAdd,
  onCancel,
  placeholder = '+ Add block: "Workout at 6am" or drag on timeline',
  autoFocus = false,
}: NaturalLanguageInputProps) {
  const [input, setInput] = useState('')
  const [isExpanded, setIsExpanded] = useState(false)
  const [parseResult, setParseResult] = useState<ParseResult | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Parse input as user types
  useEffect(() => {
    if (!input.trim()) {
      setParseResult(null)
      return
    }

    const timer = setTimeout(() => {
      const result = parseNaturalLanguage(input)
      setParseResult(result)
    }, 150)

    return () => clearTimeout(timer)
  }, [input])

  const handleSubmit = useCallback(() => {
    if (!parseResult?.success || !parseResult.item) return

    const validation = validateParsedItem(parseResult.item)
    if (!validation.valid) return

    onAdd({
      identity: parseResult.item.identity,
      start: parseResult.item.start,
      end: parseResult.item.end,
    })
    
    setInput('')
    setParseResult(null)
    setIsExpanded(false)
  }, [parseResult, onAdd])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && parseResult?.success) {
      e.preventDefault()
      handleSubmit()
    } else if (e.key === 'Escape') {
      setInput('')
      setParseResult(null)
      setIsExpanded(false)
      onCancel?.()
    }
  }, [parseResult, handleSubmit, onCancel])

  const handleFocus = () => {
    setIsExpanded(true)
  }

  const handleBlur = () => {
    // Delay to allow click on Add button
    setTimeout(() => {
      if (!input.trim()) {
        setIsExpanded(false)
      }
    }, 150)
  }

  // Format time for display
  const formatTimeRange = (start: string, end: string) => {
    const formatHour = (time: string) => {
      const [hour, min] = time.split(':').map(Number)
      const suffix = hour >= 12 ? 'pm' : 'am'
      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
      return min === 0 ? `${displayHour}${suffix}` : `${displayHour}:${min.toString().padStart(2, '0')}${suffix}`
    }
    return `${formatHour(start)} - ${formatHour(end)}`
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        className="w-full px-4 py-2.5 bg-secondary/30 border border-border rounded-lg text-foreground text-sm
                   placeholder:text-muted-foreground/60 
                   focus:outline-none focus:bg-background focus:border-primary/50 
                   transition-all"
      />
      
      {/* Parsed preview + Add button - inline */}
      {isExpanded && parseResult?.success && parseResult.item && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
          <span className="text-xs text-muted-foreground hidden sm:block">
            {formatTimeRange(parseResult.item.start, parseResult.item.end)}
          </span>
          <button
            onClick={handleSubmit}
            className="px-3 py-1 bg-primary text-primary-foreground rounded text-xs font-medium 
                       hover:bg-primary/90 transition-colors"
          >
            Add
          </button>
        </div>
      )}
    </div>
  )
}
