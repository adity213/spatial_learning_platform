import fs from 'node:fs'
import path from 'node:path'
import { PIECES } from '../src/core/pieces'
import { canPlace } from '../src/core/placement'
import { derivePuzzle } from '../src/core/puzzle'
import type { Placement, PieceTypeId, Rotation, Puzzle } from '../src/core/types'

const SHAPES: PieceTypeId[] = [
  '1x1-blue', '1x1-red', '1x1-yellow', '1x1-green', '1x1-white',
  '1x2-blue', '1x2-red', '1x2-yellow', '1x2-green', '1x2-white',
  '1x3-blue', '1x3-red', '1x3-yellow', '1x3-green', '1x3-white',
  '1x4-blue', '1x4-red', '1x4-yellow', '1x4-green', '1x4-white',
  '2x2-blue', '2x2-red', '2x2-yellow', '2x2-green', '2x2-white',
  '2x3-blue', '2x3-red', '2x3-yellow', '2x3-green', '2x3-white',
  '2x4-blue', '2x4-red', '2x4-yellow', '2x4-green', '2x4-white',
  '2x6-blue', '2x6-red', '2x6-yellow', '2x6-green', '2x6-white',
]

const ROTATIONS: Rotation[] = [0, 90, 180, 270]

const TRAY_LIMIT = 20

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min)) + min
}

function randElement<T>(arr: T[]): T {
  return arr[randInt(0, arr.length)]
}

function tryGeneratePuzzle(id: string, name: string, hint: string, targetBricks: number, isMonochrome: boolean): Puzzle | null {
  const board = { width: 8, depth: 8, height: 6 }
  const solution: Placement[] = []
  
  let attempts = 0
  while (solution.length < targetBricks && attempts < 100) {
    attempts++
    
    const typeId = randElement(SHAPES)
    const rotation = randElement(ROTATIONS)
    
    // Choose x, z — the y level is found by the search below
    const x = randInt(0, board.width)
    const z = randInt(0, board.depth)
    for (let h = board.height - 1; h >= 0; h--) {
      const origin = { x, y: h, z }
      const tray = { [typeId]: TRAY_LIMIT } 
      const res = canPlace(solution, board, tray as any, typeId, rotation, origin)
      if (res.ok) {
        solution.push({
          instanceId: `b${solution.length}`,
          typeId,
          rotation,
          origin
        })
        break
      }
    }
  }
  
  if (solution.length < targetBricks) {
    return null
  }
  
  const puzzle: Puzzle = { id, name, hint, board, solution }
  if (isMonochrome) {
    puzzle.monochrome = true
  }
  
  try {
    derivePuzzle(puzzle)
    if (!isMonochrome) {
      const colors = new Set(solution.map(p => PIECES[p.typeId].color))
      if (colors.size === 2 && colors.has('red') && colors.has('green')) {
        return null
      }
    }
    return puzzle
  } catch {
    return null
  }
}

async function main() {
  const configs = [
    { id: 'easy-02', name: 'Easy 2', hint: 'Count your bricks.', bricks: 6, mono: false },
    { id: 'easy-03', name: 'Easy 3', hint: 'Look at the colours.', bricks: 7, mono: false },
    { id: 'easy-04', name: 'Easy 4', hint: 'Check the top view.', bricks: 8, mono: false },
    { id: 'medium-02', name: 'Medium 2', hint: 'Watch for hidden gaps.', bricks: 10, mono: false },
    { id: 'medium-03', name: 'Medium 3', hint: 'Some bricks hide behind others.', bricks: 11, mono: false },
    { id: 'medium-04', name: 'Medium 4', hint: 'Check every view carefully.', bricks: 12, mono: false },
    { id: 'hard-02', name: 'Hard 2', hint: 'Use the shape to guess.', bricks: 11, mono: true },
    { id: 'hard-03', name: 'Hard 3', hint: 'A grey maze.', bricks: 12, mono: true },
    { id: 'hard-04', name: 'Hard 4', hint: 'Trust your deduction.', bricks: 13, mono: true },
  ]
  
  for (let i = 0; i < configs.length; i++) {
    const conf = configs[i]
    let puzzle: Puzzle | null = null
    let tries = 0
    while (!puzzle && tries < 500) {
      tries++
      puzzle = tryGeneratePuzzle(conf.id, conf.name, conf.hint, conf.bricks, conf.mono)
    }
    
    if (puzzle) {
      const idx = 13 + i
      const filename = `${idx}-${conf.id}.json`
      fs.writeFileSync(path.join(process.cwd(), 'src/data/puzzles', filename), JSON.stringify(puzzle, null, 2))
      console.log(`Generated ${filename}`)
    } else {
      console.log(`Failed to generate ${conf.id}`)
    }
  }
}

main()
