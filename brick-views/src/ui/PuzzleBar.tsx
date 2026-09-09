import { useSession } from '../state/session'
import { Countdown } from './Countdown'

export function PuzzleBar() {
  const puzzleId = useSession((state) => state.derived.puzzle.id)
  const puzzleName = useSession((state) => state.derived.puzzle.name)
  const puzzleIndex = useSession((state) => state.puzzleIndex)
  const puzzleCount = useSession((state) => state.puzzleCount)
  const puzzleList = useSession((state) => state.puzzleList)
  const loadPuzzle = useSession((state) => state.loadPuzzle)
  const prevPuzzle = useSession((state) => state.prevPuzzle)
  const nextPuzzle = useSession((state) => state.nextPuzzle)

  return (
    <div className="puzzle-bar">
      <div className="puzzle-title-group">
        <span className="puzzle-name">{puzzleName}</span>
        <span className="puzzle-counter">
          Puzzle {puzzleIndex + 1} of {puzzleCount}
        </span>
        <Countdown key={puzzleId} />
      </div>

      <div className="puzzle-nav" role="group" aria-label="Change puzzle">
        <select
          className="puzzle-select"
          aria-label="Jump to puzzle"
          value={puzzleId}
          onChange={(e) => loadPuzzle(e.target.value)}
        >
          {puzzleList.map((p, i) => (
            <option key={p.id} value={p.id}>
              {i + 1}. {p.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="puzzle-nav-button"
          onClick={prevPuzzle}
          aria-label="Previous puzzle"
        >
          ‹
        </button>
        <button
          type="button"
          className="puzzle-nav-button"
          onClick={nextPuzzle}
          aria-label="Next puzzle"
        >
          ›
        </button>
      </div>
    </div>
  )
}
