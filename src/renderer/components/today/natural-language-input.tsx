/**
 * Natural Language Input Component
 * Allows users to quickly add schedule blocks using natural language
 * Examples: "Workout at 6am", "Meeting from 2pm to 3pm", "Deep work 9-12"
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { parseNaturalLanguage, getSuggestions, validateParsedItem, type ParseResult } from '../../lib/natural-language-parser'

interface NaturalLanguageInputProps {
  onAdd: (item: { identity: string; start: string; end: string }) => void
  onCancel?: () => void
  placeholder?: string
  autoFocus?: boolean
}

export function NaturalLanguageInput({
  onAdd,
  onCancel,
  placeholder = 'Type naturally... "Workout at 6am" or "Meeting 2-3pm"',
  autoFocus = true,
}: NaturalLanguageInputProps) {
  const [input, setInput] = useState('')
  const [parseResult, setParseResult] = useState<ParseResult | null>(null)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const [showPreview, setShowPreview] = useState(false)

  // Auto focus on mount
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus()
    }
  }, [autoFocus])

  // Parse input as user types (debounced)
  useEffect(() => {
    if (!input.trim()) {
      setParseResult(null)
      setSuggestions([])
      setShowPreview(false)
      return
    }

    const timer = setTimeout(() => {
      const result = parseNaturalLanguage(input)
      setParseResult(result)
      
      if (!result.success) {
        setSuggestions(result.suggestions || getSuggestions(input))
      } else {
        setSuggestions([])
        setShowPreview(true)
      }
    }, 150)

    return () => clearTimeout(timer)
  }, [input])

  const handleSubmit = useCallback(() => {
    if (!parseResult?.success || !parseResult.item) return

    const validation = validateParsedItem(parseResult.item)
    if (!validation.valid) {
      // Could show validation errors
      return
    }

    onAdd({
      identity: parseResult.item.identity,
      start: parseResult.item.start,
      end: parseResult.item.end,
    })
    
    setInput('')
    setParseResult(null)
    setShowPreview(false)
  }, [parseResult, onAdd])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      
      if (selectedSuggestionIndex >= 0 && suggestions[selectedSuggestionIndex]) {
        setInput(suggestions[selectedSuggestionIndex])
        setSelectedSuggestionIndex(-1)
      } else if (parseResult?.success) {
        handleSubmit()
      }
    } else if (e.key === 'Escape') {
      if (onCancel) {
        onCancel()
      } else {
        setInput('')
        setParseResult(null)
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (suggestions.length > 0) {
        setSelectedSuggestionIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        )
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (suggestions.length > 0) {
        setSelectedSuggestionIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        )
      }
    } else if (e.key === 'Tab' && suggestions.length > 0) {
      e.preventDefault()
      const index = selectedSuggestionIndex >= 0 ? selectedSuggestionIndex : 0
      if (suggestions[index]) {
        setInput(suggestions[index])
        setSelectedSuggestionIndex(-1)
      }
    }
  }, [parseResult, handleSubmit, onCancel, suggestions, selectedSuggestionIndex])

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion)
    setSelectedSuggestionIndex(-1)
    inputRef.current?.focus()
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

  const confidenceColor = parseResult?.item?.confidence 
    ? parseResult.item.confidence > 0.8 
      ? 'text-primary' 
      : parseResult.item.confidence > 0.6 
        ? 'text-yellow-500' 
        : 'text-muted-foreground'
    : ''

  return (
    <div className="space-y-2">
      {/* Input field */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full px-4 py-3 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
        />
        
        {/* Quick add button */}
        {parseResult?.success && (
          <button
            onClick={handleSubmit}
            className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Add
          </button>
        )}
      </div>

      {/* Preview of parsed result */}
      {showPreview && parseResult?.success && parseResult.item && (
        <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-medium text-foreground">
              {parseResult.item.identity}
            </span>
            <span className={`text-sm ${confidenceColor}`}>
              {formatTimeRange(parseResult.item.start, parseResult.item.end)}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Press <kbd className="px-1.5 py-0.5 bg-secondary rounded text-[10px]">Enter</kbd> to add
            </span>
            {parseResult.item.confidence < 0.9 && (
              <span className="text-yellow-500">
                Time might need adjustment
              </span>
            )}
          </div>
        </div>
      )}

      {/* Error message */}
      {parseResult && !parseResult.success && parseResult.error && (
        <div className="text-sm text-muted-foreground">
          {parseResult.error}
        </div>
      )}

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Suggestions:</p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleSuggestionClick(suggestion)}
                className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${
                  index === selectedSuggestionIndex
                    ? 'bg-primary/20 border-primary/50 text-foreground'
                    : 'bg-secondary/50 border-border text-muted-foreground hover:bg-secondary hover:text-foreground'
                }`}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Help text */}
      {!input && (
        <div className="text-xs text-muted-foreground space-y-1">
          <p>Examples:</p>
          <ul className="list-none space-y-0.5 pl-2">
            <li>"Workout at 6am"</li>
            <li>"Meeting from 2pm to 3pm"</li>
            <li>"Deep work 9-12"</li>
            <li>"Call for 30 minutes at 3pm"</li>
          </ul>
        </div>
      )}

      {/* Cancel button */}
      {onCancel && (
        <button
          onClick={onCancel}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Cancel
        </button>
      )}
    </div>
  )
}

