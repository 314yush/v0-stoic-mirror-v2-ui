import type { TimeBlock } from "../../lib/schedule-store"

interface ValidationHintsProps {
  blocks: TimeBlock[]
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number)
  return hours * 60 + minutes
}

export function ValidationHints({ blocks }: ValidationHintsProps) {
  const overlaps: string[] = []

  for (let i = 0; i < blocks.length; i++) {
    for (let j = i + 1; j < blocks.length; j++) {
      const block1Start = timeToMinutes(blocks[i].start)
      const block1End = timeToMinutes(blocks[i].end)
      const block2Start = timeToMinutes(blocks[j].start)
      const block2End = timeToMinutes(blocks[j].end)

      if (
        (block1Start < block2End && block1End > block2Start) ||
        (block2Start < block1End && block2End > block1Start)
      ) {
        overlaps.push(`${blocks[i].identity} overlaps with ${blocks[j].identity}`)
      }
    }
  }

  const totalMinutes = blocks.reduce((sum, block) => {
    return sum + (timeToMinutes(block.end) - timeToMinutes(block.start))
  }, 0)

  if (overlaps.length === 0 && totalMinutes === 0) return null

  return (
    <div className="space-y-2">
      {overlaps.length > 0 && (
        <div className="px-3 py-2 bg-destructive/10 border border-destructive/50 rounded-md">
          <p className="text-sm font-medium text-destructive">Overlaps detected:</p>
          <ul className="mt-1 space-y-1">
            {overlaps.map((overlap, i) => (
              <li key={i} className="text-xs text-destructive/80">
                • {overlap}
              </li>
            ))}
          </ul>
        </div>
      )}
      {totalMinutes > 0 && (
        <p className="text-xs text-muted-foreground">
          Total scheduled: {Math.floor(totalMinutes / 60)}h {totalMinutes % 60}m
        </p>
      )}
    </div>
  )
}
