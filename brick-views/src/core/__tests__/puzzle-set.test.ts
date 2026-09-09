import { describe, expect, it } from "vitest";
import { derivePuzzle, validateColourRules, validatePuzzle } from "../puzzle";
import { loadPuzzles } from "../catalog";

describe("the puzzle set", () => {
  it("has at least the tutorial six", () => {
    expect(loadPuzzles().length).toBeGreaterThanOrEqual(6);
  });

  it("every puzzle's solution replays cleanly", () => {
    for (const puzzle of loadPuzzles()) {
      expect(() => validatePuzzle(puzzle), puzzle.id).not.toThrow();
    }
  });

  it("every puzzle passes its colour-design fairness rules", () => {
    for (const puzzle of loadPuzzles()) {
      expect(() => validateColourRules(puzzle), puzzle.id).not.toThrow();
    }
  });

  it("every id is unique", () => {
    const ids = loadPuzzles().map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("tut-06: the enclosed brick", () => {
  it("removing the enclosed brick changes no projection but does change the cell set", () => {
    const puzzle = loadPuzzles().find((p) => p.id === "tut-06");
    if (!puzzle) throw new Error("tut-06 fixture is missing");

    const full = derivePuzzle(puzzle);
    const withoutHidden = { ...puzzle, solution: puzzle.solution.filter((p) => p.instanceId !== "q4") };
    const partial = derivePuzzle(withoutHidden);

    expect(partial.cells.size).toBe(full.cells.size - 4);
    expect(partial.viewGrids).toEqual(full.viewGrids);
  });
});
