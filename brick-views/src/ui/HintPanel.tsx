import { useState } from 'react'
import { useSession } from '../state/session'
import type { CheckOutcome, DiagnosisCode, ViewName } from '../core/types'

const STATIC_MESSAGES: Record<DiagnosisCode, string> = {
  'brick-count-low': 'Not enough bricks.',
  'brick-count-high': 'Too many bricks.',
  'footprint-wrong': 'The top shape is wrong.',
  'height-wrong': 'The height is wrong.',
  'shape-right-colour-wrong': 'The shape is right. The colours aren\'t.',
  'colour-swap': 'Right colours, wrong places.',
  'hidden-brick': 'A brick is hiding inside.',
  'region-mismatch': 'Look at the highlighted region.',
}

const CHECK_MESSAGES: Record<CheckOutcome, string> = {
  empty: 'Place some bricks first.',
  'views-mismatch': 'The views don\'t match yet.',
  'hidden-brick': 'The views match, but a brick is missing inside.',
  solved: 'That\'s the shape.',
}

export function HintPanel() {
  const attempts = useSession((state) => state.attempts)
  const lastCheck = useSession((state) => state.lastCheck)
  const derived = useSession((state) => state.derived)
  const currentSessionId = useSession((state) => state.currentSessionId)
  
  const [loadingHelp, setLoadingHelp] = useState(false)
  const [aiHint, setAiHint] = useState<string | null>(null)

  if (!lastCheck) {
    return <span className="feedback-message">Match all three views.</span>
  }

  const { outcome, diagnoses } = lastCheck

  if (outcome === 'empty' || outcome === 'solved') {
    return <span className={`feedback-message ${outcome}`}>{CHECK_MESSAGES[outcome]}</span>
  }

  // Fallback if no diagnoses were produced
  if (diagnoses.length === 0) {
    return <span className="feedback-message views-mismatch">{CHECK_MESSAGES[outcome]}</span>
  }

  // Rung 1: Attempt 1 -> Match/Miss on cards (handled in ViewCard), basic message
  let message = CHECK_MESSAGES[outcome]

  // Rung 2: Attempt 2 -> Dimension of error (first diagnosis)
  if (attempts >= 2) {
    message = diagnoses[0] ? (STATIC_MESSAGES[diagnoses[0].code] ?? message) : message
  }

  // Rung 3: Attempt 3 -> Region highlight (ViewCard handles overlay)
  if (attempts === 3) {
    const regionDiag = diagnoses.find(d => d.code === 'region-mismatch')
    if (regionDiag) {
      message = `Look at the highlighted region in the ${regionDiag.view} view.`
    }
  }

  // Rung 4/5: AI hint overrides message if fetched
  const displayMessage = aiHint ?? message

  const handleGetHelp = async () => {
    setLoadingHelp(true)
    try {
      const viewsFailing = (Object.keys(lastCheck.views) as ViewName[]).filter(
        (v) => !lastCheck.views[v]
      )
      
      const payload = {
        puzzleHint: derived.puzzle.hint,
        outcome,
        viewsFailing,
        diagnoses,
        attempt: attempts,
        sessionId: currentSessionId,
        attemptNumber: attempts,
      }

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 2000)

      const res = await fetch('/api/hint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      })
      clearTimeout(timeoutId)

      if (!res.ok) throw new Error('API failed')
      const data = await res.json()
      
      if (data.sentence) {
        setAiHint(data.sentence)
      }
    } catch {
      // Fallback silently to static string on timeout or error
    } finally {
      setLoadingHelp(false)
    }
  }

  return (
    <div className="hint-panel">
      <span className="feedback-message views-mismatch" aria-live="polite">
        {displayMessage}
      </span>
      
      {attempts >= 4 && !aiHint && (
        <button
          type="button"
          className="hint-button get-help"
          onClick={handleGetHelp}
          disabled={loadingHelp}
        >
          {loadingHelp ? 'Thinking...' : 'Get help'}
        </button>
      )}

      {attempts >= 5 && (
        <button
          type="button"
          className="hint-button show-me"
          onClick={() => useSession.getState().setShowMismatch()}
        >
          Show me
        </button>
      )}
    </div>
  )
}
