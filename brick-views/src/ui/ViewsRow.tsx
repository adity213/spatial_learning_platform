import { useSession } from '../state/session'
import type { ViewName } from '../core/types'
import { ViewCard } from './ViewCard'

const VIEW_ORDER: ViewName[] = ['front', 'right', 'top']

export function ViewsRow() {
  const puzzle = useSession((state) => state.derived.puzzle)
  const lastCheck = useSession((state) => state.lastCheck)
  const attempts = useSession((state) => state.attempts)

  let regionView: ViewName | undefined
  let regionBbox: any

  if (attempts >= 3 && lastCheck) {
    const regionDiag = lastCheck.diagnoses.find((d) => d.code === 'region-mismatch')
    if (regionDiag && regionDiag.view && regionDiag.region) {
      regionView = regionDiag.view
      regionBbox = regionDiag.region
    }
  }

  return (
    <div className="views-container" role="region" aria-label="Orthographic target views">
      {VIEW_ORDER.map((name) => (
        <ViewCard
          key={`${puzzle.id}-${name}`}
          name={name}
          board={puzzle.board}
          solution={puzzle.solution}
          monochrome={puzzle.monochrome}
          isMatch={lastCheck ? lastCheck.views[name] : null}
          region={name === regionView ? regionBbox : undefined}
        />
      ))}
    </div>
  )
}
