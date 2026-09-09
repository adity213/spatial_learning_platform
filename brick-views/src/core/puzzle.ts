import { cellKey, cellsFor } from "./geometry";
import { canPlace } from "./placement";
import { PIECES } from "./pieces";
import { projectCells, projectColors, toGrids, viewKey } from "./projection";
import type { CellSet, ColorId, DerivedPuzzle, PieceTypeId, Placement, Puzzle, Vec3, ViewName } from "./types";

function emptyTray(): Record<PieceTypeId, number> {
  const tray = {} as Record<PieceTypeId, number>;
  for (const id of Object.keys(PIECES) as PieceTypeId[]) tray[id] = 0;
  return tray;
}

function tallyTray(solution: Placement[]): Record<PieceTypeId, number> {
  const tray = emptyTray();
  for (const placement of solution) tray[placement.typeId] += 1;
  return tray;
}

function withColor(cells: Vec3[], typeId: PieceTypeId): { cell: Vec3; color: ColorId }[] {
  return cells.map((cell) => ({ cell, color: PIECES[typeId].color }));
}

export function derivePuzzle(puzzle: Puzzle): DerivedPuzzle {
  const allCells = puzzle.solution.flatMap((placement) =>
    cellsFor(placement.typeId, placement.rotation, placement.origin),
  );
  const allCellsWithColor = puzzle.solution.flatMap((placement) =>
    withColor(cellsFor(placement.typeId, placement.rotation, placement.origin), placement.typeId),
  );

  const cells: CellSet = new Set(allCells.map(cellKey));
  const views = projectCells(allCells);
  const colorViews = projectColors(allCellsWithColor);
  const viewGrids = toGrids(views, puzzle.board);
  const tray = tallyTray(puzzle.solution);

  return { puzzle, cells, views, colorViews, viewGrids, tray };
}

export function validatePuzzle(puzzle: Puzzle): void {
  const tray = tallyTray(puzzle.solution);
  const placed: Placement[] = [];

  for (const placement of puzzle.solution) {
    const result = canPlace(placed, puzzle.board, tray, placement.typeId, placement.rotation, placement.origin);
    if (!result.ok) {
      throw new Error(
        `Puzzle "${puzzle.id}": placement "${placement.instanceId}" is invalid (${result.reason}).`,
      );
    }
    placed.push(placement);
    tray[placement.typeId] -= 1;
  }
}

// The catalogue (loadPuzzles / getCatalog / fetchCatalog / setCatalog) lives in
// ./catalog.ts — it uses Vite-only syntax, and api/ imports this file for the
// validators below.

const VIEWS: ViewName[] = ["front", "right", "top"];

/** True if any of this placement's cells is the nearest cell at its own key
 *  in at least one view — i.e. it shows its own colour somewhere. */
function isVisible(placement: Placement, derived: DerivedPuzzle): boolean {
  const cells = cellsFor(placement.typeId, placement.rotation, placement.origin);
  const color = PIECES[placement.typeId].color;
  return cells.some((cell) => VIEWS.some((view) => derived.colorViews[view].get(viewKey(view, cell)) === color));
}

/**
 * Puzzle-design fairness, separate from placement legality (`validatePuzzle`
 * above). Skipped entirely for a `monochrome` puzzle — there is no colour to
 * check. See plan §5.
 */
export function validateColourRules(puzzle: Puzzle): void {
  if (puzzle.monochrome) return;

  const derived = derivePuzzle(puzzle);
  const usedColours = new Set(puzzle.solution.map((p) => PIECES[p.typeId].color));

  // Rule 1: colour-blind fairness.
  if (usedColours.size === 2 && usedColours.has("red") && usedColours.has("green")) {
    throw new Error(`Puzzle "${puzzle.id}": red and green are its only two colours — not colour-blind safe.`);
  }

  // Rule 2: solvability by reading — every visible brick shows its own
  // colour in at least one view. True by construction here (isVisible IS
  // that definition), so there is nothing left to assert; the real coverage
  // for projectColors's depth-sort lives in projection.test.ts and
  // check.test.ts. Fully sealed bricks are rule 4's job, not this one.

  // Rule 3: tray honesty — the derived tray is exactly the solution's tally.
  const tally = new Map<PieceTypeId, number>();
  for (const p of puzzle.solution) tally.set(p.typeId, (tally.get(p.typeId) ?? 0) + 1);
  for (const [typeId, count] of tally) {
    if (derived.tray[typeId] !== count) {
      throw new Error(`Puzzle "${puzzle.id}": tray count for "${typeId}" doesn't match its solution tally.`);
    }
  }

  // Rule 4: sealed-colour deducibility. A hidden brick's colour is only fair
  // to grade if every hidden brick shares one colour, so it's deducible by
  // elimination against the visible tray — see plan §3.
  const sealedColours = new Set<ColorId>();
  for (const placement of puzzle.solution) {
    if (!isVisible(placement, derived)) sealedColours.add(PIECES[placement.typeId].color);
  }
  if (sealedColours.size > 1) {
    throw new Error(
      `Puzzle "${puzzle.id}": ${sealedColours.size} different colours are fully sealed inside — not deducible by elimination.`,
    );
  }
}
