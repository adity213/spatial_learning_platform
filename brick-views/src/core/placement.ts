import { cellsFor } from "./geometry.js";
import type { BoardSize, Placement, PieceTypeId, PlaceResult, Rotation, Vec3 } from "./types";

function key(cell: Vec3): string {
  return `${cell.x},${cell.y},${cell.z}`;
}

function occupiedCells(placed: Placement[]): Set<string> {
  const cells = new Set<string>();
  for (const placement of placed) {
    for (const cell of cellsFor(placement.typeId, placement.rotation, placement.origin)) {
      cells.add(key(cell));
    }
  }
  return cells;
}

function inBounds(cell: Vec3, board: BoardSize): boolean {
  return (
    cell.x >= 0 && cell.x < board.width &&
    cell.y >= 0 && cell.y < board.height &&
    cell.z >= 0 && cell.z < board.depth
  );
}

export function canPlace(
  placed: Placement[],
  board: BoardSize,
  tray: Record<PieceTypeId, number>,
  typeId: PieceTypeId,
  rotation: Rotation,
  origin: Vec3,
): PlaceResult {
  if (tray[typeId] <= 0) return { ok: false, reason: "none-left" };

  const cells = cellsFor(typeId, rotation, origin);

  for (const cell of cells) {
    if (!inBounds(cell, board)) return { ok: false, reason: "out-of-bounds" };
  }

  const occupied = occupiedCells(placed);

  for (const cell of cells) {
    if (occupied.has(key(cell))) return { ok: false, reason: "overlap" };
  }

  for (const cell of cells) {
    const supported = cell.y === 0 || occupied.has(key({ x: cell.x, y: cell.y - 1, z: cell.z }));
    if (!supported) return { ok: false, reason: "unsupported" };
  }

  return { ok: true };
}

export function canRemove(placed: Placement[], instanceId: string): PlaceResult {
  const target = placed.find((p) => p.instanceId === instanceId);
  if (!target) return { ok: true };

  const targetCells = cellsFor(target.typeId, target.rotation, target.origin);
  const others = occupiedCells(placed.filter((p) => p.instanceId !== instanceId));

  for (const cell of targetCells) {
    if (others.has(key({ x: cell.x, y: cell.y + 1, z: cell.z }))) {
      return { ok: false, reason: "load-bearing" };
    }
  }

  return { ok: true };
}
