import { describe, expect, it } from "vitest";
import { derivePuzzle, validatePuzzle } from "../puzzle";
import { loadPuzzles } from "../catalog";
import type { Puzzle } from "../types";
import fixtureStep01 from "./fixtures/step-01.json";

const step01 = fixtureStep01 as Puzzle;

describe("derivePuzzle", () => {
  it("tallies the tray from the solution, zero-filled for every other variant", () => {
    const derived = derivePuzzle(step01);
    expect(derived.tray["2x2-red"]).toBe(1);
    expect(derived.tray["2x4-yellow"]).toBe(1);
    expect(derived.tray["2x3-blue"]).toBe(0);
    expect(derived.tray["2x2-blue"]).toBe(0);
    expect(Object.keys(derived.tray).length).toBeGreaterThan(30); // every shape × colour variant
  });

  it("expands the solution to its full cell set", () => {
    const derived = derivePuzzle(step01);
    // 2x4 = 8 cells, 2x2 = 4 cells, no overlap.
    expect(derived.cells.size).toBe(12);
  });

  it("colour-projects the solution alongside the silhouette", () => {
    const derived = derivePuzzle(step01);
    expect(derived.colorViews.top.size).toBe(derived.views.top.size);
  });

  it("gridifies view grids at board dimensions", () => {
    const derived = derivePuzzle(step01);
    expect(derived.viewGrids.front).toHaveLength(step01.board.height);
    expect(derived.viewGrids.front[0]).toHaveLength(step01.board.width);
    expect(derived.viewGrids.right).toHaveLength(step01.board.height);
    expect(derived.viewGrids.right[0]).toHaveLength(step01.board.depth);
    expect(derived.viewGrids.top).toHaveLength(step01.board.depth);
    expect(derived.viewGrids.top[0]).toHaveLength(step01.board.width);
  });
});

describe("validatePuzzle", () => {
  it("accepts a puzzle whose solution replays cleanly", () => {
    expect(() => validatePuzzle(step01)).not.toThrow();
  });

  it("rejects a puzzle with an overlapping placement, naming the instanceId", () => {
    const broken: Puzzle = {
      ...step01,
      solution: [
        { instanceId: "a", typeId: "2x2-red", rotation: 0, origin: { x: 0, y: 0, z: 0 } },
        { instanceId: "b", typeId: "2x2-red", rotation: 0, origin: { x: 0, y: 0, z: 0 } },
      ],
    };
    expect(() => validatePuzzle(broken)).toThrow(/"b".*overlap/);
  });

  it("rejects a puzzle with an unsupported placement", () => {
    const broken: Puzzle = {
      ...step01,
      solution: [{ instanceId: "a", typeId: "2x2-red", rotation: 0, origin: { x: 0, y: 1, z: 0 } }],
    };
    expect(() => validatePuzzle(broken)).toThrow(/"a".*unsupported/);
  });
});

describe("loadPuzzles", () => {
  it("loads the tutorial tier first, in filename order (numeric prefix, not id)", () => {
    const ids = loadPuzzles().map((p) => p.id);
    expect(ids.slice(0, 6)).toEqual(["tut-01", "tut-02", "tut-03", "tut-04", "tut-05", "tut-06"]);
  });

  it("every id is unique", () => {
    const ids = loadPuzzles().map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
