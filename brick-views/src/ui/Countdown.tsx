import { useEffect, useState } from 'react'
import { useSession } from '../state/session'

function format(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

/** Countdown for puzzles a teacher gave a time limit. Renders nothing at all
 *  when the puzzle has no limit, which is the default.
 *
 *  Running out does not end the puzzle or block the board — the child keeps
 *  playing and the attempt still logs. It's a pacing cue for the room, not a
 *  fail state, and taking the board away mid-thought would be its own problem. */
export function Countdown() {
  const limit = useSession((state) => state.derived.puzzle.timeLimitSeconds)
  // Remounted by `key={puzzleId}` in PuzzleBar when the puzzle changes, so the
  // initial value below is always correct and the effect never has to reset it.
  const [remaining, setRemaining] = useState(limit ?? 0)

  useEffect(() => {
    if (!limit) return

    // Derived from a wall-clock start rather than decremented each tick, so a
    // backgrounded tab (where timers are throttled) doesn't drift slow.
    const startedAt = Date.now()

    const tick = setInterval(() => {
      const left = limit - Math.floor((Date.now() - startedAt) / 1000)
      setRemaining(left > 0 ? left : 0)
      if (left <= 0) clearInterval(tick)
    }, 1000)

    return () => clearInterval(tick)
  }, [limit])

  if (!limit) return null

  const isUp = remaining <= 0
  const className = ['countdown', isUp && 'is-up', !isUp && remaining <= 30 && 'is-low']
    .filter(Boolean)
    .join(' ')

  return (
    <div className={className} role="timer" aria-live="off">
      {isUp ? 'Time is up' : format(remaining)}
    </div>
  )
}
