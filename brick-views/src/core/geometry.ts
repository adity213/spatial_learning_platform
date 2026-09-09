import { PIECES } from "./pieces.js";
import type { Placement, PieceTypeId, Rotation, Vec3 } from "./types";

export function footprintFor(typeId: PieceTypeId, rotation: Rotation): { w: number; d: number } {
  const piece = PIECES[typeId];
  return rotation === 90 || rotation === 270
    ? { w: piece.depth, d: piece.width }
    : { w: piece.width, d: piece.depth };
}

/**
 * Min-corner origin for a piece centered around a fixed board point (the hovered cell).
 * It calculates the origin such that the piece is as centered as possible on the pivot, 
 * snapping to integer cells for even-dimension footprints. 
 * This is significantly more intuitive for players than sweeping quadrants.
 */
export function originForPivot(typeId: PieceTypeId, rotation: Rotation, pivot: Vec3): Vec3 {
  const { w, d } = footprintFor(typeId, rotation);
  const ox = pivot.x - Math.floor((w - 1) / 2);
  const oz = pivot.z - Math.floor((d - 1) / 2);
  return { x: ox, y: pivot.y, z: oz };
}

export function cellsFor(typeId: PieceTypeId, rotation: Rotation, origin: Vec3): Vec3[] {
  const { w, d } = footprintFor(typeId, rotation);
  const cells: Vec3[] = [];
  for (let dx = 0; dx < w; dx++) {
    for (let dz = 0; dz < d; dz++) {
      cells.push({ x: origin.x + dx, y: origin.y, z: origin.z + dz });
    }
  }
  return cells;
}

export function brickAtCell(placed: Placement[], cell: Vec3): Placement | null {
  for (const placement of placed) {
    const cells = cellsFor(placement.typeId, placement.rotation, placement.origin);
    for (const c of cells) {
      if (c.x === cell.x && c.y === cell.y && c.z === cell.z) return placement;
    }
  }
  return null;
}

export function cellKey(cell: Vec3): string {
  return `${cell.x},${cell.y},${cell.z}`;
}

export function parseCellKey(key: string): Vec3 {
  const [x, y, z] = key.split(",").map(Number);
  return { x: x ?? 0, y: y ?? 0, z: z ?? 0 };
}

export function minCorner(cells: Vec3[]): Vec3 {
  if (cells.length === 0) return { x: 0, y: 0, z: 0 };
  return {
    x: Math.min(...cells.map((c) => c.x)),
    y: Math.min(...cells.map((c) => c.y)),
    z: Math.min(...cells.map((c) => c.z)),
  };
}

export function setsEqual<T>(a: Set<T>, b: Set<T>): boolean {
  if (a.size !== b.size) return false;
  for (const v of a) if (!b.has(v)) return false;
  return true;
}
