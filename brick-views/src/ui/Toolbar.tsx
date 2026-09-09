import { useSession } from '../state/session'
import { HintPanel } from './HintPanel'

export function Toolbar() {
  const mode = useSession((state) => state.mode)
  const lastCheck = useSession((state) => state.lastCheck)
  const rotateCW = useSession((state) => state.rotateCW)
  const runCheck = useSession((state) => state.runCheck)
  const clearBoard = useSession((state) => state.clearBoard)
  const nextPuzzle = useSession((state) => state.nextPuzzle)

  const isSolved = lastCheck?.outcome === 'solved'

  return (
    <div className="toolbar">
      {/* Left controls: Rotate and Mode segmented buttons */}
      <div className="toolbar-left">
        <button
          type="button"
          className="toolbar-button"
          onClick={rotateCW}
          aria-label="Rotate brick 90 degrees"
        >
          Rotate
        </button>

        <div className="mode-segmented-group" role="radiogroup" aria-label="Tool mode">
          <button
            type="button"
            className={`mode-button ${mode === 'build' ? 'active' : ''}`}
            onClick={() => useSession.setState({ mode: 'build' })}
            role="radio"
            aria-checked={mode === 'build'}
          >
            Build
          </button>
          <button
            type="button"
            className={`mode-button ${mode === 'erase' ? 'active' : ''}`}
            onClick={() => useSession.setState({ mode: 'erase' })}
            role="radio"
            aria-checked={mode === 'erase'}
          >
            Erase
          </button>
        </div>
      </div>

      {/* Center: Hint Panel */}
      <div className="toolbar-center">
        <HintPanel />
      </div>

      {/* Right: Clear board, and Check or Next puzzle */}
      <div className="toolbar-right">
        <button
          type="button"
          className="toolbar-button"
          onClick={clearBoard}
          aria-label="Clear board"
        >
          Clear board
        </button>

        {isSolved ? (
          <button
            type="button"
            className="next-puzzle-button"
            onClick={nextPuzzle}
            aria-label="Next puzzle"
          >
            Next puzzle
          </button>
        ) : (
          <button
            type="button"
            className="check-button"
            onClick={runCheck}
            aria-label="Check solution against views"
          >
            Check
          </button>
        )}
      </div>
    </div>
  )
}
