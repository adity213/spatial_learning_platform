import type { Puzzle } from "./types";

/** Where the list of puzzles comes from.
 *
 *  Kept apart from puzzle.ts because loadPuzzles() below uses Vite's
 *  import.meta.glob, which only exists after a Vite build — the serverless
 *  functions in api/ import puzzle.ts for its validators and must not drag
 *  browser-build-only syntax into their bundle. */

export function loadPuzzles(): Puzzle[] {
  const puzzleModules = import.meta.glob<Puzzle>("../data/puzzles/*.json", {
    eager: true,
    import: "default",
  });
  return Object.keys(puzzleModules)
    .sort()
    .map((path) => puzzleModules[path]!);
}

let runtimeCatalog: Puzzle[] | null = null;

/** Installed once at boot from /api/puzzles, before the store is imported.
 *  Keeps the catalogue a plain synchronous value for everything downstream. */
export function setCatalog(puzzles: Puzzle[]): void {
  runtimeCatalog = puzzles;
}

/** The live catalogue, falling back to the puzzles bundled at build time if
 *  the network fetch never happened or failed — a child with a flaky
 *  connection still gets a playable game, just without teacher edits. */
export function getCatalog(): Puzzle[] {
  return runtimeCatalog ?? loadPuzzles();
}

export async function fetchCatalog(): Promise<Puzzle[]> {
  const url = import.meta.env.DEV ? `/api/puzzles?t=${Date.now()}` : "/api/puzzles";
  const res = await fetch(url);
  if (!res.ok) throw new Error(`/api/puzzles responded ${res.status}`);
  const data = (await res.json()) as { puzzles: Puzzle[] };
  if (!Array.isArray(data.puzzles) || data.puzzles.length === 0) {
    throw new Error("/api/puzzles returned an empty catalogue");
  }
  return data.puzzles;
}
