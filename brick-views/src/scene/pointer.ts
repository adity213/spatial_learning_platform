import * as THREE from 'three'
import { cellsFor } from '../core/geometry'
import type { Placement, Vec3 } from '../core/types'

export interface PlateHit {
  type: 'plate'
  cell: Vec3
}

export interface BrickHit {
  type: 'brick'
  cell: Vec3
  placement: Placement
}

export type RaycastCandidate = PlateHit | BrickHit | null

const raycaster = new THREE.Raycaster()
const ndc = new THREE.Vector2()

// Height already stacked in this column, so a build-mode hover lands on top
// of what's there instead of always reading y=0 (which would falsely look
// unsupported for a column that already has bricks in it).
function stackHeightAt(placed: Placement[], x: number, z: number): number {
  let height = 0
  for (const placement of placed) {
    for (const cell of cellsFor(placement.typeId, placement.rotation, placement.origin)) {
      if (cell.x === x && cell.z === z && cell.y + 1 > height) height = cell.y + 1
    }
  }
  return height
}

/**
 * Perform raycast against plate mesh and placed bricks.
 * Returns candidate cell for build or targeted brick for erase.
 */
export function getRaycastCandidate(
  clientX: number,
  clientY: number,
  canvasRect: DOMRect,
  camera: THREE.Camera,
  plateMesh: THREE.Object3D | null,
  placedGroup: THREE.Object3D | null,
  mode: 'build' | 'erase',
  placed: Placement[] = []
): RaycastCandidate {
  if (!plateMesh && !placedGroup) return null

  // Convert mouse screen coordinates to Normalized Device Coordinates [-1, 1]
  ndc.x = ((clientX - canvasRect.left) / canvasRect.width) * 2 - 1
  ndc.y = -((clientY - canvasRect.top) / canvasRect.height) * 2 + 1

  raycaster.setFromCamera(ndc, camera)

  // In build mode, we must intersect both the plate and placed bricks so the user
  // can point at the top of a placed brick to stack on it.
  if (mode === 'build') {
    const targets: THREE.Object3D[] = []
    if (plateMesh) targets.push(plateMesh)
    if (placedGroup) targets.push(placedGroup)

    const hits = raycaster.intersectObjects(targets, true)
    if (!hits.length || !hits[0]) return null

    // For placing, we find the (x,z) column that the ray hit, and stack on top of it.
    // If the ray hit a vertical side face, point.x or point.z will be on a .5 boundary.
    // In JS, Math.round(0.5) = 1, which correctly pushes the hit into the empty cell in front.
    const x = Math.round(hits[0].point.x)
    const z = Math.round(hits[0].point.z)
    
    return {
      type: 'plate',
      cell: { x, y: stackHeightAt(placed, x, z), z },
    }
  }

  // Erase mode: identify whichever visible brick (or plate) the pointer hit.
  const targets: THREE.Object3D[] = []
  if (plateMesh) targets.push(plateMesh)
  if (placedGroup) targets.push(placedGroup)

  const hits = raycaster.intersectObjects(targets, true)
  if (!hits.length || !hits[0]) return null

  const hit = hits[0]

  if (hit.object === plateMesh || hit.object.name === 'plate') {
    return null // Baseplate cannot be erased
  }

  // Hit on placed brick: find brick group with userData.placement
  let cur: THREE.Object3D | null = hit.object
  let placement: Placement | null = null
  while (cur && cur !== placedGroup) {
    if (cur.userData?.placement) {
      placement = cur.userData.placement as Placement
      break
    }
    cur = cur.parent
  }

  if (!placement) return null

  const cell: Vec3 = {
    x: Math.round(hit.point.x),
    y: Math.floor(hit.point.y),
    z: Math.round(hit.point.z),
  }
  return {
    type: 'brick',
    cell,
    placement,
  }
}
