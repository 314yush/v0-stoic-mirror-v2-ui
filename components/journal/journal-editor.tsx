"use client"

interface JournalEditorProps {
  value: string
  onChange: (value: string) => void
}

export function JournalEditor({ value, onChange }: JournalEditorProps) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="What's on your mind?"
      className="w-full h-48 px-4 py-3 bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
    />
  )
}
