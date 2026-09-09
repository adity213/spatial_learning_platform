import { useState } from 'react'
import { useSession } from '../state/session'
import { SHAPES, COLOR_ORDER, shapeLabel } from '../core/pieces'
import { TrayItem } from './TrayItem'
import type { PieceTypeId, ShapeId } from '../core/types'

/** Builder-only brick picker. Unlike the participant `Tray`, which only ever
 *  lists the piece types a puzzle's own solution already uses, this lists the
 *  full catalogue — the author needs to reach for a size/colour that isn't in
 *  the puzzle yet. Nested (size, then colour) because 8 shapes x 5 colours
 *  as one flat list of 40 buttons would be unreadable. */
export function BuilderTray() {
  const remaining = useSession((state) => state.remaining)
  const monochrome = useSession((state) => !!state.derived.puzzle.monochrome)
  const selectedType = useSession((state) => state.selectedType)
  const selectType = useSession((state) => state.selectType)

  const shapes = Object.keys(SHAPES) as ShapeId[]
  const selectedShape = selectedType ? (selectedType.split('-')[0] as ShapeId) : null
  const [openShape, setOpenShape] = useState<ShapeId | null>(selectedShape)
  const activeShape = openShape ?? selectedShape

  const handleSelectColor = (typeId: PieceTypeId) => {
    selectType(selectedType === typeId ? null : typeId)
  }

  return (
    <div className="tray-container builder-tray" role="region" aria-label="Brick catalogue">
      <div className="tray-size-grid" role="group" aria-label="Brick size">
        {shapes.map((shape) => (
          <button
            key={shape}
            type="button"
            className={`tray-size-button ${activeShape === shape ? 'active' : ''}`}
            onClick={() => setOpenShape(openShape === shape ? null : shape)}
          >
            {shapeLabel(shape)}
          </button>
        ))}
      </div>

      {activeShape && (
        <div className="tray-list">
          {COLOR_ORDER.map((color) => {
            const typeId = `${activeShape}-${color}` as PieceTypeId
            return (
              <TrayItem
                key={typeId}
                typeId={typeId}
                remaining={remaining[typeId] ?? 0}
                isSelected={selectedType === typeId}
                onSelect={handleSelectColor}
                monochrome={monochrome}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
