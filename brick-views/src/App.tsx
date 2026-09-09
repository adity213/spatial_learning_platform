import { useState, useEffect } from 'react'
import { useSession } from './state/session'
import { orderedTypeIds } from './core/pieces'
import { PuzzleBar } from './ui/PuzzleBar'
import { Tray } from './ui/Tray'
import { Stage } from './scene/Stage'
import { ViewsRow } from './ui/ViewsRow'
import { Toolbar } from './ui/Toolbar'
import { Feedback } from './ui/Feedback'
import { Login } from './ui/Login'

export default function App() {
  const participantName = useSession((state) => state.participantName)

  const [isSupportedScreen, setIsSupportedScreen] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024
    }
    return true
  })

  useEffect(() => {
    const handleResize = () => {
      setIsSupportedScreen(window.innerWidth >= 1024)
    }
    window.addEventListener('resize', handleResize)

    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return

      const { rotateCW, selectType, runCheck, nextPuzzle, prevPuzzle, mode } = useSession.getState()

      switch (e.key) {
        case 'r':
        case 'R':
          rotateCW()
          break
        case 'e':
        case 'E':
          useSession.setState({ mode: mode === 'build' ? 'erase' : 'build' })
          break
        case 'Enter':
          runCheck()
          break
        case 'ArrowLeft':
          prevPuzzle()
          break
        case 'ArrowRight':
          nextPuzzle()
          break
        default: {
          // 1-9 select the nth tray item in its display order (Tray.tsx's
          // own ordering) — not a fixed brick type, since the tray's
          // contents now vary per puzzle.
          const slot = Number(e.key)
          if (Number.isInteger(slot) && slot >= 1 && slot <= 9) {
            const typeId = orderedTypeIds(useSession.getState().derived.tray)[slot - 1]
            if (typeId) selectType(typeId)
          }
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  if (!isSupportedScreen) {
    return (
      <div className="screen-fallback">
        Open this on a larger screen.
      </div>
    )
  }

  if (!participantName) {
    return <Login />
  }

  return (
    <div className="app-shell">
      <header className="app-header" aria-label="Puzzle header">
        <PuzzleBar />
      </header>

      <main className="app-main">
        <aside className="app-tray-region" aria-label="Brick tray">
          <Tray />
        </aside>
        <section className="app-board-region" aria-label="3D board stage">
          <Stage />
          <Feedback />
        </section>
        <aside className="app-views-region" aria-label="Orthographic views">
          <ViewsRow />
        </aside>
      </main>

      <footer className="app-footer" aria-label="Toolbar">
        <Toolbar />
      </footer>
    </div>
  )
}
